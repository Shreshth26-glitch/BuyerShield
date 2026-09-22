/**
 * BuyerShield — Pure Deterministic Section 18 Remedy Math Engine
 *
 * Implements pure mathematical functions for statutory remedies under
 * Section 18 of the Real Estate (Regulation and Development) Act, 2016.
 * Zero floating point drift: All calculations use integer-paise internally.
 * Zero external I/O or network dependencies.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Normalizes input date to midnight UTC Date object to eliminate timezone shifts
 */
export function normalizeDate(input) {
  if (!input) throw new Error('Date is required for remedy calculation.');
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const str = String(input).trim();
  // Expect YYYY-MM-DD or ISO string
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const d = new Date(str);
    if (isNaN(d.getTime())) throw new Error(`Invalid date string provided: ${input}`);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
}

/**
 * Formats a UTC Date to YYYY-MM-DD string
 */
export function formatDateOnly(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validates inputs and returns principal in paise and rate as number
 */
function sanitizeInputs(principalAmount, rate) {
  const principal = parseFloat(principalAmount);
  if (isNaN(principal) || principal <= 0) {
    throw new Error('Principal amount must be a positive number.');
  }
  const rateVal = parseFloat(rate);
  if (isNaN(rateVal) || rateVal <= 0) {
    throw new Error('Applicable interest rate must be a positive percentage.');
  }
  // Convert rupees to integer paise
  const principalPaise = Math.round(principal * 100);
  return { principal, principalPaise, rate: rateVal };
}

/**
 * Calculates Section 18(1) Remedy A: "Withdraw"
 * Full refund of principal + simple interest at state rate from delay start to today.
 *
 * @param {Object} params
 * @param {number|string} params.principalAmount
 * @param {Date|string} params.delayStartDate
 * @param {Date|string} params.today
 * @param {number|string} params.rate
 * @returns {Object} { refundAmount, interestAmount, totalAmount, daysElapsed, breakdown }
 */
export function calculateWithdrawRemedy({ principalAmount, delayStartDate, today = new Date(), rate }) {
  const { principal, principalPaise, rate: annualRate } = sanitizeInputs(principalAmount, rate);

  const startDate = normalizeDate(delayStartDate);
  const endDate = normalizeDate(today);

  const timeDiff = endDate.getTime() - startDate.getTime();
  if (timeDiff <= 0) {
    return {
      isDelayed: false,
      message: 'Project is not yet delayed; delay start date is on or after the evaluation date.',
      refundAmount: principal,
      interestAmount: 0,
      totalAmount: principal,
      daysElapsed: 0,
      rate: annualRate,
      breakdown: {
        principalRefund: principal,
        interestAccrued: 0,
        daysElapsed: 0,
        annualRate,
      },
    };
  }

  // Elapsed days (day count convention: actual days / 365)
  const daysElapsed = Math.round(timeDiff / MS_PER_DAY);

  // Exact interest in integer paise: (Principal * Rate * Days) / (365 * 100)
  const interestPaise = Math.round((principalPaise * (annualRate / 100) * daysElapsed) / 365);
  const interestAmount = interestPaise / 100;
  const totalPaise = principalPaise + interestPaise;
  const totalAmount = totalPaise / 100;

  return {
    isDelayed: true,
    remedyType: 'withdraw',
    refundAmount: principal,
    interestAmount,
    totalAmount,
    daysElapsed,
    rate: annualRate,
    delayStartDate: formatDateOnly(startDate),
    delayEndDate: formatDateOnly(endDate),
    breakdown: {
      principalRefund: principal,
      interestAccrued: interestAmount,
      totalRefund: totalAmount,
      daysElapsed,
      annualRate,
      calculationFormula: 'Simple Interest = (Principal * Annual Rate * Days Delayed) / 365',
    },
  };
}

/**
 * Calculates Section 18(1) Remedy B: "Continue & Claim Interest"
 * Interest accrued month-by-month on principal at state rate from delay start to today.
 *
 * @param {Object} params
 * @param {number|string} params.principalAmount
 * @param {Date|string} params.delayStartDate
 * @param {Date|string} params.today
 * @param {number|string} params.rate
 * @returns {Object} { monthsElapsed, totalDays, monthlyInterestAmount, totalAccruedSoFar, breakdown }
 */
export function calculateContinueRemedy({ principalAmount, delayStartDate, today = new Date(), rate }) {
  const { principal, principalPaise, rate: annualRate } = sanitizeInputs(principalAmount, rate);

  const startDate = normalizeDate(delayStartDate);
  const endDate = normalizeDate(today);

  const totalTimeDiff = endDate.getTime() - startDate.getTime();
  if (totalTimeDiff <= 0) {
    return {
      isDelayed: false,
      message: 'Project is not yet delayed; delay start date is on or after the evaluation date.',
      monthsElapsed: 0,
      totalDays: 0,
      monthlyInterestAmount: 0,
      totalAccruedSoFar: 0,
      breakdown: [],
    };
  }

  // Benchmark standard full-month interest (1/12th of annual)
  const monthlyBenchmarkPaise = Math.round((principalPaise * (annualRate / 100)) / 12);
  const monthlyInterestAmount = monthlyBenchmarkPaise / 100;

  const breakdown = [];
  let totalAccruedPaise = 0;
  let totalDaysAccumulator = 0;

  // Iterate calendar months from startDate to endDate
  let curYear = startDate.getUTCFullYear();
  let curMonth = startDate.getUTCMonth();

  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
    // Month boundaries
    const monthStart = new Date(Date.UTC(curYear, curMonth, 1));
    const nextMonthStart = new Date(Date.UTC(curYear, curMonth + 1, 1));
    const monthEnd = new Date(nextMonthStart.getTime() - MS_PER_DAY);

    // Active slice inside this month
    const sliceStart = startDate.getTime() > monthStart.getTime() ? startDate : monthStart;
    const sliceEnd = endDate.getTime() < monthEnd.getTime() ? endDate : monthEnd;

    if (sliceEnd.getTime() >= sliceStart.getTime()) {
      // Days in this month slice (inclusive)
      const sliceDays = Math.round((sliceEnd.getTime() - sliceStart.getTime()) / MS_PER_DAY) + 1;
      totalDaysAccumulator += sliceDays;

      // Accrued interest for this month slice in paise
      const monthInterestPaise = Math.round((principalPaise * (annualRate / 100) * sliceDays) / 365);
      totalAccruedPaise += monthInterestPaise;

      const monthLabel = `${MONTH_NAMES[curMonth]} ${curYear}`;

      breakdown.push({
        month: monthLabel,
        year: curYear,
        monthIndex: curMonth + 1,
        startDate: formatDateOnly(sliceStart),
        endDate: formatDateOnly(sliceEnd),
        days: sliceDays,
        amount: monthInterestPaise / 100,
        amountPaise: monthInterestPaise,
      });
    }

    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }

  // Exact total guaranteed to equal sum of itemized rows
  const totalAccruedSoFar = totalAccruedPaise / 100;

  return {
    isDelayed: true,
    remedyType: 'continue',
    monthsElapsed: breakdown.length,
    totalDays: totalDaysAccumulator,
    rate: annualRate,
    monthlyInterestAmount,
    totalAccruedSoFar,
    delayStartDate: formatDateOnly(startDate),
    delayEndDate: formatDateOnly(endDate),
    breakdown,
  };
}
