import { describe, it, expect } from "vitest";
import { fetchCsoIncomeMetrics, normalizeCountyLabel } from "./modules/income";

describe("normalizeCountyLabel", () => {
  it("strips the Co. prefix from county labels", () => {
    expect(normalizeCountyLabel("Co. Dublin")).toBe("Dublin");
    expect(normalizeCountyLabel("Co. Carlow")).toBe("Carlow");
  });

  it("keeps Ireland as-is", () => {
    expect(normalizeCountyLabel("Ireland")).toBe("Ireland");
  });
});

describe("fetchCsoIncomeMetrics", () => {
  const fixture = {
    id: ["STATISTIC", "TLIST(A1)", "C03788V04538"],
    value: [
      // RAA02C12 (mapped): 2023 Ireland=100, 2023 Dublin=110, 2024 Ireland=120, 2024 Dublin=130
      100, 110, 120, 130,
      // RAA02C08 (mapped): 2023 Ireland=200, 2023 Dublin=210, 2024 Ireland=220, 2024 Dublin=230
      200, 210, 220, 230,
      // RAA02C01 (NOT mapped): all values must be skipped
      1, 2, 3, 4,
    ],
    dimension: {
      STATISTIC: {
        category: {
          index: ["RAA02C12", "RAA02C08", "RAA02C01"],
          label: {
            RAA02C12: "Disposable Income per Person",
            RAA02C08: "Total Income per Person",
            RAA02C01: "Unmapped Statistic",
          },
        },
      },
      "TLIST(A1)": {
        category: {
          index: ["2023", "2024"],
          label: { "2023": "2023", "2024": "2024" },
        },
      },
      C03788V04538: {
        category: {
          index: ["IE0", "2ae19629-1448-13a3-e055-000000000001"],
          label: {
            IE0: "Ireland",
            "2ae19629-1448-13a3-e055-000000000001": "Co. Dublin",
          },
        },
      },
    },
  } as const;

  it("maps stats, periods and geographies in JSON-stat flat-array order", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    try {
      const metrics = await fetchCsoIncomeMetrics();
      expect(metrics).toHaveLength(8);
      // First block: RAA02C12, order stat -> time -> geo
      expect(metrics[0]).toMatchObject({ source: "CSO_RAA02", metric: "income_disposable_person", geography: "Ireland", period: "2023", value: 100, unit: "EUR" });
      expect(metrics[1]).toMatchObject({ metric: "income_disposable_person", geography: "Dublin", period: "2023", value: 110 });
      expect(metrics[2]).toMatchObject({ metric: "income_disposable_person", geography: "Ireland", period: "2024", value: 120 });
      expect(metrics[3]).toMatchObject({ metric: "income_disposable_person", geography: "Dublin", period: "2024", value: 130 });
      // Second block: RAA02C08 with its own unit
      expect(metrics[4]).toMatchObject({ metric: "income_total_person", geography: "Ireland", period: "2023", value: 200, unit: "EUR" });
      expect(metrics[7]).toMatchObject({ metric: "income_total_person", geography: "Dublin", period: "2024", value: 230 });
    } finally {
      globalThis.fetch = orig;
    }
  });

  it("skips unmapped statistics entirely", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    try {
      const metrics = await fetchCsoIncomeMetrics();
      expect(metrics.some((m) => m.metric === "RAA02C01" || m.metric.includes("Unmapped"))).toBe(false);
      expect(metrics.every((m) => ["income_disposable_person", "income_total_person"].includes(m.metric))).toBe(true);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it("throws on a non-OK response", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response("boom", { status: 500 });
    try {
      await expect(fetchCsoIncomeMetrics()).rejects.toThrow(/500/);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
