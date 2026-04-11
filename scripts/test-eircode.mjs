import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.propertySale.findMany({ 
    where: { eircode: 'K67 X0E7' }, 
    select: { address: true, saleDate: true, priceEur: true }
  }); 
  console.log(sales); 
} 
main().finally(() => prisma.$disconnect());
