import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { logInfo, logError } from '../lib/logger';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function populateEircodes() {
    try {
        console.log("Starting Eircode population via spatial matching...");

        // 1. Identify rows to fix
        const totalToFixRes = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) FROM "PropertySale" WHERE geom IS NOT NULL AND eircode IS NULL
        `;
        const totalToFix = Number(totalToFixRes[0].count);
        console.log(`Identified ${totalToFix} candidate records with coordinates but no Eircode.`);

        if (totalToFix === 0) {
            console.log("Nothing to fix. Current coverage is optimal.");
            return;
        }

        // 2. Execute spatial join and update
        // We use ST_Distance and a LIMIT 1 for each row.
        // PostGIS 2.0+ support <-> operator for 2D distance index-based nearest neighbor search.
        
        console.log("Running spatial matching batch (Max distance: 15m)...");
        
        // This query updates the PropertySale table by joining with the VerifiedEircodeMap
        // We use a LATERAL join to find the single closest Eircode for each row efficiently.
        const updateCount = await prisma.$executeRaw`
            WITH matches AS (
                SELECT 
                    p.id,
                    m.eircode as inferred_eircode,
                    ST_Distance(p.geom::geography, m.geom::geography) as distance
                FROM "PropertySale" p
                CROSS JOIN LATERAL (
                    SELECT eircode, geom
                    FROM "VerifiedEircodeMap"
                    ORDER BY p.geom <-> geom
                    LIMIT 1
                ) m
                WHERE p.eircode IS NULL AND p.geom IS NOT NULL
                AND ST_DWithin(p.geom::geography, m.geom::geography, 15)
            )
            UPDATE "PropertySale" s
            SET eircode = matches.inferred_eircode
            FROM matches
            WHERE s.id = matches.id;
        `;

        console.log(`Successfully populated ${updateCount} Eircodes via spatial matching.`);
        logInfo("eircode_population_complete", { method: "spatial", updateCount });

        // 3. Fallback: Address Matching
        // If the address is an EXACT match to another property that has an Eircode
        console.log("Running address-based matching...");
        const addressMatchCount = await prisma.$executeRaw`
            WITH matches AS (
                SELECT DISTINCT ON (p.address, p.county)
                    p.id,
                    ref.eircode as inferred_eircode
                FROM "PropertySale" p
                JOIN "PropertySale" ref ON (p.address = ref.address AND p.county = ref.county)
                WHERE p.eircode IS NULL
                AND ref.eircode IS NOT NULL
            )
            UPDATE "PropertySale" s
            SET eircode = matches.inferred_eircode
            FROM matches
            WHERE s.id = matches.id;
        `;
        console.log(`Successfully populated ${addressMatchCount} Eircodes via exact address match.`);
        logInfo("eircode_population_complete", { method: "address", addressMatchCount });

    } catch (e) {
        logError("eircode_population_failed", { error: String(e) });
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

populateEircodes();
