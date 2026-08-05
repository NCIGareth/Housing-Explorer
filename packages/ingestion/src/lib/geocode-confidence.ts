import type { PrismaClient } from "@housing/db";

export type CoordinateConfidenceResult = {
  confidence: number | null;
  errorMeters: number | null;
};

export const EXACT_ERROR_METERS = 50;

const VAGUE_ADDRESS_RE =
  /^\s*(site(?:\s+at)?|lands?|part(?:s)?\s+of|portion\s+of|plot(?:s)?\s+(?:at|comprising)?|area(?:s)?|parcel|campus|block(?:s)?|development)\b/i;

export function isVagueAddress(address: string): boolean {
  return VAGUE_ADDRESS_RE.test(address);
}

export function scoreFromErrorMeters(errorMeters: number): number {
  if (errorMeters < 100) return 85;
  if (errorMeters < 300) return 80;
  if (errorMeters < 800) return 72;
  if (errorMeters < 1500) return 65;
  if (errorMeters < 3000) return 58;
  if (errorMeters < 6000) return 50;
  if (errorMeters < 12000) return 42;
  return 35;
}

export type CoordinateConfidenceInput = {
  latitude: number | null;
  longitude: number | null;
  estimatedLatitude: number | null;
  estimatedLongitude: number | null;
  estimatedEircode: string | null;
  address: string;
  errorByRoutingKey?: Map<string, number>;
  defaultErrorMeters?: number;
};

export function computeCoordinateConfidence(input: CoordinateConfidenceInput): CoordinateConfidenceResult {
  const { latitude, longitude, estimatedLatitude, estimatedLongitude, estimatedEircode, address } = input;

  if (latitude != null && longitude != null) {
    if (isVagueAddress(address)) {
      return { confidence: 85, errorMeters: 200 };
    }
    return { confidence: 100, errorMeters: EXACT_ERROR_METERS };
  }

  if (estimatedLatitude != null && estimatedLongitude != null) {
    const measured = estimatedEircode ? input.errorByRoutingKey?.get(estimatedEircode) : undefined;
    const errorMeters = measured ?? input.defaultErrorMeters ?? 5000;
    return { confidence: scoreFromErrorMeters(errorMeters), errorMeters };
  }

  return { confidence: null, errorMeters: null };
}

async function loadErrorByRoutingKey(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ key: string; mean_m: number }>>`
    SELECT "estimatedEircode" AS key,
           AVG(ST_DistanceSphere(
             ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
             ST_SetSRID(ST_MakePoint("estimatedLongitude", "estimatedLatitude"), 4326)
           ))::float AS mean_m
    FROM "PropertySale"
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND "estimatedLatitude" IS NOT NULL AND "estimatedLongitude" IS NOT NULL
      AND "estimatedEircode" IS NOT NULL
    GROUP BY "estimatedEircode"
  `;
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.key) map.set(row.key, Math.round(row.mean_m));
  }
  return map;
}

let errorByRoutingKeyPromise: Promise<Map<string, number>> | null = null;

export function getErrorByRoutingKey(prisma: PrismaClient): Promise<Map<string, number>> {
  if (!errorByRoutingKeyPromise) {
    errorByRoutingKeyPromise = loadErrorByRoutingKey(prisma);
  }
  return errorByRoutingKeyPromise;
}
