import * as XLSX from 'xlsx';
import { CompanyFinancials, FinancialDataset, AnnualFinancials } from '../types/financial';
import { ParsingProgress } from '../types/parsing';
import { matchLabel } from './fieldMappings';
import { normalizeDataset } from './normalizer';
import { createEmptyAnnual } from './normalizer';

/**
 * Checks whether a value looks like a 4-digit year header (e.g. 2020-2030).
 */
function isYearHeader(value: unknown): value is number {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 2000 && value <= 2099;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^\d{4}$/.test(trimmed) && parseInt(trimmed, 10) >= 2000 && parseInt(trimmed, 10) <= 2099;
  }
  return false;
}

/**
 * Attempts to parse a cell value as a number. Handles string representations
 * with thousands separators, parenthesized negatives, and dash placeholders.
 */
function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Dash or empty placeholder
    if (trimmed === '-' || trimmed === '--' || trimmed === 'n/a' || trimmed === 'N/A') {
      return null;
    }

    // Handle parenthesized negatives: (1,234) -> -1234
    const isNegative = trimmed.startsWith('(') && trimmed.endsWith(')');
    let cleaned = isNegative ? trimmed.slice(1, -1) : trimmed;

    // Remove thousands separators (commas and spaces) and currency symbols
    cleaned = cleaned.replace(/[,\s]/g, '').replace(/[A-Za-z$\u20AC\u00A3]/g, '');

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;

    return isNegative ? -parsed : parsed;
  }

  return null;
}

/**
 * Detects year columns in a worksheet. Scans the first few rows for cells
 * containing 4-digit year values and returns a mapping of column index to year.
 */
function detectYearColumns(
  sheet: XLSX.WorkSheet
): { yearColumns: Map<number, number>; headerRow: number } | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const maxScanRows = Math.min(range.e.r, 5); // scan first 6 rows

  for (let r = range.s.r; r <= maxScanRows; r++) {
    const yearColumns = new Map<number, number>();

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (!cell) continue;

      const val = cell.v;
      if (isYearHeader(val)) {
        const year = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
        yearColumns.set(c, year);
      }
    }

    // Need at least one year to consider this a valid header row
    if (yearColumns.size >= 1) {
      return { yearColumns, headerRow: r };
    }
  }

  return null;
}

/**
 * Attempts to extract a company name from the sheet. Checks:
 * 1. The sheet name itself (if descriptive)
 * 2. Content above the year header row
 * 3. Merged cells at the top of the sheet
 */
function detectCompanyName(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  headerRow: number
): string {
  // Check rows above the header for a company name
  for (let r = 0; r < headerRow; r++) {
    const cellAddress = XLSX.utils.encode_cell({ r, c: 0 });
    const cell = sheet[cellAddress];
    if (cell && typeof cell.v === 'string') {
      const text = cell.v.trim();
      // Use it if it looks like a company name (not a year, not a known label)
      if (text.length > 2 && !isYearHeader(text) && !matchLabel(text)) {
        return text;
      }
    }
  }

  // Fall back to sheet name if it's not a generic name
  const genericNames = ['sheet1', 'sheet2', 'sheet3', 'data', 'fisa'];
  if (!genericNames.includes(sheetName.toLowerCase())) {
    return sheetName;
  }

  return 'Unknown Company';
}

/**
 * Parses a single worksheet into a CompanyFinancials object.
 * Returns null if the sheet doesn't contain recognizable financial data.
 */
function parseSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  companyIndex: number
): CompanyFinancials | null {
  const detected = detectYearColumns(sheet);
  if (!detected) return null;

  const { yearColumns, headerRow } = detected;
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');

  // Create annual objects for each detected year
  const annualsByYear = new Map<number, AnnualFinancials>();
  for (const year of yearColumns.values()) {
    annualsByYear.set(year, createEmptyAnnual(year));
  }

  // Track how many fields we successfully matched
  let matchedFields = 0;

  // Iterate over rows below the header
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Get the label from the first column (or first non-empty column before year columns)
    let labelText = '';
    const minYearCol = Math.min(...yearColumns.keys());

    for (let c = range.s.c; c < minYearCol; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const cellText = String(cell.v).trim();
        if (cellText) {
          labelText += (labelText ? ' ' : '') + cellText;
        }
      }
    }

    // If no label found in columns before year columns, try column A
    if (!labelText) {
      const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cellA && cellA.v !== undefined) {
        labelText = String(cellA.v).trim();
      }
    }

    if (!labelText) continue;

    const fieldName = matchLabel(labelText);
    if (!fieldName) continue;

    matchedFields++;

    // Extract values for each year column
    for (const [colIndex, year] of yearColumns.entries()) {
      const cellAddress = XLSX.utils.encode_cell({ r, c: colIndex });
      const cell = sheet[cellAddress];
      const numericValue = cell ? parseNumericValue(cell.v) : null;

      if (numericValue === null) continue;

      const annual = annualsByYear.get(year);
      if (!annual) continue;

      // Map field name to the AnnualFinancials property
      switch (fieldName) {
        case 'turnover':
          annual.turnover = numericValue;
          break;
        case 'operatingProfit':
          annual.operatingProfit = numericValue;
          break;
        case 'operatingLoss':
          annual.operatingProfit = -Math.abs(numericValue);
          break;
        case 'netProfit':
          annual.netProfit = numericValue;
          break;
        case 'netLoss':
          annual.netProfit = -Math.abs(numericValue);
          break;
        case 'grossProfit':
          annual.grossProfit = numericValue;
          break;
        case 'grossLoss':
          annual.grossProfit = -Math.abs(numericValue);
          break;
        case 'totalAssets':
          annual.totalAssets = numericValue;
          break;
        case 'fixedAssets':
          annual.fixedAssets = numericValue;
          break;
        case 'currentAssets':
          annual.currentAssets = numericValue;
          break;
        case 'stocks':
          annual.stocks = numericValue;
          break;
        case 'receivables':
          annual.receivables = numericValue;
          break;
        case 'cashAndEquivalents':
          annual.cashAndEquivalents = numericValue;
          break;
        case 'ownCapital':
          annual.ownCapital = numericValue;
          break;
        case 'totalDebts':
          annual.totalDebts = numericValue;
          break;
        case 'shortTermDebts':
          annual.shortTermDebts = numericValue;
          break;
        case 'longTermDebts':
          annual.longTermDebts = numericValue;
          break;
        case 'employeeCount':
          annual.employeeCount = numericValue;
          break;
        case 'depreciation':
          annual.depreciation = numericValue;
          break;
        // Fields that exist in mappings but not in AnnualFinancials are silently ignored
        default:
          break;
      }
    }
  }

  // If we didn't match any fields, this sheet doesn't contain recognizable data
  if (matchedFields === 0) return null;

  const companyName = detectCompanyName(sheet, sheetName, headerRow);

  return {
    id: `company-${companyIndex}`,
    name: companyName,
    isReferenceCompany: companyIndex === 0,
    annuals: Array.from(annualsByYear.values()),
    ratios: [],
    growth: [],
  };
}

/**
 * Parses an XLSX file containing financial data and returns a FinancialDataset.
 *
 * The parser handles:
 * - Single or multiple worksheets, each potentially representing a different company
 * - Year headers in the first few rows
 * - Accounting labels matched against known Romanian financial statement fields
 * - Numeric values with various formatting (thousands separators, parenthesized negatives)
 *
 * @param file - The XLSX file to parse
 * @param onProgress - Callback to report parsing progress
 * @returns A complete FinancialDataset with ratios and growth metrics calculated
 * @throws Error if no recognizable financial data is found
 */
export async function parseXLSX(
  file: File,
  onProgress: (progress: Partial<ParsingProgress>) => void
): Promise<FinancialDataset> {
  onProgress({
    stage: 'reading',
    message: 'Reading XLSX file...',
    currentPage: 0,
    totalPages: 0,
  });

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  onProgress({
    stage: 'extracting',
    message: 'Parsing workbook structure...',
  });

  // Parse the workbook
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const totalSheets = workbook.SheetNames.length;

  if (totalSheets === 0) {
    throw new Error('The XLSX file contains no worksheets.');
  }

  onProgress({
    totalPages: totalSheets,
    message: `Found ${totalSheets} worksheet(s). Analyzing...`,
  });

  const companies: CompanyFinancials[] = [];
  let companyIndex = 0;

  // Iterate through all worksheets
  for (let i = 0; i < totalSheets; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];

    onProgress({
      stage: 'mapping',
      currentPage: i + 1,
      message: `Processing sheet "${sheetName}" (${i + 1}/${totalSheets})...`,
    });

    const company = parseSheet(sheet, sheetName, companyIndex);
    if (company) {
      companies.push(company);
      companyIndex++;
    }
  }

  if (companies.length === 0) {
    throw new Error(
      'Could not detect any financial data in the XLSX file. ' +
      'Please ensure the file contains:\n' +
      '- Year headers (e.g. 2022, 2023, 2024) in one of the first rows\n' +
      '- Standard accounting labels (e.g. "Turnover", "NET PROFIT", "B. CURRENT ASSETS") in column A\n' +
      '- Numeric values in the year columns'
    );
  }

  onProgress({
    stage: 'calculating',
    companiesFound: companies.length,
    message: `Found ${companies.length} company/companies. Calculating ratios...`,
  });

  // Normalize the dataset (sort, fill derived totals, calculate ratios & growth)
  const dataset = normalizeDataset(companies, file.name);

  onProgress({
    stage: 'done',
    companiesFound: dataset.companies.length,
    message: `Successfully parsed ${dataset.companies.length} company/companies across ${dataset.years.length} years.`,
  });

  return dataset;
}
