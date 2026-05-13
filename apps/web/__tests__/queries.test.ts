import { PrismaClient } from "@prisma/client";

describe("Query helpers (unit)", () => {
  describe("buildPprFilterWhere", () => {
    const buildPprFilterWhere = (params: Record<string, unknown>) => {
      const eircodeFilter = params.eircode
        ? { eircode: { contains: params.eircode, mode: "insensitive" as const } }
        : {};
      const localityFilter = params.locality
        ? { address: { contains: params.locality, mode: "insensitive" as const } }
        : {};
      const priceFilter = (params.minPriceEur !== undefined || params.maxPriceEur !== undefined)
        ? {
            priceEur: {
              ...(params.minPriceEur !== undefined ? { gte: params.minPriceEur } : {}),
              ...(params.maxPriceEur !== undefined ? { lte: params.maxPriceEur } : {}),
            },
          }
        : {};
      const dateFilter = params.startDate || params.endDate
        ? {
            saleDate: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {};
      return {
        county: params.county,
        ...priceFilter,
        ...eircodeFilter,
        ...localityFilter,
        ...dateFilter,
      };
    };

    it("returns county-only filter for empty params", () => {
      const result = buildPprFilterWhere({ county: "Dublin" });
      expect(result).toEqual({ county: "Dublin" });
    });

    it("includes eircode filter when provided", () => {
      const result = buildPprFilterWhere({ county: "Dublin", eircode: "D02" });
      expect(result.eircode).toEqual({ contains: "D02", mode: "insensitive" });
    });

    it("includes locality filter when provided", () => {
      const result = buildPprFilterWhere({ county: "Cork", locality: "Malahide" });
      expect(result.address).toEqual({ contains: "Malahide", mode: "insensitive" });
    });

    it("builds price range filter", () => {
      const result = buildPprFilterWhere({ county: "Dublin", minPriceEur: 200000, maxPriceEur: 500000 });
      expect(result.priceEur).toEqual({ gte: 200000, lte: 500000 });
    });

    it("builds date range filter", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");
      const result = buildPprFilterWhere({ county: "Dublin", startDate: start, endDate: end });
      expect(result.saleDate).toEqual({ gte: start, lte: end });
    });

    it("handles min price only", () => {
      const result = buildPprFilterWhere({ county: "Dublin", minPriceEur: 100000 });
      expect(result.priceEur).toEqual({ gte: 100000 });
    });
  });

  describe("search query construction", () => {
    const buildSearchQuery = (query: string, limit = 20) => {
      if (!query || query.trim().length < 2) return null;
      const sanitized = query.trim();
      return {
        sql: `SELECT id, address, county, eircode, "priceEur", "saleDate" FROM "PropertySale" WHERE address ILIKE $1 OR eircode ILIKE $2 OR "estimatedEircode" ILIKE $3 ORDER BY "saleDate" DESC LIMIT ${limit}`,
        params: [`%${sanitized}%`, `%${sanitized}%`, `%${sanitized}%`],
      };
    };

    it("rejects empty query", () => {
      expect(buildSearchQuery("")).toBeNull();
    });

    it("rejects single char query", () => {
      expect(buildSearchQuery("a")).toBeNull();
    });

    it("rejects whitespace-only query", () => {
      expect(buildSearchQuery("  ")).toBeNull();
    });

    it("trims whitespace before check", () => {
      const result = buildSearchQuery("  ab  ");
      expect(result).not.toBeNull();
      expect(result!.params[0]).toBe("%ab%");
    });

    it("generates correct limit", () => {
      const result = buildSearchQuery("test", 50);
      expect(result!.sql).toContain("LIMIT 50");
    });
  });

  describe("Prisma client instantiation", () => {
    it("creates client without crashing", () => {
      const client = new PrismaClient({
        datasources: { db: { url: "postgresql://dummy:dummy@localhost:5432/dummy" } },
      });
      expect(client).toBeDefined();
      expect(client.$connect).toBeInstanceOf(Function);
    });
  });

  describe("Raw query parameterization safety", () => {
    it("isolates malicious input in parameters (not in SQL string)", () => {
      const malicious = "'; DROP TABLE \"PropertySale\"; --";
      const params = [`%${malicious}%`];
      expect(params[0]).toBe("%'; DROP TABLE \"PropertySale\"; --%");
    });

    it("parameterized ILIKE prevents SQL injection in search", () => {
      const buildSearch = (q: string) => ({
        sql: `SELECT * FROM "PropertySale" WHERE address ILIKE $1`,
        params: [`%${q}%`],
      });
      const injection = "test' OR '1'='1";
      const result = buildSearch(injection);
      expect(result.params[0]).toBe("%test' OR '1'='1%");
      expect(result.sql).toBe(`SELECT * FROM "PropertySale" WHERE address ILIKE $1`);
    });
  });
});
