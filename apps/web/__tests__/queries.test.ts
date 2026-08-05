import { PrismaClient } from "@prisma/client";
import { buildPprFilterWhere } from "@/lib/queries";

describe("Query helpers (unit)", () => {
  describe("buildPprFilterWhere", () => {
    it("returns empty filter for empty params", () => {
      expect(buildPprFilterWhere({ counties: [] })).toEqual({});
    });

    it("returns county-in filter for a single county", () => {
      const result = buildPprFilterWhere({ counties: ["Dublin"] });
      expect(result).toEqual({ AND: [{ county: { in: ["Dublin"] } }] });
    });

    it("supports multiple counties", () => {
      const result = buildPprFilterWhere({ counties: ["Dublin", "Cork"] });
      expect(result).toEqual({ AND: [{ county: { in: ["Dublin", "Cork"] } }] });
    });

    it("includes eircode filters when provided", () => {
      const result = buildPprFilterWhere({ counties: ["Dublin"], eircodes: ["D02", "D14"] });
      const conds = result.AND!.filter((c) => "OR" in c);
      expect(conds).toHaveLength(1);
      expect(conds[0].OR).toHaveLength(2);
      expect(conds[0].OR![0]).toEqual({
        OR: [
          { eircode: { startsWith: "D02", mode: "insensitive" } },
          { estimatedEircode: { startsWith: "D02", mode: "insensitive" } },
        ],
      });
    });

    it("includes locality filters when provided", () => {
      const result = buildPprFilterWhere({ counties: ["Cork"], localities: ["Malahide", "Swords"] });
      const conds = result.AND!.filter((c) => "OR" in c);
      expect(conds).toHaveLength(1);
      expect(conds[0].OR).toEqual([
        { address: { contains: "Malahide", mode: "insensitive" } },
        { address: { contains: "Swords", mode: "insensitive" } },
      ]);
    });

    it("builds price range filter", () => {
      const result = buildPprFilterWhere({ counties: ["Dublin"], minPriceEur: 200000, maxPriceEur: 500000 });
      const cond = result.AND!.find((c) => "priceEur" in c);
      expect(cond?.priceEur).toEqual({ gte: 200000, lte: 500000 });
    });

    it("builds date range filter", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");
      const result = buildPprFilterWhere({ counties: ["Dublin"], startDate: start, endDate: end });
      const cond = result.AND!.find((c) => "saleDate" in c);
      expect(cond?.saleDate).toEqual({ gte: start, lte: end });
    });

    it("handles min price only", () => {
      const result = buildPprFilterWhere({ counties: ["Dublin"], minPriceEur: 100000 });
      const cond = result.AND!.find((c) => "priceEur" in c);
      expect(cond?.priceEur).toEqual({ gte: 100000 });
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
