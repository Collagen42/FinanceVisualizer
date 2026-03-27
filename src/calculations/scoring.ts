import { AnnualFinancials, FinancialRatios, RATIO_THRESHOLDS } from '../types/financial';

/**
 * Determine a traffic-light color for a financial ratio value based on defined thresholds.
 * Returns 'gray' if value is null or thresholdKey is not recognized.
 */
export function getScoreColor(
  value: number | null,
  thresholdKey: string
): 'green' | 'yellow' | 'red' | 'gray' {
  if (value === null) {
    return 'gray';
  }

  const threshold = RATIO_THRESHOLDS[thresholdKey];
  if (!threshold) {
    return 'gray';
  }

  if (threshold.direction === 'higher-better') {
    if (value >= threshold.good) return 'green';
    if (value >= threshold.moderate) return 'yellow';
    return 'red';
  } else {
    // lower-better
    if (value <= threshold.good) return 'green';
    if (value <= threshold.moderate) return 'yellow';
    return 'red';
  }
}

/**
 * Calculate a simplified Piotroski F-Score (0-9).
 *
 * Scores 1 point for each of these criteria:
 * 1. Positive net profit (ROA > 0)
 * 2. Positive operating cash flow (approx: netProfit + depreciation > 0)
 * 3. Increasing ROA vs previous year
 * 4. Operating cash flow > net profit (quality of earnings)
 * 5. Decrease in long-term debt ratio vs previous
 * 6. Increase in current ratio vs previous
 * 7. No new shares issued (default 1 — not tracked)
 * 8. Increase in gross margin vs previous
 * 9. Increase in asset turnover vs previous
 *
 * Returns null if current is null.
 * If previous is null, only scores items 1, 2, 4 (partial score out of possible).
 */
export function calculatePiotroskiScore(
  current: { annuals: AnnualFinancials; ratios: FinancialRatios } | null,
  previous: { annuals: AnnualFinancials; ratios: FinancialRatios } | null
): number | null {
  if (current === null) {
    return null;
  }

  const { annuals: curA, ratios: curR } = current;

  let score = 0;

  // 1. Positive net profit (ROA > 0)
  if (curR.roa !== null && curR.roa > 0) {
    score += 1;
  }

  // 2. Positive operating cash flow (approximate: netProfit + depreciation > 0)
  if (curA.netProfit !== null && curA.depreciation !== null) {
    if (curA.netProfit + curA.depreciation > 0) {
      score += 1;
    }
  }

  // 4. Operating cash flow > net profit (quality of earnings)
  if (curA.netProfit !== null && curA.depreciation !== null) {
    const ocf = curA.netProfit + curA.depreciation;
    if (ocf > curA.netProfit) {
      score += 1;
    }
  }

  if (previous === null) {
    // Without previous data, only items 1, 2, 4 can be scored
    return score;
  }

  const { annuals: prevA, ratios: prevR } = previous;

  // 3. Increasing ROA vs previous year
  if (curR.roa !== null && prevR.roa !== null && curR.roa > prevR.roa) {
    score += 1;
  }

  // 5. Decrease in long-term debt ratio vs previous
  if (
    curA.longTermDebts !== null && curA.totalAssets !== null && curA.totalAssets !== 0 &&
    prevA.longTermDebts !== null && prevA.totalAssets !== null && prevA.totalAssets !== 0
  ) {
    const curLtDebtRatio = curA.longTermDebts / curA.totalAssets;
    const prevLtDebtRatio = prevA.longTermDebts / prevA.totalAssets;
    if (curLtDebtRatio < prevLtDebtRatio) {
      score += 1;
    }
  }

  // 6. Increase in current ratio vs previous
  if (curR.currentRatio !== null && prevR.currentRatio !== null && curR.currentRatio > prevR.currentRatio) {
    score += 1;
  }

  // 7. No new shares issued (not tracked — default 1 point)
  score += 1;

  // 8. Increase in gross margin vs previous
  if (curR.grossMargin !== null && prevR.grossMargin !== null && curR.grossMargin > prevR.grossMargin) {
    score += 1;
  }

  // 9. Increase in asset turnover vs previous
  if (curR.assetTurnover !== null && prevR.assetTurnover !== null && curR.assetTurnover > prevR.assetTurnover) {
    score += 1;
  }

  return score;
}
