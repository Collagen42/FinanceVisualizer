/**
 * Field mappings from English accounting labels (as found in Romanian financial statements)
 * to standardized field names matching the AnnualFinancials interface.
 */

export const fieldMappings: Record<string, string> = {
  // Balance Sheet - Assets
  'I. INTANGIBLE FIXED ASSETS': 'intangibleFixedAssets',
  'II.FIXED ASSETS': 'fixedAssets',
  'II. FIXED ASSETS': 'fixedAssets',
  'III. FINANCIAL ASSETS': 'financialAssets',
  'A. FIXED ASSETS TOTAL': 'fixedAssets',
  'I. STOCKS': 'stocks',
  'II. RECEIVABLES': 'receivables',
  'III. SHORT-TERM FINANCIAL INVESTMENTS': 'shortTermInvestments',
  'IV. CASH AND BANK ACCOUNTS': 'cashAndEquivalents',
  'B. CURRENT ASSETS': 'currentAssets',

  // Balance Sheet - Liabilities & Equity
  'D. DEBTS TO BE PAID IN A PERIOD OF ONE YEAR': 'shortTermDebts',
  'G. DEBTS TO BE PAID IN A PERIOD > 1 YEAR': 'longTermDebts',
  'H. PROVISIONS FOR RISKS AND EXPENSES': 'provisions',
  'OWN CAPITAL - TOTAL': 'ownCapital',
  'CAPITAL AND RESERVES': 'capitalAndReserves',

  // Profit & Loss
  '1. Turnover': 'turnover',
  'OPERATING INCOME - TOTAL': 'operatingIncome',
  'OPERATING EXPENSES - TOTAL': 'operatingExpenses',
  'Operating profit': 'operatingProfit',
  'Operating loss': 'operatingLoss',
  '6. Staff costs': 'staffCosts',
  '7. a) Adjustments regarding tangible and intangible assets': 'depreciation',
  'TOTAL INCOME': 'totalIncome',
  'TOTAL EXPENSES': 'totalExpenses',
  'GROSS PROFIT': 'grossProfit',
  'GROSS LOSS': 'grossLoss',
  'NET PROFIT': 'netProfit',
  'NET LOSS': 'netLoss',
  'Average number of employees': 'employeeCount',
};

/**
 * Normalizes a string for comparison: trims, collapses whitespace, lowercases.
 */
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Pre-compute normalized labels for efficient matching
const normalizedMappings: Array<{ normalized: string; fieldName: string }> =
  Object.entries(fieldMappings).map(([label, fieldName]) => ({
    normalized: normalize(label),
    fieldName,
  }));

/**
 * Matches a text string against known accounting labels (case-insensitive,
 * whitespace-normalized). Returns the standardized field name or null if no match.
 *
 * Tries exact match first, then checks if any known label is contained within
 * the text (to handle cases where PDF extraction adds extra characters).
 */
export function matchLabel(text: string): string | null {
  const normalizedText = normalize(text);

  if (!normalizedText) return null;

  // Exact match (after normalization)
  for (const { normalized, fieldName } of normalizedMappings) {
    if (normalizedText === normalized) {
      return fieldName;
    }
  }

  // Check if any known label is contained in the text (handles extra whitespace, prefixes, etc.)
  // We prefer longer matches to avoid false positives (e.g., "I. STOCKS" matching before "I. INTANGIBLE...")
  let bestMatch: { fieldName: string; length: number } | null = null;

  for (const { normalized, fieldName } of normalizedMappings) {
    if (normalizedText.includes(normalized)) {
      if (!bestMatch || normalized.length > bestMatch.length) {
        bestMatch = { fieldName, length: normalized.length };
      }
    }
  }

  if (bestMatch) {
    return bestMatch.fieldName;
  }

  // Check if the text starts with any known label
  for (const { normalized, fieldName } of normalizedMappings) {
    if (normalizedText.startsWith(normalized)) {
      return fieldName;
    }
  }

  return null;
}
