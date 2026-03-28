import { CompanyFinancials, FinancialScoreDimension, FinancialScoreResult } from '../types/financial';
import { calculatePiotroskiScore } from './scoring';
import { calculateCAGR } from './trends';

/**
 * Linear interpolation score between floor (0 pts) and ceiling (10 pts), clamped to [0, 10].
 */
export function linearScore(
  value: number | null,
  floor: number,
  ceiling: number,
  direction: 'higher-better' | 'lower-better' = 'higher-better'
): number | null {
  if (value === null || value === undefined) return null;

  if (direction === 'lower-better') {
    return Math.min(10, Math.max(0, ((floor - value) / (floor - ceiling)) * 10));
  }
  return Math.min(10, Math.max(0, ((value - floor) / (ceiling - floor)) * 10));
}

function averageNonNull(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function calculateProfitabilityScore(
  company: CompanyFinancials,
  year: number
): FinancialScoreDimension {
  const ratios = company.ratios.find((r) => r.year === year);
  const annuals = company.annuals.find((a) => a.year === year);
  const prevAnnuals = company.annuals.find((a) => a.year === year - 1);
  const prevRatios = company.ratios.find((r) => r.year === year - 1);

  const piotroski = calculatePiotroskiScore(
    annuals && ratios ? { annuals, ratios } : null,
    prevAnnuals && prevRatios ? { annuals: prevAnnuals, ratios: prevRatios } : null
  );

  const subScores = [
    { name: 'Operating Margin', value: ratios?.operatingMargin ?? null, score: linearScore(ratios?.operatingMargin ?? null, -5, 20) },
    { name: 'Net Margin', value: ratios?.netMargin ?? null, score: linearScore(ratios?.netMargin ?? null, -5, 15) },
    { name: 'ROE', value: ratios?.roe ?? null, score: linearScore(ratios?.roe ?? null, 0, 25) },
    { name: 'ROA', value: ratios?.roa ?? null, score: linearScore(ratios?.roa ?? null, 0, 15) },
    { name: 'Piotroski F-Score', value: piotroski, score: linearScore(piotroski, 0, 9) },
  ];

  return {
    name: 'Profitability',
    score: averageNonNull(subScores.map((s) => s.score)),
    maxScore: 10,
    weight: 0.25,
    subScores,
  };
}

export function calculateGrowthScore(
  company: CompanyFinancials,
  year: number
): FinancialScoreDimension {
  const growth = company.growth.find((g) => g.year === year);
  const annuals = company.annuals;
  const sorted = [...annuals].sort((a, b) => a.year - b.year);
  const yearCount = sorted.length;

  let revenueCagr: number | null = null;
  if (yearCount >= 2) {
    revenueCagr = calculateCAGR(
      sorted[0].turnover,
      sorted[sorted.length - 1].turnover,
      yearCount - 1
    );
  }

  const subScores = [
    { name: 'Revenue Growth', value: growth?.revenueGrowth ?? null, score: linearScore(growth?.revenueGrowth ?? null, -10, 30) },
    { name: 'Net Profit Growth', value: growth?.netProfitGrowth ?? null, score: linearScore(growth?.netProfitGrowth ?? null, -20, 40) },
    { name: 'Op. Profit Growth', value: growth?.operatingProfitGrowth ?? null, score: linearScore(growth?.operatingProfitGrowth ?? null, -20, 40) },
    { name: 'Revenue CAGR', value: revenueCagr, score: linearScore(revenueCagr, -5, 20) },
    { name: 'Equity Growth', value: growth?.equityGrowth ?? null, score: linearScore(growth?.equityGrowth ?? null, -10, 20) },
  ];

  return {
    name: 'Growth',
    score: averageNonNull(subScores.map((s) => s.score)),
    maxScore: 10,
    weight: 0.20,
    subScores,
  };
}

export function calculateFinancialStrengthScore(
  company: CompanyFinancials,
  year: number
): FinancialScoreDimension {
  const ratios = company.ratios.find((r) => r.year === year);
  const annuals = company.annuals.find((a) => a.year === year);

  let cashToDebt: number | null = null;
  if (annuals?.cashAndEquivalents !== null && annuals?.totalDebts !== null && annuals?.totalDebts !== 0) {
    cashToDebt = annuals!.cashAndEquivalents! / annuals!.totalDebts!;
  }

  const subScores = [
    { name: 'Debt-to-Equity', value: ratios?.debtToEquity ?? null, score: linearScore(ratios?.debtToEquity ?? null, 3.0, 0.0, 'lower-better') },
    { name: 'Equity Ratio', value: ratios?.equityRatio ?? null, score: linearScore(ratios?.equityRatio ?? null, 0.1, 0.7) },
    { name: 'Current Ratio', value: ratios?.currentRatio ?? null, score: linearScore(ratios?.currentRatio ?? null, 0.5, 2.5) },
    { name: 'Quick Ratio', value: ratios?.quickRatio ?? null, score: linearScore(ratios?.quickRatio ?? null, 0.2, 1.5) },
    { name: 'Cash-to-Debt', value: cashToDebt, score: linearScore(cashToDebt, 0.0, 0.5) },
  ];

  return {
    name: 'Financial Strength',
    score: averageNonNull(subScores.map((s) => s.score)),
    maxScore: 10,
    weight: 0.25,
    subScores,
  };
}

export function calculateEfficiencyScore(
  company: CompanyFinancials,
  year: number
): FinancialScoreDimension {
  const ratios = company.ratios.find((r) => r.year === year);

  const subScores = [
    { name: 'Asset Turnover', value: ratios?.assetTurnover ?? null, score: linearScore(ratios?.assetTurnover ?? null, 0.1, 2.0) },
    { name: 'Revenue/Employee', value: ratios?.revenuePerEmployee ?? null, score: linearScore(ratios?.revenuePerEmployee ?? null, 50000, 500000) },
    { name: 'Profit/Employee', value: ratios?.profitPerEmployee ?? null, score: linearScore(ratios?.profitPerEmployee ?? null, 0, 50000) },
    { name: 'ROIC', value: ratios?.roic ?? null, score: linearScore(ratios?.roic ?? null, 0, 20) },
  ];

  return {
    name: 'Efficiency',
    score: averageNonNull(subScores.map((s) => s.score)),
    maxScore: 10,
    weight: 0.15,
    subScores,
  };
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (Math.abs(mean) === 0) return null;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

export function calculateStabilityScore(
  company: CompanyFinancials
): FinancialScoreDimension {
  const annuals = company.annuals;
  const ratios = company.ratios;

  if (annuals.length < 3) {
    return {
      name: 'Stability',
      score: null,
      maxScore: 10,
      weight: 0.15,
      subScores: [
        { name: 'Op. Margin Stability', value: null, score: null },
        { name: 'Net Margin Stability', value: null, score: null },
        { name: 'Revenue Stability', value: null, score: null },
        { name: 'Profit Consistency', value: null, score: null },
      ],
    };
  }

  const opMargins = ratios.map((r) => r.operatingMargin).filter((v): v is number => v !== null);
  const netMargins = ratios.map((r) => r.netMargin).filter((v): v is number => v !== null);
  const revenues = annuals.map((a) => a.turnover).filter((v): v is number => v !== null);

  const opMarginCV = coefficientOfVariation(opMargins);
  const netMarginCV = coefficientOfVariation(netMargins);
  const revenueCV = coefficientOfVariation(revenues);

  const profitableYears = annuals.filter((a) => a.netProfit !== null && a.netProfit > 0).length;
  const totalYears = annuals.filter((a) => a.netProfit !== null).length;
  const profitConsistency = totalYears > 0 ? profitableYears / totalYears : null;

  const subScores = [
    { name: 'Op. Margin Stability', value: opMarginCV, score: linearScore(opMarginCV, 1.5, 0.0, 'lower-better') },
    { name: 'Net Margin Stability', value: netMarginCV, score: linearScore(netMarginCV, 1.5, 0.0, 'lower-better') },
    { name: 'Revenue Stability', value: revenueCV, score: linearScore(revenueCV, 1.0, 0.0, 'lower-better') },
    { name: 'Profit Consistency', value: profitConsistency, score: linearScore(profitConsistency, 0.0, 1.0) },
  ];

  return {
    name: 'Stability',
    score: averageNonNull(subScores.map((s) => s.score)),
    maxScore: 10,
    weight: 0.15,
    subScores,
  };
}

export function calculateFinancialScore(
  company: CompanyFinancials,
  year: number
): FinancialScoreResult {
  const dimensions = [
    calculateProfitabilityScore(company, year),
    calculateGrowthScore(company, year),
    calculateFinancialStrengthScore(company, year),
    calculateEfficiencyScore(company, year),
    calculateStabilityScore(company),
  ];

  // Weighted average with null-dimension redistribution
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of dimensions) {
    if (dim.score !== null) {
      weightedSum += dim.score * dim.weight;
      totalWeight += dim.weight;
    }
  }

  const overall = totalWeight > 0 ? (weightedSum / totalWeight) * 10 : null;

  return {
    overall: overall !== null ? Math.round(overall) : null,
    dimensions,
    companyId: company.id,
    companyName: company.name,
    year,
  };
}
