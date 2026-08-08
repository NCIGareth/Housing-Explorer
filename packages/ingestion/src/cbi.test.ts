import { describe, it, expect } from "vitest";
import { parseMonthlyRates, parseQuarterlyRates, toMonthPeriod, toQuarterPeriod } from "./modules/cbi";

describe("period helpers", () => {
  it("converts DD/MM/YYYY to the RPPI month convention", () => {
    expect(toMonthPeriod("31/01/2003")).toBe("2003M01");
    expect(toMonthPeriod("29/05/2026")).toBe("2026M05");
  });

  it("converts DD/MM/YYYY to a quarter", () => {
    expect(toQuarterPeriod("31/12/2014")).toBe("2014Q4");
    expect(toQuarterPeriod("31/03/2015")).toBe("2015Q1");
    expect(toQuarterPeriod("30/06/2020")).toBe("2020Q2");
  });
});

describe("parseMonthlyRates", () => {
  // Columns match the real B.2.1 layout: 0=date, 1=overall, 3=floating & ≤1yr, 5=over 1yr, 7=APRC
  const rows = [
    ["Reporting date", "overall", "", "floating", "", "over1y", "", "aprc"],
    ["31/01/2003", "4.14", "", "4.08", "", "4.45", "", "4.16"],
    ["29/05/2026", "3.41", "", "3.90", "", "3.37", "", "3.40"],
    // Empty cells and "-" placeholders must be skipped entirely
    ["30/04/2015", "", "", "-", "", "", "", ""],
  ];

  it("parses the four mortgage rate series per month", () => {
    const metrics = parseMonthlyRates(rows);
    expect(metrics).toHaveLength(8);

    const overall = metrics.filter((m) => m.metric === "mortgage_rate_overall");
    expect(overall).toHaveLength(2);
    expect(overall[0]).toMatchObject({ source: "CBI_B21", geography: "Ireland", period: "2003M01", value: 4.14, unit: "pct" });
    expect(overall[1]).toMatchObject({ period: "2026M05", value: 3.41 });

    const floating = metrics.filter((m) => m.metric === "mortgage_rate_floating_le_1y");
    expect(floating[0].value).toBe(4.08);
    const fixed = metrics.filter((m) => m.metric === "mortgage_rate_over_1y_fixed");
    expect(fixed[0].value).toBe(4.45);
    const aprc = metrics.filter((m) => m.metric === "mortgage_rate_aprc");
    expect(aprc[0].value).toBe(4.16);
  });

  it("skips rows with no usable values and tolerates quoted/numeric cells", () => {
    const metrics = parseMonthlyRates(rows);
    expect(metrics.some((m) => m.period === "2015M04")).toBe(false);
  });
});

describe("parseQuarterlyRates", () => {
  // Columns match the real B.3.1 layout: 0=date, 23=PDH floating rate, 24=PDH tracker rate,
  // 25=PDH fixed ≤1yr, 26=1-3yr, 27=over 3yr; 32-36 = corresponding new-business volumes.
  const row = (vals: string[]) => {
    const full = new Array(37).fill("");
    full[0] = vals[0];
    full[23] = vals[1];
    full[24] = vals[2];
    full[25] = vals[3];
    full[26] = vals[4];
    full[27] = vals[5];
    full[32] = vals[6];
    full[33] = vals[7];
    full[34] = vals[8];
    full[35] = vals[9];
    full[36] = vals[10];
    return full;
  };

  const rows = [
    new Array(37).fill("").map((_, i) => `h${i}`),
    row(["31/12/2014", "4.2", "", "3.6", "4.24", "4.03", "517", "", "195", "129", "59"]),
    row(["31/03/2015", "4.14", "", "3.59", "3.93", "3.93", "409", "", "135", "162", "93"]),
  ];

  it("parses PDH new-business rates and volumes with quarter periods", () => {
    const metrics = parseQuarterlyRates(rows);

    const rate = metrics.find((m) => m.metric === "mortgage_rate_pdh_floating" && m.period === "2014Q4");
    expect(rate).toMatchObject({ source: "CBI_B31", geography: "Ireland", value: 4.2, unit: "pct" });

    const vol = metrics.find((m) => m.metric === "mortgage_volume_pdh_fixed_over_3y" && m.period === "2014Q4");
    expect(vol).toMatchObject({ value: 59, unit: "eur_million" });

    expect(metrics.filter((m) => m.metric === "mortgage_rate_pdh_tracker").length).toBe(0);
    expect(metrics.filter((m) => m.period === "2015Q1").length).toBeGreaterThan(0);
    expect(metrics.every((m) => m.metric.startsWith("mortgage_"))).toBe(true);
  });
});
