import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { logInfo, logError } from '../lib/logger';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function recoverCoordinates() {
    try {
        console.log("Starting Coordinate Recovery process...");

        // 1. Exact Address Matching Pass
        console.log("Pass 1: Exact Address Mirroring...");
        const addressPass = await prisma.$executeRaw`
            WITH matches AS (
                SELECT DISTINCT ON (p1.id)
                    p1.id,
                    p2.latitude,
                    p2.longitude,
                    p2.geom
                FROM "PropertySale" p1
                JOIN "PropertySale" p2 ON (p1.address = p2.address AND p1.county = p2.county)
                WHERE p1.latitude IS NULL 
                AND p2.latitude IS NOT NULL
            )
            UPDATE "PropertySale" s
            SET 
                latitude = matches.latitude,
                longitude = matches.longitude,
                geom = matches.geom
            FROM matches
            WHERE s.id = matches.id;
        `;
        console.log(`Updated ${addressPass} records via exact address matching.`);
        logInfo("coordinate_recovery_complete", { method: "address_mirror", count: addressPass });

        // 2. Eircode Mirroring Pass
        console.log("Pass 2: Eircode Mirroring...");
        const eircodePass = await prisma.$executeRaw`
            WITH matches AS (
                SELECT DISTINCT ON (p1.id)
                    p1.id,
                    p2.latitude,
                    p2.longitude,
                    p2.geom
                FROM "PropertySale" p1
                JOIN "PropertySale" p2 ON (p1.eircode = p2.eircode)
                WHERE p1.latitude IS NULL 
                AND p2.latitude IS NOT NULL
                AND p1.eircode IS NOT NULL
            )
            UPDATE "PropertySale" s
            SET 
                latitude = matches.latitude,
                longitude = matches.longitude,
                geom = matches.geom
            FROM matches
            WHERE s.id = matches.id;
        `;
        console.log(`Updated ${eircodePass} records via Eircode mirroring.`);
        logInfo("coordinate_recovery_complete", { method: "eircode_mirror", count: eircodePass });

        // 3. Routing Key Centroid Fallback
        console.log("Pass 3: Routing Key Centroid Fallback (Neighborhood level)...");
        const centroidPass = await prisma.$executeRaw`
            WITH matches AS (
                SELECT 
                    p.id,
                    r.avg_lat,
                    r.avg_lon
                FROM "PropertySale" p
                JOIN "internal_geo_reference" r ON (substring(p.eircode from 1 for 3) = r.routing_key)
                WHERE p.latitude IS NULL 
                AND p.eircode IS NOT NULL
            )
            UPDATE "PropertySale" s
            SET 
                latitude = matches.avg_lat,
                longitude = matches.avg_lon,
                geom = ST_SetSRID(ST_Point(matches.avg_lon, matches.avg_lat), 4326)
            FROM matches
            WHERE s.id = matches.id;
        `;
        console.log(`Updated ${centroidPass} records via Neighborhood Centroid fallback.`);
        logInfo("coordinate_recovery_complete", { method: "centroid_fallback", count: centroidPass });

    } catch (e) {
        logError("coordinate_recovery_failed", { error: String(e) });
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

recoverCoordinates();
