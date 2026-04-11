import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function testFuzzyMatch() {
    try {
        console.log("Testing fuzzy match performance and accuracy...");

        // Create GIN index for testing (temporarily)
        console.log("Creating GIN index on address (this may take a minute)...");
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PropertySale_address_trgm_idx" ON "PropertySale" USING GIN (address gin_trgm_ops);`);

        // Test matching for a specific locality (Dalkey) where we might have variations
        console.log("Running sample fuzzy join for 'Dalkey'...");
        const results = await prisma.$queryRaw<any[]>`
            SELECT 
                p1.address as missing_addr, 
                p2.address as found_addr, 
                similarity(p1.address, p2.address) as score
            FROM "PropertySale" p1
            CROSS JOIN LATERAL (
                SELECT address, latitude, longitude
                FROM "PropertySale"
                WHERE latitude IS NOT NULL 
                AND county = p1.county
                ORDER BY p1.address <-> address
                LIMIT 1
            ) p2
            WHERE p1.latitude IS NULL 
            AND p1.address ILIKE '%Dalkey%'
            AND similarity(p1.address, p2.address) > 0.6
            LIMIT 10
        `;
        
        console.log("Sample matches:", JSON.stringify(results, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testFuzzyMatch();
