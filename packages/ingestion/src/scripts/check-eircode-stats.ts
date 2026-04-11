import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function runStats() {
    try {
        const stats = await prisma.$queryRaw<any[]>`
            SELECT 
                COUNT(*)::text as total,
                COUNT(eircode)::text as with_eircode,
                COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::text as with_coords,
                COUNT(CASE WHEN (latitude IS NOT NULL) AND (eircode IS NULL) THEN 1 END)::text as coords_but_no_eircode
            FROM "PropertySale"
        `;
        console.log("Database Stats:", stats[0]);

        const refPoints = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*)::text as live_ref_points FROM "ListingCurrent" WHERE eircode IS NOT NULL AND latitude IS NOT NULL
        `;
        console.log("Reference points from Live Listings:", refPoints[0]);

        // TEST: Can we find a close match?
        // Let's find a property sale WITH coords but NO eircode
        const testCase = await prisma.$queryRaw<any[]>`
            SELECT id, address, latitude, longitude 
            FROM "PropertySale" 
            WHERE latitude IS NOT NULL AND eircode IS NULL 
            LIMIT 1
        `;

        if (testCase.length > 0) {
            const { latitude, longitude } = testCase[0];
            console.log(`Test Subject: ${testCase[0].address} at ${latitude}, ${longitude}`);
            
            // Find closest Eircode in ListingCurrent
            const closest = await prisma.$queryRaw<any[]>`
                SELECT eircode, 
                    ( 6371 * acos( cos( radians(${latitude}) ) * cos( radians( latitude ) ) 
                    * cos( radians( longitude ) - radians(${longitude}) ) + sin( radians(${latitude}) ) 
                    * sin( radians( latitude ) ) ) ) AS distance
                FROM "ListingCurrent"
                WHERE eircode IS NOT NULL AND latitude IS NOT NULL
                ORDER BY distance ASC
                LIMIT 1
            `;
            console.log("Closest Eircode:", closest[0]);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

runStats();
