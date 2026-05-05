import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Prisma Client", () => {
  it("can be instantiated", () => {
    const prisma = new PrismaClient();
    expect(prisma).toBeDefined();
    expect(prisma).toHaveProperty("$connect");
    expect(prisma).toHaveProperty("$disconnect");
  });

  it("has expected models", () => {
    const prisma = new PrismaClient();
    expect(prisma).toHaveProperty("user");
    expect(prisma).toHaveProperty("propertySale");
    expect(prisma).toHaveProperty("listingCurrent");
    expect(prisma).toHaveProperty("historicalMetric");
    expect(prisma).toHaveProperty("savedSearch");
    expect(prisma).toHaveProperty("alert");
    expect(prisma).toHaveProperty("ingestionRun");
  });
});
