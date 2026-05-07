-- Create FavouriteProperty model for user-saved properties
CREATE TABLE "FavouriteProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavouriteProperty_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on (userId, propertyId)
CREATE UNIQUE INDEX "FavouriteProperty_userId_propertyId_key" ON "FavouriteProperty"("userId", "propertyId");

-- Add foreign keys
ALTER TABLE "FavouriteProperty" ADD CONSTRAINT "FavouriteProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavouriteProperty" ADD CONSTRAINT "FavouriteProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PropertySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for querying by user
CREATE INDEX "FavouriteProperty_userId_idx" ON "FavouriteProperty"("userId");
