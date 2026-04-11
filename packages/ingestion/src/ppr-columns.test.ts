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
});
