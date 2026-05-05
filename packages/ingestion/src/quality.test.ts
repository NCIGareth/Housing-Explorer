import { describe, expect, it } from "vitest";
import { validateCurrentListings, validateHistoricalMetrics, removeListingDuplicates } from "./lib/quality";

describe("validateCurrentListings", () => {
  it("validates and returns valid listings", () => {
    const input = [
      {
        externalId: "x1",
        source: "APPROVED_FEED",
        title: "3 bed in Galway",
        county: "Galway",
        askingPriceEur: 340000,
        listedAt: new Date().toISOString(),
        url: "https://example.com/l/x1",
      },
    ];

    const result = validateCurrentListings(input);

    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("x1");
  });

  it("throws on invalid listing", () => {
    const input = [{ externalId: "x1" }];

    expect(() => validateCurrentListings(input)).toThrow();
  });

  it("validates multiple listings", () => {
    const now = new Date().toISOString();
    const input = [
      { externalId: "1", source: "A", title: "Listing 1", county: "Dublin", askingPriceEur: 300000, listedAt: now, url: "https://example.com/1" },
      { externalId: "2", source: "B", title: "Listing 2", county: "Cork", askingPriceEur: 250000, listedAt: now, url: "https://example.com/2" },
    ];

    const result = validateCurrentListings(input);

    expect(result).toHaveLength(2);
  });
});

describe("validateHistoricalMetrics", () => {
  it("validates and returns valid metrics", () => {
    const input = [
      {
        source: "CSO",
        geography: "Dublin",
        metric: "RPPI",
        period: "2024-01",
        value: 125.5,
      },
    ];

    const result = validateHistoricalMetrics(input);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(125.5);
  });

  it("throws on invalid metric", () => {
    const input = [{ geography: "Dublin" }];

    expect(() => validateHistoricalMetrics(input)).toThrow();
  });

  it("validates crime metrics", () => {
    const input = [
      { source: "CSO", geography: "Dublin", metric: "crime_burglary", period: "2024", value: 150 },
      { source: "CSO", geography: "Dublin", metric: "crime_assault", period: "2024", value: 95 },
    ];

    const result = validateHistoricalMetrics(input);

    expect(result).toHaveLength(2);
  });
});

describe("removeListingDuplicates", () => {
  it("removes duplicates by source and externalId", () => {
    const deduped = removeListingDuplicates([
      { source: "A", externalId: "1" },
      { source: "A", externalId: "1" },
      { source: "A", externalId: "2" },
    ]);

    expect(deduped).toHaveLength(2);
  });

  it("keeps unique listings", () => {
    const input = [
      { source: "A", externalId: "1" },
      { source: "B", externalId: "1" },
      { source: "A", externalId: "2" },
    ];

    const deduped = removeListingDuplicates(input);

    expect(deduped).toHaveLength(3);
  });

  it("handles empty array", () => {
    const deduped = removeListingDuplicates([]);

    expect(deduped).toHaveLength(0);
  });

  it("preserves first occurrence of duplicate", () => {
    const input = [
      { source: "A", externalId: "1", extra: "first" },
      { source: "A", externalId: "1", extra: "second" },
    ];

    const deduped = removeListingDuplicates(input);

    expect(deduped[0].extra).toBe("first");
  });

  it("handles single item", () => {
    const input = [{ source: "A", externalId: "1" }];

    const deduped = removeListingDuplicates(input);

    expect(deduped).toHaveLength(1);
  });

  it("handles large duplicate sets", () => {
    const input = Array(100).fill(null).map((_, i) => ({
      source: i % 3 === 0 ? "A" : "B",
      externalId: i < 50 ? "1" : "2",
    }));

    const deduped = removeListingDuplicates(input);

    expect(deduped).toHaveLength(4);
  });

  it("preserves all properties of first occurrence", () => {
    const input = [
      { source: "A", externalId: "1", title: "First", price: 100 },
      { source: "A", externalId: "1", title: "Second", price: 200 },
    ];

    const deduped = removeListingDuplicates(input);

    expect(deduped[0].title).toBe("First");
    expect(deduped[0].price).toBe(100);
  });

  it("handles different sources with same externalId", () => {
    const input = [
      { source: "A", externalId: "1" },
      { source: "B", externalId: "1" },
    ];

    const deduped = removeListingDuplicates(input);

    expect(deduped).toHaveLength(2);
  });
});
