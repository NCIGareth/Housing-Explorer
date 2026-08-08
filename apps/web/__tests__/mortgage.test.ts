import { calculateMortgage, mortgageMonthlyPayment } from "../lib/mortgage";

describe("mortgageMonthlyPayment", () => {
  it("computes a standard annuity repayment", () => {
    const payment = mortgageMonthlyPayment(200000, 4, 30);
    expect(payment).toBeCloseTo(954.83, 1);
  });

  it("handles a zero rate by spreading principal evenly", () => {
    expect(mortgageMonthlyPayment(120000, 0, 10)).toBeCloseTo(1000, 2);
  });

  it("returns 0 for zero principal", () => {
    expect(mortgageMonthlyPayment(0, 4, 30)).toBe(0);
  });
});

describe("calculateMortgage — FTB LTV rules", () => {
  it("applies 90% up to €330k then 80% above", () => {
    const result = calculateMortgage({
      price: 400000,
      grossAnnualIncome: 100000,
      deposit: 0,
      isFirstTimeBuyer: true,
      termYears: 30,
      ratePct: 3.9,
    });
    // 0.9 * 330k + 0.8 * 70k = 297k + 56k
    expect(result.maxLtvLoan).toBeCloseTo(353000, 0);
    expect(result.requiredDeposit).toBeCloseTo(47000, 0);
  });

  it("caps FTB borrowing at 90% below the €330k threshold", () => {
    const result = calculateMortgage({
      price: 300000,
      grossAnnualIncome: 200000,
      deposit: 0,
      isFirstTimeBuyer: true,
      termYears: 30,
      ratePct: 3.9,
    });
    expect(result.maxLtvLoan).toBeCloseTo(270000, 0);
  });
});

describe("calculateMortgage — LTI (4x) cap", () => {
  it("blocks a purchase that violates the 4x income rule", () => {
    const result = calculateMortgage({
      price: 350000,
      grossAnnualIncome: 50000,
      deposit: 70000,
      isFirstTimeBuyer: true,
      termYears: 30,
      ratePct: 3.9,
    });
    expect(result.maxLtiLoan).toBe(200000);
    // LTV would allow 313k but income only allows 200k
    expect(result.maxBorrowable).toBe(200000);
    expect(result.loanNeeded).toBe(280000);
    expect(result.affordable).toBe(false);
  });

  it("passes when income and deposit satisfy both rules", () => {
    const result = calculateMortgage({
      price: 350000,
      grossAnnualIncome: 80000,
      deposit: 70000,
      isFirstTimeBuyer: true,
      termYears: 30,
      ratePct: 3.9,
    });
    expect(result.maxLtiLoan).toBe(320000);
    expect(result.maxLtvLoan).toBeCloseTo(313000, 0);
    expect(result.affordable).toBe(true);
    expect(result.loan).toBeCloseTo(280000, 0);
    expect(result.ltvPct).toBeCloseTo(80, 0);
  });
});

describe("calculateMortgage — movers (80% LTV)", () => {
  it("applies a flat 80% LTV for non-first-time buyers", () => {
    const result = calculateMortgage({
      price: 300000,
      grossAnnualIncome: 100000,
      deposit: 60000,
      isFirstTimeBuyer: false,
      termYears: 25,
      ratePct: 4,
    });
    expect(result.maxLtvLoan).toBeCloseTo(240000, 0);
    expect(result.loanNeeded).toBeCloseTo(240000, 0);
    expect(result.affordable).toBe(true);
  });

  it("fails a mover purchase when the deposit is too small", () => {
    const result = calculateMortgage({
      price: 300000,
      grossAnnualIncome: 100000,
      deposit: 40000,
      isFirstTimeBuyer: false,
      termYears: 25,
      ratePct: 4,
    });
    expect(result.loanNeeded).toBe(260000);
    expect(result.affordable).toBe(false);
  });
});

describe("calculateMortgage — monthly payment outputs", () => {
  it("produces a monthly payment consistent with the annuity formula", () => {
    const result = calculateMortgage({
      price: 300000,
      grossAnnualIncome: 80000,
      deposit: 60000,
      isFirstTimeBuyer: true,
      termYears: 30,
      ratePct: 4,
    });
    expect(result.loan).toBe(240000);
    expect(result.monthlyPayment).toBeCloseTo(mortgageMonthlyPayment(240000, 4, 30), 2);
  });
});
