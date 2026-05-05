import { describe, expect, it } from "vitest";

/** Same rules as ppr-import: tolerate mojibake after `Price (` */
function findPriceKey(row: Record<string, string>): string | undefined {
  return (
    Object.keys(row).find((k) => /^price\s*\(/i.test(k)) ??
    Object.keys(row).find((k) => k.toLowerCase().startsWith("price"))
  );
}

describe("PPR CSV price column detection", () => {
  it("matches UTF-8 euro header", () => {
    const row = { "Price (€)": "€100,000.00" };
    expect(findPriceKey(row)).toBe("Price (€)");
  });

  it("matches mojibake euro header (UTF-8 bytes read as Windows-1252)", () => {
    const row = { "Price (â‚¬)": "€100,000.00" };
    expect(findPriceKey(row)).toBe("Price (â‚¬)");
  });

  it("handles lowercase price header", () => {
    const row = { "price (€)": "€100,000.00" };
    expect(findPriceKey(row)).toBe("price (€)");
  });

  it("handles extra spaces in header", () => {
    const row = { "Price  (€)": "€100,000.00" };
    expect(findPriceKey(row)).toBe("Price  (€)");
  });

  it("returns undefined when no price column exists", () => {
    const row = { "Address": "123 Main St", "County": "Dublin" };
    expect(findPriceKey(row)).toBeUndefined();
  });

  it("prioritizes price with parentheses over plain price", () => {
    const row = { "Price": "100", "Price (€)": "€100,000.00" };
    expect(findPriceKey(row)).toBe("Price (€)");
  });

  it("falls back to plain price when no parentheses version exists", () => {
    const row = { "Price": "100", "Other": "value" };
    expect(findPriceKey(row)).toBe("Price");
  });
});
