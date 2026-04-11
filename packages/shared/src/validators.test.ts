import { describe, expect, it } from "vitest";
import { currentListingSchema } from "./validators";

describe("currentListingSchema", () => {
  it("accepts a valid listing payload", () => {
    const value = currentListingSchema.parse({
      externalId: "x1",
      source: "APPROVED_FEED",
      title: "3 bed in Galway",
      county: "Galway",
      askingPriceEur: 340000,
      listedAt: new Date().toISOString(),
      url: "https://example.com/l/x1"
    });

    expect(value.externalId).toBe("x1");
  });
});
