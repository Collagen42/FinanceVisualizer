/**
 * Field mappings from English accounting labels (as found in Romanian financial statements)
 * to standardized field names matching the AnnualFinancials interface.
 *
 * Each mapping is tagged with a pageType ('balance-sheet' | 'profit-loss' | 'any')
 * to prevent cross-section conflicts (e.g., "1. Trade receivables" vs "1. Turnover").
 */

type PageType = 'balance-sheet' | 'profit-loss' | 'any';

interface FieldMapping {
  label: string;
  fieldName: string;
  pageType: PageType;
}

const fieldMappingsList: FieldMapping[] = [
  // Balance Sheet - Assets
  { label: 'I. INTANGIBLE FIXED ASSETS', fieldName: 'intangibleFixedAssets', pageType: 'balance-sheet' },
  { label: 'II.FIXED ASSETS', fieldName: 'fixedAssets', pageType: 'balance-sheet' },
  { label: 'II. FIXED ASSETS', fieldName: 'fixedAssets', pageType: 'balance-sheet' },
  { label: 'III. FINANCIAL ASSETS', fieldName: 'financialAssets', pageType: 'balance-sheet' },
  { label: 'A. FIXED ASSETS TOTAL', fieldName: 'fixedAssets', pageType: 'balance-sheet' },
  { label: 'I. STOCKS', fieldName: 'stocks', pageType: 'balance-sheet' },
  { label: 'II. RECEIVABLES', fieldName: 'receivables', pageType: 'balance-sheet' },
  { label: '1. Trade receivables', fieldName: 'tradeReceivables', pageType: 'balance-sheet' },
  { label: 'Trade receivables', fieldName: 'tradeReceivables', pageType: 'balance-sheet' },
  { label: 'III. SHORT-TERM FINANCIAL INVESTMENTS', fieldName: 'shortTermInvestments', pageType: 'balance-sheet' },
  { label: 'IV. CASH AND BANK ACCOUNTS', fieldName: 'cashAndEquivalents', pageType: 'balance-sheet' },
  { label: 'B. CURRENT ASSETS', fieldName: 'currentAssets', pageType: 'balance-sheet' },

  // Balance Sheet - Liabilities & Equity
  { label: 'D. DEBTS TO BE PAID IN A PERIOD OF ONE YEAR', fieldName: 'shortTermDebts', pageType: 'balance-sheet' },
  { label: '4. Trade payables', fieldName: 'tradePayables', pageType: 'balance-sheet' },
  { label: 'Trade payables', fieldName: 'tradePayables', pageType: 'balance-sheet' },
  { label: '2. Amounts owed to credit institutions < 1 year', fieldName: 'creditInstitutionsShortTerm', pageType: 'balance-sheet' },
  { label: 'Amounts owed to credit institutions < 1 year', fieldName: 'creditInstitutionsShortTerm', pageType: 'balance-sheet' },
  { label: 'G. DEBTS TO BE PAID IN A PERIOD > 1 YEAR', fieldName: 'longTermDebts', pageType: 'balance-sheet' },
  { label: '2. Amounts owed to credit institutions > 1 year', fieldName: 'creditInstitutionsLongTerm', pageType: 'balance-sheet' },
  { label: 'Amounts owed to credit institutions > 1 year', fieldName: 'creditInstitutionsLongTerm', pageType: 'balance-sheet' },
  { label: 'H. PROVISIONS FOR RISKS AND EXPENSES', fieldName: 'provisions', pageType: 'balance-sheet' },
  { label: 'OWN CAPITAL - TOTAL', fieldName: 'ownCapital', pageType: 'balance-sheet' },
  { label: 'CAPITAL AND RESERVES', fieldName: 'capitalAndReserves', pageType: 'balance-sheet' },

  // Profit & Loss
  { label: '1. Turnover', fieldName: 'turnover', pageType: 'profit-loss' },
  { label: 'OPERATING INCOME - TOTAL', fieldName: 'operatingIncome', pageType: 'profit-loss' },
  { label: 'OPERATING EXPENSES - TOTAL', fieldName: 'operatingExpenses', pageType: 'profit-loss' },
  { label: 'Operating profit', fieldName: 'operatingProfit', pageType: 'profit-loss' },
  { label: 'Operating loss', fieldName: 'operatingLoss', pageType: 'profit-loss' },
  { label: '6. Staff costs', fieldName: 'staffCosts', pageType: 'profit-loss' },
  { label: '7. a) Adjustments regarding tangible and intangible assets', fieldName: 'depreciation', pageType: 'profit-loss' },
  { label: 'TOTAL INCOME', fieldName: 'totalIncome', pageType: 'profit-loss' },
  { label: 'TOTAL EXPENSES', fieldName: 'totalExpenses', pageType: 'profit-loss' },
  { label: 'GROSS PROFIT', fieldName: 'grossProfit', pageType: 'profit-loss' },
  { label: 'GROSS LOSS', fieldName: 'grossLoss', pageType: 'profit-loss' },
  { label: 'NET PROFIT', fieldName: 'netProfit', pageType: 'profit-loss' },
  { label: 'NET LOSS', fieldName: 'netLoss', pageType: 'profit-loss' },
  { label: 'Average number of employees', fieldName: 'employeeCount', pageType: 'profit-loss' },
];

// Legacy export for backward compatibility
export const fieldMappings: Record<string, string> = {};
for (const m of fieldMappingsList) {
  fieldMappings[m.label] = m.fieldName;
}

/**
 * Normalizes a string for comparison: trims, collapses whitespace, lowercases.
 */
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Pre-compute normalized labels for efficient matching
const normalizedMappings: Array<{ normalized: string; fieldName: string; pageType: PageType }> =
  fieldMappingsList.map((m) => ({
    normalized: normalize(m.label),
    fieldName: m.fieldName,
    pageType: m.pageType,
  }));

/**
 * Matches a text string against known accounting labels (case-insensitive,
 * whitespace-normalized). Returns the standardized field name or null if no match.
 *
 * When pageType is provided, only mappings tagged with that pageType (or 'any') are considered.
 * This prevents cross-section conflicts (e.g., "1. Trade receivables" vs "1. Turnover").
 */
export function matchLabel(text: string, pageType?: 'balance-sheet' | 'profit-loss' | 'unknown'): string | null {
  const normalizedText = normalize(text);

  if (!normalizedText) return null;

  // Filter mappings by page type if provided
  const applicableMappings = pageType && pageType !== 'unknown'
    ? normalizedMappings.filter(m => m.pageType === pageType || m.pageType === 'any')
    : normalizedMappings;

  // Exact match (after normalization)
  for (const { normalized, fieldName } of applicableMappings) {
    if (normalizedText === normalized) {
      return fieldName;
    }
  }

  // Check if any known label is contained in the text (handles extra whitespace, prefixes, etc.)
  // We prefer longer matches to avoid false positives (e.g., "I. STOCKS" matching before "I. INTANGIBLE...")
  let bestMatch: { fieldName: string; length: number } | null = null;

  for (const { normalized, fieldName } of applicableMappings) {
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
  for (const { normalized, fieldName } of applicableMappings) {
    if (normalizedText.startsWith(normalized)) {
      return fieldName;
    }
  }

  return null;
}
