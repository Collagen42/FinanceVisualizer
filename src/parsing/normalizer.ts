import { CompanyFinancials, FinancialDataset, AnnualFinancials } from '../types/financial';
import { calculateRatios } from '../calculations/ratios';
import { calculateGrowth } from '../calculations/trends';

/**
 * Returns an AnnualFinancials object with all fields set to null except the year.
 */
export function createEmptyAnnual(year: number): AnnualFinancials {
  return {
    year,
    // Income Statement
    turnover: null,
    operatingProfit: null,
    netProfit: null,
    grossProfit: null,
    // Balance Sheet - Assets
    totalAssets: null,
    fixedAssets: null,
    currentAssets: null,
    stocks: null,
    receivables: null,
    cashAndEquivalents: null,
    // Balance Sheet - Liabilities & Equity
    ownCapital: null,
    totalDebts: null,
    shortTermDebts: null,
    longTermDebts: null,
    // Other
    employeeCount: null,
    depreciation: null,
  };
}

/**
 * For each annual entry, derive totalAssets and totalDebts from sub-components
 * if they are not already set.
 */
function fillDerivedTotals(annual: AnnualFinancials): void {
  if (annual.totalAssets === null && annual.fixedAssets !== null && annual.currentAssets !== null) {
    annual.totalAssets = annual.fixedAssets + annual.currentAssets;
  }
  if (annual.totalDebts === null && annual.shortTermDebts !== null && annual.longTermDebts !== null) {
    annual.totalDebts = annual.shortTermDebts + annual.longTermDebts;
  }
}

/**
 * Takes raw parsed company data and produces a complete FinancialDataset.
 *
 * For each company:
 * 1. Sorts annuals by year (ascending)
 * 2. Fills in derived totals (totalAssets, totalDebts) if sub-components are present
 * 3. Calculates financial ratios for each annual
 * 4. Calculates year-over-year growth metrics
 *
 * Then determines the unique set of years across all companies and assembles
 * the final FinancialDataset with metadata.
 */
export function normalizeDataset(
  companies: CompanyFinancials[],
  sourceFileName: string,
  currency?: string
): FinancialDataset {
  const allYears = new Set<number>();

  const normalizedCompanies = companies.map((company) => {
    // Sort annuals by year ascending
    const sortedAnnuals = [...company.annuals].sort((a, b) => a.year - b.year);

    // Fill derived totals
    for (const annual of sortedAnnuals) {
      fillDerivedTotals(annual);
    }

    // Calculate ratios for each annual
    const ratios = sortedAnnuals.map((annual) => calculateRatios(annual));

    // Calculate year-over-year growth metrics
    const growth = calculateGrowth(sortedAnnuals);

    // Collect years
    for (const annual of sortedAnnuals) {
      allYears.add(annual.year);
    }

    return {
      ...company,
      annuals: sortedAnnuals,
      ratios,
      growth,
    };
  });

  // Build sorted unique years array
  const years = Array.from(allYears).sort((a, b) => a - b);

  return {
    sourceFileName,
    currency: currency ?? 'RON',
    years,
    companies: normalizedCompanies,
    parsedAt: new Date().toISOString(),
  };
}
