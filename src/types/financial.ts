export interface AnnualFinancials {
  year: number;
  // Income Statement
  turnover: number | null;
  operatingProfit: number | null;
  netProfit: number | null;
  grossProfit: number | null;
  // Balance Sheet - Assets
  totalAssets: number | null;
  fixedAssets: number | null;
  currentAssets: number | null;
  stocks: number | null;
  receivables: number | null;
  cashAndEquivalents: number | null;
  // Balance Sheet - Liabilities & Equity
  ownCapital: number | null;
  totalDebts: number | null;
  shortTermDebts: number | null;
  longTermDebts: number | null;
  // Sub-items for competitor analysis
  tradeReceivables: number | null;
  tradePayables: number | null;
  creditInstitutionsShortTerm: number | null;
  creditInstitutionsLongTerm: number | null;
  // Other
  employeeCount: number | null;
  depreciation: number | null;
}

export interface FinancialRatios {
  year: number;
  // Profitability
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  // Leverage
  debtToEquity: number | null;
  debtToAssets: number | null;
  equityRatio: number | null;
  // Liquidity
  currentRatio: number | null;
  quickRatio: number | null;
  workingCapital: number | null;
  // Efficiency
  assetTurnover: number | null;
  revenuePerEmployee: number | null;
  profitPerEmployee: number | null;
  // DuPont
  equityMultiplier: number | null;
}

export interface GrowthMetrics {
  year: number;
  revenueGrowth: number | null;
  netProfitGrowth: number | null;
  operatingProfitGrowth: number | null;
  assetGrowth: number | null;
  equityGrowth: number | null;
  employeeGrowth: number | null;
}

export interface CompanyFinancials {
  id: string;
  name: string;
  isReferenceCompany: boolean;
  annuals: AnnualFinancials[];
  ratios: FinancialRatios[];
  growth: GrowthMetrics[];
}

export interface FinancialDataset {
  sourceFileName: string;
  currency: string;
  years: number[];
  companies: CompanyFinancials[];
  parsedAt: string;
}

export type RatioThreshold = {
  good: number;
  moderate: number;
  direction: 'higher-better' | 'lower-better';
};

export interface FinancialScoreSubScore {
  name: string;
  value: number | null;
  score: number | null;
}

export interface FinancialScoreDimension {
  name: string;
  score: number | null;
  maxScore: 10;
  weight: number;
  subScores: FinancialScoreSubScore[];
}

export interface FinancialScoreResult {
  overall: number | null;
  dimensions: FinancialScoreDimension[];
  companyId: string;
  companyName: string;
  year: number;
}

export const RATIO_THRESHOLDS: Record<string, RatioThreshold> = {
  operatingMargin: { good: 10, moderate: 5, direction: 'higher-better' },
  netMargin: { good: 8, moderate: 3, direction: 'higher-better' },
  roe: { good: 15, moderate: 8, direction: 'higher-better' },
  roa: { good: 8, moderate: 3, direction: 'higher-better' },
  roic: { good: 12, moderate: 6, direction: 'higher-better' },
  debtToEquity: { good: 1, moderate: 2, direction: 'lower-better' },
  debtToAssets: { good: 0.4, moderate: 0.6, direction: 'lower-better' },
  equityRatio: { good: 0.5, moderate: 0.3, direction: 'higher-better' },
  currentRatio: { good: 1.5, moderate: 1.0, direction: 'higher-better' },
  quickRatio: { good: 1.0, moderate: 0.5, direction: 'higher-better' },
  assetTurnover: { good: 1.0, moderate: 0.5, direction: 'higher-better' },
};
