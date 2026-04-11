import { prisma, Prisma } from "@housing/db";

async function analyzeFilters() {
  console.log("Analyzing database for filter optimization...\n");

  try {
    // Check current listings
    const totalListings = await prisma.listingCurrent.count({
      where: { isActive: true },
    });
    const totalSales = await prisma.propertySale.count();

    console.log(`📊 TOTAL STATISTICS:`);
    console.log(`  Active listings: ${totalListings}`);
    console.log(`  Historical sales: ${totalSales}\n`);

    // If we have listings, analyze them
    if (totalListings > 0) {
      // Get counts by county
      const countyStats = await prisma.listingCurrent.groupBy({
        by: ["county"],
        _count: { id: true },
        _min: { askingPriceEur: true },
        _max: { askingPriceEur: true },
        _avg: { askingPriceEur: true },
        where: { isActive: true },
        orderBy: { _count: { id: "desc" } },
      });

      console.log("📍 COUNTIES BY LISTING COUNT:");
      countyStats.forEach((stat) => {
        console.log(
          `  ${stat.county}: ${stat._count.id} listings | Price range: €${stat._min?.askingPriceEur?.toLocaleString()} - €${stat._max?.askingPriceEur?.toLocaleString()} (avg: €${Math.round(stat._avg?.askingPriceEur ?? 0).toLocaleString()})`
        );
      });

      // Get property type distribution
      const propertyTypes = await prisma.listingCurrent.groupBy({
        by: ["propertyType"],
        _count: { id: true },
        where: { isActive: true },
        orderBy: { _count: { id: "desc" } },
      });

      console.log("\n🏠 PROPERTY TYPES (Current Listings):");
      propertyTypes.forEach((pt) => {
        console.log(
          `  ${pt.propertyType || "Unknown"}: ${pt._count.id} listings`
        );
      });

      // Get bedroom distribution
      const bedStats = await prisma.listingCurrent.groupBy({
        by: ["beds"],
        _count: { id: true },
        _min: { askingPriceEur: true },
        _max: { askingPriceEur: true },
        where: { isActive: true, beds: { not: null } },
        orderBy: { beds: "asc" },
      });

      console.log("\n🛏️  BEDROOMS (Current Listings):");
      bedStats.forEach((bed) => {
        if (bed.beds) {
          console.log(
            `  ${bed.beds} bed${bed.beds > 1 ? "s" : ""}: ${bed._count.id} listings | Price range: €${bed._min?.askingPriceEur?.toLocaleString()} - €${bed._max?.askingPriceEur?.toLocaleString()}`
          );
        }
      });
    } else {
      console.log(
        "📌 No active listings. Analyzing historical sales data instead...\n"
      );
    }

    // Analyze historical sales data
    if (totalSales > 0) {
      // County distribution for sales
      const salesByCounty = await prisma.propertySale.groupBy({
        by: ["county"],
        _count: { id: true },
        _min: { priceEur: true },
        _max: { priceEur: true },
        _avg: { priceEur: true },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      });

      console.log("📍 COUNTIES BY SALES VOLUME (Historical):");
      salesByCounty.forEach((stat) => {
        console.log(
          `  ${stat.county}: ${stat._count.id} sales | Price range: €${stat._min?.priceEur?.toLocaleString()} - €${stat._max?.priceEur?.toLocaleString()} (avg: €${Math.round(stat._avg?.priceEur ?? 0).toLocaleString()})`
        );
      });

      // Price distribution for sales
      const priceRanges = [
        { min: 0, max: 150000 },
        { min: 150000, max: 300000 },
        { min: 300000, max: 500000 },
        { min: 500000, max: 750000 },
        { min: 750000, max: 1000000 },
        { min: 1000000, max: null },
      ];

      console.log("\n💶 PRICE DISTRIBUTION (Historical Sales):");
      for (const range of priceRanges) {
        const where: Prisma.PropertySaleWhereInput = {
          priceEur: {
            gte: range.min,
            ...(range.max !== null ? { lte: range.max } : {}),
          },
        };
        const count = await prisma.propertySale.count({ where });
        const rangeLabel =
          range.max === null
            ? `€${range.min.toLocaleString()}+`
            : `€${range.min.toLocaleString()} - €${range.max.toLocaleString()}`;
        console.log(`  ${rangeLabel}: ${count} sales`);
      }

      // Top localities
      const topLocalities = await prisma.propertySale.groupBy({
        by: ["address"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      });

      console.log("\n🗺️  TOP 15 LOCALITIES (Historical Sales):");
      topLocalities.forEach((loc) => {
        console.log(`  ${loc.address}: ${loc._count.id} sales`);
      });

      // Sales over time (recent years)
      const recentSalesCount = await prisma.propertySale.count({
        where: {
          saleDate: {
            gte: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // Last 2 years
          },
        },
      });

      console.log(`\n📅 RECENT SALES (Last 2 years): ${recentSalesCount} sales`);

      // Property descriptions (to infer types)
      const descriptions = await prisma.propertySale.groupBy({
        by: ["descriptionOfProperty"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      console.log("\n📝 TOP PROPERTY TYPES (Historical Sales):");
      descriptions.forEach((desc) => {
        console.log(`  ${desc.descriptionOfProperty}: ${desc._count.id} sales`);
      });
    }

    // Suggest filter improvements
    console.log("\n\n💡 FILTER RECOMMENDATIONS FOR YOUR DATA:");
    if (totalListings === 0) {
      console.log("⚠️  No active listings found - primarily using historical sales data\n");
    }
    console.log("1. ✅ ADD PROPERTY TYPE/DESCRIPTION FILTER");
    console.log(
      "   - Users can filter by 'Apartment', 'House', 'Detached', etc."
    );
    console.log(
      "   - Extract from property descriptions or add as separate field\n"
    );
    console.log("2. 📍 ADD LOCALITY/ADDRESS AUTOCOMPLETE FILTER");
    console.log(
      "   - Provide dropdown of top 20-30 most transacted addresses\n"
    );
    console.log("3. 📊 ADD PRICE RANGE PRESETS");
    console.log(
      "   - Quick filters: <€300k, €300-500k, €500k-1M, €1M+ etc.\n"
    );
    console.log("4. 📅 ADD DATE RANGE FILTER");
    console.log(
      "   - Filter by sale date (or listing date for current listings)\n"
    );
    console.log("5. 🏷️  ADD PRICE PER SQM FILTER");
    console.log(
      "   - Calculate from property size description for price-per-meter comparisons\n"
    );
    console.log("6. 🔍 ADD FULL/PARTIAL MARKET PRICE FILTER");
    console.log(
      "   - Toggle to show/hide non-full market price transactions\n"
    );
    console.log("7. 💰 ADD VAT STATUS FILTER");
    console.log(
      "   - Show VAT inclusive or exclusive transactions\n"
    );
  } catch (error) {
    console.error("Error analyzing database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeFilters();
