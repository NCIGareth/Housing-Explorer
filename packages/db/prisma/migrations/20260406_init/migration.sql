-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEW_LISTING_MATCH', 'PRICE_DROP');
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricalMetric" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "geography" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HistoricalMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingCurrent" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "county" TEXT NOT NULL,
  "locality" TEXT,
  "askingPriceEur" INTEGER NOT NULL,
  "beds" INTEGER,
  "baths" INTEGER,
  "propertyType" TEXT,
  "listedAt" TIMESTAMP(3) NOT NULL,
  "listingUrl" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListingCurrent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedSearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "county" TEXT,
  "minPriceEur" INTEGER,
  "maxPriceEur" INTEGER,
  "minBeds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "savedSearchId" TEXT,
  "type" "AlertType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastTriggeredAt" TIMESTAMP(3),
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionRun" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" "RunStatus" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "rowsRead" INTEGER NOT NULL DEFAULT 0,
  "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ListingCurrent_source_externalId_key" ON "ListingCurrent"("source", "externalId");
CREATE INDEX "HistoricalMetric_metric_geography_period_idx" ON "HistoricalMetric"("metric", "geography", "period");
CREATE INDEX "ListingCurrent_county_askingPriceEur_isActive_idx" ON "ListingCurrent"("county", "askingPriceEur", "isActive");

ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS postgis;
