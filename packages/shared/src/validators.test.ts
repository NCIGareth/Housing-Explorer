import { describe, expect, it } from "vitest";
import { currentListingSchema, historicalMetricSchema, propertySaleSchema } from "./validators";

describe("currentListingSchema", () => {
  it("accepts a valid listing payload", () => {
    const value = currentListingSchema.parse({
      externalId: "x1",
      source: "APPROVED_FEED",
      title: "3 bed in Galway",
      county: "Galway",
      askingPriceEur: 340000,
      listedAt: new Date().toISOString(),
      url: "https://example.com/l/x1",
    });

    expect(value.externalId).toBe("x1");
  });

  it("rejects missing required fields", () => {
    expect(() => currentListingSchema.parse({})).toThrow();
    expect(() => currentListingSchema.parse({ externalId: "x1" })).toThrow();
  });

  it("rejects empty externalId", () => {
    expect(() =>
      currentListingSchema.parse({
        externalId: "",
        source: "A",
        title: "T",
        county: "C",
        askingPriceEur: 100,
        listedAt: new Date().toISOString(),
        url: "https://example.com",
      })
    ).toThrow();
  });

  it("rejects negative askingPriceEur", () => {
    expect(() =>
      currentListingSchema.parse({
        externalId: "x1",
        source: "A",
        title: "T",
        county: "C",
        askingPriceEur: -100,
        listedAt: new Date().toISOString(),
        url: "https://example.com",
      })
    ).toThrow();
  });

  it("rejects non-integer askingPriceEur", () => {
    expect(() =>
      currentListingSchema.parse({
        externalId: "x1",
        source: "A",
        title: "T",
        county: "C",
        askingPriceEur: 340000.5,
        listedAt: new Date().toISOString(),
        url: "https://example.com",
      })
    ).toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() =>
      currentListingSchema.parse({
        externalId: "x1",
        source: "A",
        title: "T",
        county: "C",
        askingPriceEur: 100,
        listedAt: new Date().toISOString(),
        url: "not-a-url",
      })
    ).toThrow();
  });

  it("accepts optional fields", () => {
    const result = currentListingSchema.parse({
      externalId: "x1",
      source: "A",
      title: "T",
      county: "C",
      askingPriceEur: 100,
      listedAt: new Date().toISOString(),
      url: "https://example.com",
      locality: "City Centre",
      eircode: "D02 X285",
      beds: 3,
      baths: 2,
      propertyType: "Apartment",
      geo: { lat: 53.34, lon: -6.26 },
    });

    expect(result.locality).toBe("City Centre");
    expect(result.eircode).toBe("D02 X285");
    expect(result.beds).toBe(3);
    expect(result.geo?.lat).toBe(53.34);
  });

  it("validates geo coordinates range", () => {
    expect(() =>
      currentListingSchema.parse({
        externalId: "x1",
        source: "A",
        title: "T",
        county: "C",
        askingPriceEur: 100,
        listedAt: new Date().toISOString(),
        url: "https://example.com",
        geo: { lat: 100, lon: 0 },
      })
    ).toThrow();

    expect(() =>
      currentListingSchema.parse({
        externalId: "x1",
        source: "A",
        title: "T",
        county: "C",
        askingPriceEur: 100,
        listedAt: new Date().toISOString(),
        url: "https://example.com",
        geo: { lat: 0, lon: -200 },
      })
    ).toThrow();
  });
});

describe("historicalMetricSchema", () => {
  it("accepts valid metric", () => {
    const result = historicalMetricSchema.parse({
      source: "CSO",
      metric: "RPPI",
      geography: "National",
      period: "2024-01",
      value: 125.5,
    });

    expect(result.unit).toBe("index");
  });

  it("rejects missing required fields", () => {
    expect(() => historicalMetricSchema.parse({})).toThrow();
  });

  it("accepts custom unit", () => {
    const result = historicalMetricSchema.parse({
      source: "CSO",
      metric: "crime_burglary",
      geography: "Dublin",
      period: "2024",
      value: 150,
      unit: "count",
    });

    expect(result.unit).toBe("count");
  });

  it("accepts decimal values", () => {
    const result = historicalMetricSchema.parse({
      source: "CSO",
      metric: "RPPI",
      geography: "Dublin",
      period: "2024-01",
      value: 125.56,
    });

    expect(result.value).toBe(125.56);
  });
});

describe("propertySaleSchema", () => {
  it("accepts valid property sale", () => {
    const result = propertySaleSchema.parse({
      sourceKey: "PPR",
      saleDate: new Date("2024-01-15"),
      address: "123 Main St",
      county: "Dublin",
      priceEur: 350000,
      notFullMarketPrice: false,
      vatExclusive: false,
      descriptionOfProperty: "3 bed house",
      latitude: 53.34,
      longitude: -6.26,
    });

    expect(result.sourceKey).toBe("PPR");
    expect(result.priceEur).toBe(350000);
  });

  it("rejects negative price", () => {
    expect(() =>
      propertySaleSchema.parse({
        sourceKey: "PPR",
        saleDate: new Date(),
        address: "123 Main St",
        county: "Dublin",
        priceEur: -100,
        notFullMarketPrice: false,
        vatExclusive: false,
        descriptionOfProperty: "House",
        latitude: 0,
        longitude: 0,
      })
    ).toThrow();
  });

  it("accepts null coordinates", () => {
    const result = propertySaleSchema.parse({
      sourceKey: "PPR",
      saleDate: new Date(),
      address: "123 Main St",
      county: "Dublin",
      priceEur: 350000,
      notFullMarketPrice: false,
      vatExclusive: false,
      descriptionOfProperty: "House",
      latitude: null,
      longitude: null,
    });

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it("accepts optional eircode fields", () => {
    const result = propertySaleSchema.parse({
      sourceKey: "PPR",
      saleDate: new Date(),
      address: "123 Main St",
      county: "Dublin",
      priceEur: 350000,
      notFullMarketPrice: false,
      vatExclusive: false,
      descriptionOfProperty: "House",
      latitude: null,
      longitude: null,
      eircode: "D02 X285",
      estimatedEircode: "D02 ABC",
    });

    expect(result.eircode).toBe("D02 X285");
    expect(result.estimatedEircode).toBe("D02 ABC");
  });

  it("validates latitude range", () => {
    expect(() =>
      propertySaleSchema.parse({
        sourceKey: "PPR",
        saleDate: new Date(),
        address: "123 Main St",
        county: "Dublin",
        priceEur: 350000,
        notFullMarketPrice: false,
        vatExclusive: false,
        descriptionOfProperty: "House",
        latitude: 100,
        longitude: 0,
      })
    ).toThrow();
  });

  it("validates longitude range", () => {
    expect(() =>
      propertySaleSchema.parse({
        sourceKey: "PPR",
        saleDate: new Date(),
        address: "123 Main St",
        county: "Dublin",
        priceEur: 350000,
        notFullMarketPrice: false,
        vatExclusive: false,
        descriptionOfProperty: "House",
        latitude: 0,
        longitude: -200,
      })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => propertySaleSchema.parse({})).toThrow();
    expect(() => propertySaleSchema.parse({ sourceKey: "PPR" })).toThrow();
  });

  it("rejects zero price", () => {
    expect(() =>
      propertySaleSchema.parse({
        sourceKey: "PPR",
        saleDate: new Date(),
        address: "123 Main St",
        county: "Dublin",
        priceEur: 0,
        notFullMarketPrice: false,
        vatExclusive: false,
        descriptionOfProperty: "House",
        latitude: 0,
        longitude: 0,
      })
    ).toThrow();
  });

  it("rejects float price", () => {
    expect(() =>
      propertySaleSchema.parse({
        sourceKey: "PPR",
        saleDate: new Date(),
        address: "123 Main St",
        county: "Dublin",
        priceEur: 350000.5,
        notFullMarketPrice: false,
        vatExclusive: false,
        descriptionOfProperty: "House",
        latitude: 0,
        longitude: 0,
      })
    ).toThrow();
  });

  it("validates boolean fields", () => {
    const result = propertySaleSchema.parse({
      sourceKey: "PPR",
      saleDate: new Date(),
      address: "123 Main St",
      county: "Dublin",
      priceEur: 350000,
      notFullMarketPrice: true,
      vatExclusive: true,
      descriptionOfProperty: "House",
      latitude: 0,
      longitude: 0,
    });
    expect(result.notFullMarketPrice).toBe(true);
    expect(result.vatExclusive).toBe(true);
  });

  it("accepts estimated coordinates", () => {
    const result = propertySaleSchema.parse({
      sourceKey: "PPR",
      saleDate: new Date(),
      address: "123 Main St",
      county: "Dublin",
      priceEur: 350000,
      notFullMarketPrice: false,
      vatExclusive: false,
      descriptionOfProperty: "House",
      latitude: 53.34,
      longitude: -6.26,
      estimatedLatitude: 53.35,
      estimatedLongitude: -6.27,
    });
    expect(result.estimatedLatitude).toBe(53.35);
    expect(result.estimatedLongitude).toBe(-6.27);
  });
});
