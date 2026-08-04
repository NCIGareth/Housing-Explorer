-- Create the VerifiedEircodeMap table (never captured in a migration; only added via db push)
CREATE TABLE IF NOT EXISTS "VerifiedEircodeMap" (
    "eircode" TEXT NOT NULL,
    CONSTRAINT "VerifiedEircodeMap_pkey" PRIMARY KEY ("eircode")
);
