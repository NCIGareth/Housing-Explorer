import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function checkGeoRef() {
    try {
        const count = await prisma.$queryRaw<any[]>`SELECT COUNT(*) FROM "internal_geo_reference"`;
        console.log("Internal Geo Reference Count:", count[0]);

        const samples = await prisma.$queryRaw<any[]>`SELECT * FROM "internal_geo_reference" LIMIT 5`;
        console.log("Samples:", samples);

        // Check if there are any Eircodes in PropertySale missing coords that could match a routing key
        const potential = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) 
            FROM "PropertySale" 
            WHERE latitude IS NULL AND eircode IS NOT NULL
        `;
        console.log("PropertySales with Eircode but no Coord:", potential[0]);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkGeoRef();
