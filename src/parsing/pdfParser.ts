import * as pdfjsLib from 'pdfjs-dist';
import { AnnualFinancials, CompanyFinancials, FinancialDataset } from '../types/financial';
import { ParsingProgress, TextItem } from '../types/parsing';
import { matchLabel } from './fieldMappings';
import { normalizeDataset } from './normalizer';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tolerance in PDF points for grouping text items into the same row. */
const Y_TOLERANCE = 4;

/** Tolerance in PDF points for merging adjacent text items on the same row. */
const X_MERGE_GAP = 5;

/** The reference company that appears on every page (left side). */
const REFERENCE_COMPANY_PATTERN = /sw\s*umwelttechnik/i;

/** Years we expect in the data columns. */
const EXPECTED_YEARS = [2022, 2023, 2024];

// ---------------------------------------------------------------------------
// Number parsing
// ---------------------------------------------------------------------------

/**
 * Parses a Romanian-format number string.
 * - Periods are thousands separators ("43.180" → 43180)
 * - Returns null for empty, dash, percentage, or unparseable values
 */
function parseNumber(str: string): number | null {
  let s = str.trim();
  if (!s || s === '-' || s === '—' || s === '–') return null;

  // Skip percentage columns
  if (s.endsWith('%')) return null;

  // Handle negative values
  const negative = s.startsWith('-');
  if (negative) s = s.substring(1);

  // Handle parenthesized negatives: (1.234) → -1234
  if (s.startsWith('(') && s.endsWith(')')) {
    s = s.substring(1, s.length - 1);
  }

  // Remove dots (thousands separator)
  s = s.replace(/\./g, '');
  // Remove commas (just in case)
  s = s.replace(/,/g, '');
  // Remove any remaining whitespace
  s = s.replace(/\s/g, '');

  const num = parseInt(s, 10);
  if (isNaN(num)) return null;
  return negative ? -num : num;
}

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts text items from a single PDF page, normalizing coordinates so that
 * y increases downward (PDF native y goes upward).
 */
async function extractTextItems(page: pdfjsLib.PDFPageProxy): Promise<RawTextItem[]> {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1.0 });
  const pageHeight = viewport.height;

  const items: RawTextItem[] = [];

  for (const item of textContent.items) {
    // Skip non-text items (marked content, etc.)
    if (!('str' in item) || typeof item.str !== 'string') continue;
    const textItem = item as { str: string; transform: number[]; width: number; height: number };
    if (!textItem.str.trim()) continue;

    // transform is [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const x = textItem.transform[4];
    const yPdf = textItem.transform[5];
    // Flip y so it increases downward
    const y = pageHeight - yPdf;

    items.push({
      str: textItem.str,
      x,
      y,
      width: textItem.width,
      height: textItem.height,
    });
  }

  return items;
}

/**
 * Groups text items into rows based on y-coordinate proximity,
 * then merges adjacent items within each row and sorts by x.
 */
function groupIntoRows(items: RawTextItem[]): Array<{ y: number; items: TextItem[] }> {
  if (items.length === 0) return [];

  // Sort by y first
  const sorted = [...items].sort((a, b) => a.y - b.y);

  const rows: Array<{ y: number; items: RawTextItem[] }> = [];
  let currentRow: { y: number; items: RawTextItem[] } = {
    y: sorted[0].y,
    items: [sorted[0]],
  };

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - currentRow.y) <= Y_TOLERANCE) {
      currentRow.items.push(item);
      // Update row y to be the average for better grouping
    } else {
      rows.push(currentRow);
      currentRow = { y: item.y, items: [item] };
    }
  }
  rows.push(currentRow);

  // Sort items within each row by x, then merge adjacent items
  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    const merged = mergeAdjacentItems(row.items);
    return { y: row.y, items: merged };
  });
}

/**
 * Merges text items that are immediately adjacent on the same row
 * (gap < X_MERGE_GAP). This handles cases where pdfjs splits a single
 * logical text run into multiple items.
 */
function mergeAdjacentItems(items: RawTextItem[]): TextItem[] {
  if (items.length === 0) return [];

  const result: TextItem[] = [];
  let current: TextItem = { ...items[0] };

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const gap = item.x - (current.x + current.width);

    if (gap < X_MERGE_GAP) {
      // Merge: extend current item
      current.str += item.str;
      current.width = item.x + item.width - current.x;
      current.height = Math.max(current.height, item.height);
    } else {
      result.push(current);
      current = { ...item };
    }
  }
  result.push(current);

  return result;
}

// ---------------------------------------------------------------------------
// Page structure detection
// ---------------------------------------------------------------------------

type PageType = 'balance-sheet' | 'profit-loss' | 'unknown';

/**
 * Determines the page type by scanning for keywords in the text items.
 */
function detectPageType(items: RawTextItem[]): PageType {
  const fullText = items.map((i) => i.str).join(' ').toUpperCase();

  if (fullText.includes('BALANCE SHEET')) return 'balance-sheet';
  if (fullText.includes('PROFIT AND LOSS') || fullText.includes('PROFIT & LOSS'))
    return 'profit-loss';

  return 'unknown';
}

/**
 * Detects company names from header rows. Companies typically appear as
 * strings containing "SRL", "SA", or "SCS" in the upper portion of the page.
 */
function detectCompanyNames(
  rows: Array<{ y: number; items: TextItem[] }>
): { left: string; right: string } {
  let left = '';
  let right = '';

  // Only search the top portion of the page (first ~15 rows or y < 120)
  const headerRows = rows.filter((r) => r.y < 120);

  for (const row of headerRows) {
    for (const item of row.items) {
      const text = item.str.trim();
      if (!text) continue;

      // Look for company indicators
      const isCompanyName =
        /\b(SRL|S\.R\.L|SA|S\.A|SCS|S\.C\.S)\b/i.test(text) ||
        REFERENCE_COMPANY_PATTERN.test(text);

      if (isCompanyName) {
        // Determine if left or right based on x-position
        // Left company is typically x < 300, right company x > 300
        // (assuming standard A4 landscape or similar layout)
        const midPoint = 400; // Approximate midpoint
        if (item.x < midPoint && !left) {
          left = text;
        } else if (item.x >= midPoint && !right) {
          right = text;
        }
      }
    }
  }

  return { left, right };
}

// ---------------------------------------------------------------------------
// Column position detection
// ---------------------------------------------------------------------------

interface ColumnLayout {
  /** X-position centers for each of the 10 data columns */
  positions: number[];
  /**
   * Mapping from column index to: { side: 'left'|'right', year: number, type: 'value'|'delta' }
   * 10 columns: [2022L, 2023L, deltaL1, 2024L, deltaL2, 2022R, 2023R, deltaR1, 2024R, deltaR2]
   */
}

/**
 * Attempts to detect column positions from the header row containing year labels.
 * Looks for rows containing "2022", "2023", "2024" (or similar year numbers).
 */
function detectColumnPositions(
  rows: Array<{ y: number; items: TextItem[] }>
): number[] {
  // Look for rows containing year numbers
  for (const row of rows) {
    const yearItems = row.items.filter((item) => {
      const s = item.str.trim();
      return /^20\d{2}$/.test(s);
    });

    if (yearItems.length >= 4) {
      // Found a header row with year labels - collect ALL numeric column positions
      // from this row and nearby rows
      const allPositions: number[] = [];

      for (const item of row.items) {
        const s = item.str.trim();
        if (/^20\d{2}$/.test(s) || s.includes('∆') || s.includes('Δ')) {
          allPositions.push(item.x + item.width / 2);
        }
      }

      if (allPositions.length >= 6) {
        allPositions.sort((a, b) => a - b);
        return allPositions;
      }

      // Fallback: just use year item positions
      const positions = yearItems.map((i) => i.x + i.width / 2).sort((a, b) => a - b);
      return positions;
    }
  }

  return [];
}

/**
 * Maps a data column index to a year and side, skipping delta columns.
 * Layout: [2022L, 2023L, delta, 2024L, delta, 2022R, 2023R, delta, 2024R, delta]
 * Indices:    0       1     2      3      4      5       6     7      8      9
 */
interface ColumnMapping {
  side: 'left' | 'right';
  year: number;
  isDelta: boolean;
}

const COLUMN_MAP: ColumnMapping[] = [
  { side: 'left', year: 2022, isDelta: false },
  { side: 'left', year: 2023, isDelta: false },
  { side: 'left', year: 0, isDelta: true },
  { side: 'left', year: 2024, isDelta: false },
  { side: 'left', year: 0, isDelta: true },
  { side: 'right', year: 2022, isDelta: false },
  { side: 'right', year: 2023, isDelta: false },
  { side: 'right', year: 0, isDelta: true },
  { side: 'right', year: 2024, isDelta: false },
  { side: 'right', year: 0, isDelta: true },
];

// ---------------------------------------------------------------------------
// Data extraction from rows
// ---------------------------------------------------------------------------

interface ExtractedValue {
  fieldName: string;
  side: 'left' | 'right';
  year: number;
  value: number;
}

/**
 * Assigns a numeric value to the closest column based on x-position.
 */
function findClosestColumn(x: number, columnPositions: number[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < columnPositions.length; i++) {
    const dist = Math.abs(x - columnPositions[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Extracts financial data values from the rows of a parsed page.
 */
function extractDataFromRows(
  rows: Array<{ y: number; items: TextItem[] }>,
  columnPositions: number[],
  pageType: PageType = 'unknown'
): ExtractedValue[] {
  const results: ExtractedValue[] = [];

  if (columnPositions.length === 0) return results;

  for (const row of rows) {
    if (row.items.length === 0) continue;

    // Build the label from the leftmost items (those before the first data column)
    const firstColX = columnPositions[0] - 30; // Some margin before the first column
    const labelItems = row.items.filter((item) => item.x < firstColX);
    const dataItems = row.items.filter((item) => item.x >= firstColX);

    if (labelItems.length === 0 || dataItems.length === 0) continue;

    const labelText = labelItems.map((i) => i.str).join(' ').trim();
    const fieldName = matchLabel(labelText, pageType);

    if (!fieldName) continue;

    // Process each data item
    for (const item of dataItems) {
      const value = parseNumber(item.str);
      if (value === null) continue;

      const colIdx = findClosestColumn(item.x + item.width / 2, columnPositions);

      if (colIdx >= 0 && colIdx < COLUMN_MAP.length) {
        const mapping = COLUMN_MAP[colIdx];
        if (mapping.isDelta) continue; // Skip delta/percentage columns

        results.push({
          fieldName,
          side: mapping.side,
          year: mapping.year,
          value,
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Building the financial dataset
// ---------------------------------------------------------------------------

/** Intermediate storage for parsed data keyed by company name. */
interface CompanyDataAccumulator {
  [companyName: string]: {
    [year: number]: Partial<Record<string, number | null>>;
  };
}

/**
 * Creates a blank AnnualFinancials object for a given year.
 */
function createBlankAnnual(year: number): AnnualFinancials {
  return {
    year,
    turnover: null,
    operatingProfit: null,
    netProfit: null,
    grossProfit: null,
    totalAssets: null,
    fixedAssets: null,
    currentAssets: null,
    stocks: null,
    receivables: null,
    cashAndEquivalents: null,
    ownCapital: null,
    totalDebts: null,
    shortTermDebts: null,
    longTermDebts: null,
    tradeReceivables: null,
    tradePayables: null,
    creditInstitutionsShortTerm: null,
    creditInstitutionsLongTerm: null,
    employeeCount: null,
    depreciation: null,
  };
}

/**
 * Normalizes a company name for use as a unique key.
 */
function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Determines if a company name matches the reference company (SW Umwelttechnik Romania).
 */
function isReferenceCompany(name: string): boolean {
  return REFERENCE_COMPANY_PATTERN.test(name);
}

/**
 * Builds the final FinancialDataset from accumulated company data.
 */
function buildDataset(
  accumulator: CompanyDataAccumulator,
  sourceFileName: string
): FinancialDataset {
  const companies: CompanyFinancials[] = [];

  for (const [companyName, yearData] of Object.entries(accumulator)) {
    const annuals: AnnualFinancials[] = EXPECTED_YEARS.map((year) => {
      const data = yearData[year] || {};
      const annual = createBlankAnnual(year);

      // Map accumulated data onto the AnnualFinancials structure
      const fieldKeys = Object.keys(annual) as Array<keyof AnnualFinancials>;
      for (const key of fieldKeys) {
        if (key === 'year') continue;
        if (data[key] !== undefined && data[key] !== null) {
          (annual as unknown as Record<string, number | null>)[key] = data[key] as number;
        }
      }

      // Handle profit/loss: if we have operatingLoss but not operatingProfit, negate it
      if (annual.operatingProfit === null && data['operatingLoss'] != null) {
        annual.operatingProfit = -(data['operatingLoss'] as number);
      }
      if (annual.grossProfit === null && data['grossLoss'] != null) {
        annual.grossProfit = -(data['grossLoss'] as number);
      }
      if (annual.netProfit === null && data['netLoss'] != null) {
        annual.netProfit = -(data['netLoss'] as number);
      }

      // Calculate derived fields
      if (annual.fixedAssets !== null && annual.currentAssets !== null) {
        annual.totalAssets = annual.fixedAssets + annual.currentAssets;
      }
      if (annual.shortTermDebts !== null && annual.longTermDebts !== null) {
        annual.totalDebts = annual.shortTermDebts + annual.longTermDebts;
      } else if (annual.shortTermDebts !== null) {
        annual.totalDebts = annual.shortTermDebts;
      } else if (annual.longTermDebts !== null) {
        annual.totalDebts = annual.longTermDebts;
      }

      return annual;
    });

    companies.push({
      id: normalizeCompanyName(companyName).replace(/[^A-Z0-9]/g, '_'),
      name: companyName.trim(),
      isReferenceCompany: isReferenceCompany(companyName),
      annuals,
      ratios: [],   // Calculated later by the calculations layer
      growth: [],   // Calculated later by the calculations layer
    });
  }

  // Sort: reference company first, then alphabetically
  companies.sort((a, b) => {
    if (a.isReferenceCompany && !b.isReferenceCompany) return -1;
    if (!a.isReferenceCompany && b.isReferenceCompany) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    sourceFileName,
    currency: 'T RON',
    years: EXPECTED_YEARS,
    companies,
    parsedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parses a PDF file containing Romanian financial statements with side-by-side
 * company comparisons. Extracts balance sheet and P&L data for all companies
 * across multiple years.
 *
 * @param file - The PDF File object to parse
 * @param onProgress - Callback for reporting parsing progress
 * @returns A FinancialDataset containing all extracted company financials
 */
export async function parsePDF(
  file: File,
  onProgress: (progress: Partial<ParsingProgress>) => void
): Promise<FinancialDataset> {
  onProgress({
    stage: 'reading',
    message: 'Reading PDF file...',
    currentPage: 0,
    totalPages: 0,
    companiesFound: 0,
  });

  // Load the PDF
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  onProgress({
    stage: 'extracting',
    message: `Extracting data from ${totalPages} pages...`,
    totalPages,
  });

  const accumulator: CompanyDataAccumulator = {};
  const knownCompanies = new Set<string>();

  // Process each page (skip page 1 - title page)
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress({
      currentPage: pageNum,
      message: `Processing page ${pageNum} of ${totalPages}...`,
    });

    const page = await pdf.getPage(pageNum);
    const rawItems = await extractTextItems(page);

    if (rawItems.length === 0) continue;

    // Detect page type
    const pageType = detectPageType(rawItems);
    if (pageType === 'unknown' && pageNum === 1) {
      // Skip title page
      continue;
    }

    // Group into rows
    const rows = groupIntoRows(rawItems);

    // Detect company names
    const { left: leftCompany, right: rightCompany } = detectCompanyNames(rows);

    if (leftCompany) knownCompanies.add(leftCompany);
    if (rightCompany) knownCompanies.add(rightCompany);

    // Detect column positions
    const columnPositions = detectColumnPositions(rows);

    if (columnPositions.length < 4) {
      // Not enough columns detected, skip this page
      continue;
    }

    // Extract data values (pass pageType for section-aware label matching)
    const values = extractDataFromRows(rows, columnPositions, pageType);

    // Accumulate values into the company data structure
    for (const val of values) {
      const companyName = val.side === 'left' ? leftCompany : rightCompany;
      if (!companyName) continue;

      if (!accumulator[companyName]) {
        accumulator[companyName] = {};
      }
      if (!accumulator[companyName][val.year]) {
        accumulator[companyName][val.year] = {};
      }

      // Fields where the first (short-term/D-section) occurrence is correct —
      // "4. Trade payables" appears in both D and G sections; keep the first value.
      const KEEP_FIRST_VALUE = new Set(['tradePayables']);

      if (KEEP_FIRST_VALUE.has(val.fieldName) && accumulator[companyName][val.year][val.fieldName] != null) {
        // Already have a value for this field — don't overwrite
        continue;
      }

      // Store the value (later values on the same field overwrite earlier ones,
      // which handles the "A. FIXED ASSETS TOTAL" overriding "II. FIXED ASSETS")
      accumulator[companyName][val.year][val.fieldName] = val.value;
    }

    onProgress({
      companiesFound: knownCompanies.size,
    });
  }

  onProgress({
    stage: 'mapping',
    message: 'Building financial dataset...',
  });

  // Build the final dataset
  const rawDataset = buildDataset(accumulator, file.name);
  const dataset = normalizeDataset(rawDataset.companies, file.name, rawDataset.currency);

  onProgress({
    stage: 'done',
    message: `Parsed ${dataset.companies.length} companies across ${EXPECTED_YEARS.length} years.`,
    companiesFound: dataset.companies.length,
  });

  return dataset;
}
