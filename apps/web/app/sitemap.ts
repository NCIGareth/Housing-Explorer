import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://irelandhousingexplorer.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  let salePages: MetadataRoute.Sitemap = [];
  try {
    const { prisma } = await import("@/lib/db");
    const sales = await prisma.propertySale.findMany({
      orderBy: { saleDate: "desc" },
      take: 1000,
      select: { id: true, saleDate: true },
    });
    salePages = sales.map((sale) => ({
      url: `${baseUrl}/sales/${sale.id}`,
      lastModified: sale.saleDate,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // Database may be unavailable during build
  }

  return [...staticPages, ...salePages];
}
