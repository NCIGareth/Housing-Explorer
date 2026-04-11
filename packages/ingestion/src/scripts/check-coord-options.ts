import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function checkCoordOptions() {
    try {
        console.log("Analyzing missing coordinate options...");

        // 1. Total missing
        const stats = await prisma.$queryRaw<any[]>`
            SELECT 
                COUNT(*)::text as total_missing,
                COUNT(CASE WHEN eircode IS NOT NULL THEN 1 END)::text as with_eircode,
                COUNT(CASE WHEN eircode IS NULL THEN 1 END)::text as without_eircode
            FROM "PropertySale"
            WHERE latitude IS NULL
        `;
        console.log("Missing Stats:", stats[0]);

        // 2. Exact address matching potential
        const addressMatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(DISTINCT p1.id)::text as match_count
            FROM "PropertySale" p1
            JOIN "PropertySale" p2 ON (p1.address = p2.address AND p1.county = p2.county)
            WHERE p1.latitude IS NULL 
            AND p2.latitude IS NOT NULL
        `;
        console.log("Potential fix via exact address match:", addressMatch[0].match_count);

        // 3. Eircode reuse potential
        const eircodeMatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(DISTINCT p1.id)::text as match_count
            FROM "PropertySale" p1
            JOIN "PropertySale" p2 ON (p1.eircode = p2.eircode)
            WHERE p1.latitude IS NULL 
            AND p2.latitude IS NOT NULL
            AND p1.eircode IS NOT NULL
        `;
        console.log("Potential fix via Eircode coordinate reuse:", eircodeMatch[0].match_count);

        // 4. Routing key centroids (can fix everything with an Eircode)
        const routingKeyPotential = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*)::text as match_count
            FROM "PropertySale"
            WHERE latitude IS NULL AND eircode IS NOT NULL
        `;
        console.log("Potential fix via Routing Key Centroid (Neighborhood level):", routingKeyPotential[0].match_count);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCoordOptions();
