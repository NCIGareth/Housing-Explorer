/**
 * Mortgage affordability calculator following the Central Bank of Ireland
 * macroprudential mortgage measures (revised 2024):
 *  - Income limit (LTI): 4x gross income for all borrowers.
 *    (Up to 20% of First-Time Buyer lending may exceed this up to 4.5x —
 *    we model the strict 4x as the guaranteed pass threshold.)
 *  - Loan-to-value (LTV): First-Time Buyers 90% up to €330,000 then 80% above;
 *    second/subsequent buyers ("movers") 80% flat.
 * Illustrative only — not financial advice.
 */

export const LTI_MULTIPLE = 4;
export const FTB_LTV_CAP = 330_000;
export const FTB_LTV_FIRST_TRANCHE = 0.9;
export const FTB_LTV_ABOVE_TRANCHE = 0.8;
export const MOVER_LTV = 0.8;

export type MortgageInput = {
  /** Asking/median property price in EUR. */
  price: number;
  /** Combined gross annual household income in EUR. */
  grossAnnualIncome: number;
  /** Cash deposit available in EUR. */
  deposit: number;
  isFirstTimeBuyer: boolean;
  termYears: number;
  /** Annual percentage rate (e.g. 3.9 for 3.9%). */
  ratePct: number;
};

export type MortgageResult = {
  /** Maximum mortgage the LTI rule allows. */
  maxLtiLoan: number;
  /** Maximum mortgage the LTV rule allows for this buyer type and price. */
  maxLtvLoan: number;
  /** min(maxLtvLoan, maxLtiLoan). */
  maxBorrowable: number;
  /** Minimum cash deposit the rules imply. */
  requiredDeposit: number;
  /** Price minus available deposit (what you need to borrow). */
  loanNeeded: number;
  /** The loan actually modelled (capped at maxBorrowable). */
  loan: number;
  /** Whether the purchase is achievable under the rules with the given deposit. */
  affordable: boolean;
  /**
   * Gross annual income at which the LTI cap just covers loanNeeded
   * (loanNeeded / 4). Null when the deposit is too small for the LTV rule —
   * no income level can fix that.
   */
  minIncomeNeeded: number | null;
  /** True when even unlimited income can't close the gap (deposit too small). */
  depositBinding: boolean;
  /** Annual equivalent rate used. */
  ratePct: number;
  monthlyPayment: number;
  ltvPct: number;
};

/** Standard annuity repayment for a fixed-rate loan. */
export function mortgageMonthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  const months = termYears * 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { price, grossAnnualIncome, deposit, isFirstTimeBuyer, termYears, ratePct } = input;

  const maxLtiLoan = LTI_MULTIPLE * grossAnnualIncome;

  const maxLtvLoan = isFirstTimeBuyer
    ? FTB_LTV_FIRST_TRANCHE * Math.min(price, FTB_LTV_CAP) + FTB_LTV_ABOVE_TRANCHE * Math.max(price - FTB_LTV_CAP, 0)
    : MOVER_LTV * price;

  const loanNeeded = Math.max(price - deposit, 0);

  // The LTV rule is binding when even its maximum loan can't cover
  // price - deposit. No income level fixes that — only a bigger deposit.
  const ltvGap = loanNeeded - maxLtvLoan;
  const depositBinding = ltvGap > 0.01;
  const minIncomeNeeded = depositBinding ? null : loanNeeded / LTI_MULTIPLE;

  const maxBorrowable = Math.min(maxLtvLoan, maxLtiLoan);
  const requiredDeposit = Math.max(price - maxBorrowable, 0);

  // Small tolerance so round-number deposits don't false-fail on float errors.
  const affordable = loanNeeded <= maxBorrowable + 0.01;
  const loan = affordable ? loanNeeded : maxBorrowable;
  const monthlyPayment = mortgageMonthlyPayment(loan, ratePct, termYears);
  const ltvPct = price > 0 ? (loan / price) * 100 : 0;

  return {
    maxLtiLoan,
    maxLtvLoan,
    maxBorrowable,
    requiredDeposit,
    loanNeeded,
    loan,
    affordable,
    minIncomeNeeded,
    depositBinding,
    ratePct,
    monthlyPayment,
    ltvPct,
  };
}

/** Formats a EUR amount compactly for inputs (e.g. 350000 -> "350000"). */
export function formatEur(value: number): string {
  return Math.round(value).toLocaleString("en-IE");
}
