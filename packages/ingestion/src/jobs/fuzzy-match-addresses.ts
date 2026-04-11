import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { logInfo, logError } from '../lib/logger';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function fuzzyMatchAddresses() {
    try {
        console.log("Starting 'House Number Anchored' fuzzy matching...");

        // 1. Stage 1: High-Confidence Anchored Match
        // We match addresses in the same county where the house number (leading digits) matches EXACTLY
        // and the street name is highly similar (score > 0.85).
        console.log("Pass 1: High-confidence anchored matches...");
        const anchoredUpdates = await prisma.$executeRaw`
            WITH matches AS (
                SELECT DISTINCT ON (p1.id)
                    p1.id,
                    p2.latitude,
                    p2.longitude,
                    p2.geom,
                    p1.address as orig_address,
                    p2.address as matched_address
                FROM "PropertySale" p1
                CROSS JOIN LATERAL (
                    SELECT address, latitude, longitude, geom
                    FROM "PropertySale"
                    WHERE latitude IS NOT NULL 
                    AND county = p1.county
                    -- Only consider records where the leading digits (house numbers) match exactly
                    AND (
                        (substring(p1.address from '^\\d+') = substring(address from '^\\d+'))
                        OR
                        (substring(p1.address from '^\\d+') IS NULL AND substring(address from '^\\d+') IS NULL)
                    )
                    ORDER BY p1.address <-> address
                    LIMIT 1
                ) p2
                WHERE p1.latitude IS NULL 
                AND (p1.address <-> p2.address) < 0.15 -- Strict similarity (0.85+ score)
            )
            UPDATE "PropertySale" s
            SET 
                latitude = matches.latitude,
                longitude = matches.longitude,
                geom = matches.geom
            FROM matches
            WHERE s.id = matches.id;
        `;
        
        console.log(`Updated ${anchoredUpdates} records via high-confidence fuzzy matching.`);
        logInfo("fuzzy_match_complete", { method: "anchored_fuzzy", count: anchoredUpdates });

        // 2. Stage 2: Street-Level Centroid Fallback
        // For remaining records, if we match the street with 0.8+ similarity but the house number differs,
        // we fallback to the "Average" point of that street.
        console.log("Pass 2: Street-level centroid fallback...");
        const streetUpdates = await prisma.$executeRaw`
             WITH street_anchors AS (
                SELECT 
                    address, 
                    county,
                    latitude,
                    longitude
                FROM "PropertySale"
                WHERE latitude IS NOT NULL
            ),
            matches AS (
                SELECT DISTINCT ON (p1.id)
                    p1.id,
                    AVG(p2.latitude) OVER (PARTITION BY p2.address) as avg_lat,
                    AVG(p2.longitude) OVER (PARTITION BY p2.address) as avg_lon
                FROM "PropertySale" p1
                CROSS JOIN LATERAL (
                    SELECT address, latitude, longitude
                    FROM street_anchors
                    WHERE county = p1.county
                    ORDER BY p1.address <-> address
                    LIMIT 5
                ) p2
                WHERE p1.latitude IS NULL 
                AND (p1.address <-> p2.address) < 0.25 -- Moderate similarity for street name
            )
            UPDATE "PropertySale" s
            SET 
                latitude = matches.avg_lat,
                longitude = matches.avg_lon,
                geom = ST_SetSRID(ST_Point(matches.avg_lon, matches.avg_lat), 4326)
            FROM matches
            WHERE s.id = matches.id;
        `;
        console.log(`Updated ${streetUpdates} records via street-level fallback.`);
        logInfo("fuzzy_match_complete", { method: "street_centroid", count: streetUpdates });

    } catch (e) {
        logError("fuzzy_match_failed", { error: String(e) });
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fuzzyMatchAddresses();
