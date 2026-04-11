import { prisma } from '@housing/db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function checkEircodeFormats() {
    try {
        console.log("Checking Eircode formats...");

        const samples = await prisma.$queryRaw<any[]>`
            SELECT eircode, COUNT(*) as count
            FROM "PropertySale"
            WHERE eircode IS NOT NULL 
            AND (length(eircode) != 8 OR eircode ~ '[a-z]')
            GROUP BY eircode
            LIMIT 10
        `;
        console.log("Malformed samples in PropertySale:", samples);

        const counts = await prisma.$queryRaw<any[]>`
            SELECT 
                COUNT(*) FILTER (WHERE length(eircode) = 7) as "length_7 (no space)",
                COUNT(*) FILTER (WHERE length(eircode) = 8) as "length_8 (has space)",
                COUNT(*) FILTER (WHERE eircode ~ '[a-z]') as "has_lowercase"
            FROM "PropertySale"
            WHERE eircode IS NOT NULL
        `;
        console.log("Format statistics:", counts[0]);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkEircodeFormats();
