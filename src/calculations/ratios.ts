import { AnnualFinancials, FinancialRatios } from '../types/financial';

/**
 * Safely divide two values, returning null if either is null or denominator is 0.
 */
function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

/**
 * Calculate all financial ratios from a single year's AnnualFinancials data.
 * Margins are returned as percentages; leverage/liquidity/efficiency ratios as decimals.
 */
export function calculateRatios(annual: AnnualFinancials): FinancialRatios {
  const { turnover, operatingProfit, netProfit, grossProfit, depreciation } = annual;
  const { totalAssets, currentAssets, stocks, ownCapital, totalDebts, shortTermDebts, longTermDebts } = annual;
  const { employeeCount } = annual;

  // Profitability margins (percentages)
  const grossMargin = grossProfit !== null && turnover !== null && turnover !== 0
    ? (grossProfit / turnover) * 100
    : null;

  const operatingMargin = safeDivide(operatingProfit, turnover) !== null
    ? safeDivide(operatingProfit, turnover)! * 100
    : null;

  const netMargin = safeDivide(netProfit, turnover) !== null
    ? safeDivide(netProfit, turnover)! * 100
    : null;

  const ebitdaMargin =
    operatingProfit !== null && depreciation !== null && turnover !== null && turnover !== 0
      ? ((operatingProfit + depreciation) / turnover) * 100
      : null;

  // Return on capital (percentages)
  const roe = safeDivide(netProfit, ownCapital) !== null
    ? safeDivide(netProfit, ownCapital)! * 100
    : null;

  const roa = safeDivide(netProfit, totalAssets) !== null
    ? safeDivide(netProfit, totalAssets)! * 100
    : null;

  let roic: number | null = null;
  if (operatingProfit !== null && ownCapital !== null && longTermDebts !== null) {
    const investedCapital = ownCapital + longTermDebts;
    if (investedCapital !== 0) {
      roic = (operatingProfit / investedCapital) * 100;
    }
  }

  // Leverage ratios (decimals)
  const debtToEquity = safeDivide(totalDebts, ownCapital);
  const debtToAssets = safeDivide(totalDebts, totalAssets);
  const equityRatio = safeDivide(ownCapital, totalAssets);

  // Liquidity ratios (decimals)
  const currentRatio = safeDivide(currentAssets, shortTermDebts);

  const quickRatio =
    currentAssets !== null && stocks !== null && shortTermDebts !== null && shortTermDebts !== 0
      ? (currentAssets - stocks) / shortTermDebts
      : null;

  // Working capital (absolute value in T RON)
  const workingCapital =
    currentAssets !== null && shortTermDebts !== null
      ? currentAssets - shortTermDebts
      : null;

  // Efficiency ratios (decimals / absolute values)
  const assetTurnover = safeDivide(turnover, totalAssets);
  const revenuePerEmployee = safeDivide(turnover, employeeCount);
  const profitPerEmployee = safeDivide(netProfit, employeeCount);

  // DuPont decomposition
  const equityMultiplier = safeDivide(totalAssets, ownCapital);

  return {
    year: annual.year,
    grossMargin,
    operatingMargin,
    netMargin,
    ebitdaMargin,
    roe,
    roa,
    roic,
    debtToEquity,
    debtToAssets,
    equityRatio,
    currentRatio,
    quickRatio,
    workingCapital,
    assetTurnover,
    revenuePerEmployee,
    profitPerEmployee,
    equityMultiplier,
  };
}
