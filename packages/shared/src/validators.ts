import { z } from "zod";

export const currentListingSchema = z.object({
  externalId: z.string().min(1),
  source: z.string().min(1),
  title: z.string().min(1),
  county: z.string().min(1),
  locality: z.string().optional(),
  eircode: z.string().optional(),
  askingPriceEur: z.number().int().positive(),
  beds: z.number().int().positive().optional(),
  baths: z.number().int().positive().optional(),
  propertyType: z.string().optional(),
  listedAt: z.string().datetime(),
  url: z.string().url(),
  geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180)
    })
    .optional()
});

export const historicalMetricSchema = z.object({
  source: z.string().min(1),
  metric: z.string().min(1),
  geography: z.string().min(1),
  period: z.string().min(1),
  value: z.number(),
  unit: z.string().default("index")
});

export const propertySaleSchema = z.object({
  sourceKey: z.string().min(1),
  saleDate: z.date(),
  address: z.string().min(1),
  county: z.string().min(1),
  eircode: z.string().optional(),
  priceEur: z.number().int().positive(),
  notFullMarketPrice: z.boolean(),
  vatExclusive: z.boolean(),
  descriptionOfProperty: z.string().min(1),
  propertySizeDescription: z.string().optional(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable()
});
