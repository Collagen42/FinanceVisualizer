import { AnnualFinancials, GrowthMetrics } from '../types/financial';

/**
 * Calculate year-over-year growth as a percentage.
 * Returns null if either value is null or previous is 0.
 */
function yoyGrowth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate year-over-year growth metrics for each year in the array.
 * The first year has no previous data, so growth starts from the second element.
 * Returns an array of GrowthMetrics aligned to years[1..n].
 */
export function calculateGrowth(annuals: AnnualFinancials[]): GrowthMetrics[] {
  const results: GrowthMetrics[] = [];

  for (let i = 1; i < annuals.length; i++) {
    const current = annuals[i];
    const previous = annuals[i - 1];

    results.push({
      year: current.year,
      revenueGrowth: yoyGrowth(current.turnover, previous.turnover),
      netProfitGrowth: yoyGrowth(current.netProfit, previous.netProfit),
      operatingProfitGrowth: yoyGrowth(current.operatingProfit, previous.operatingProfit),
      assetGrowth: yoyGrowth(current.totalAssets, previous.totalAssets),
      equityGrowth: yoyGrowth(current.ownCapital, previous.ownCapital),
      employeeGrowth: yoyGrowth(current.employeeCount, previous.employeeCount),
    });
  }

  return results;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR) as a percentage.
 * Returns null if either value is null, startValue <= 0, or years <= 0.
 */
export function calculateCAGR(
  startValue: number | null,
  endValue: number | null,
  years: number
): number | null {
  if (startValue === null || endValue === null || startValue <= 0 || years <= 0) {
    return null;
  }
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}
