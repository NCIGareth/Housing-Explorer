import { currentListingSchema, historicalMetricSchema } from "@housing/shared";

export function validateCurrentListings(input: unknown[]) {
  return input.map((row) => currentListingSchema.parse(row));
}

export function validateHistoricalMetrics(input: unknown[]) {
  return input.map((row) => historicalMetricSchema.parse(row));
}

export function removeListingDuplicates<T extends { source: string; externalId: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.source}:${row.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
