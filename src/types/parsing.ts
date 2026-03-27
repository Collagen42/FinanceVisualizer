export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedRow {
  y: number;
  items: TextItem[];
  label: string;
  values: string[];
}

export interface ParsedPage {
  pageNumber: number;
  pageType: 'balance-sheet' | 'profit-loss' | 'unknown';
  companyLeft: string;
  companyRight: string;
  rows: ParsedRow[];
}

export interface ParsingProgress {
  stage: 'idle' | 'reading' | 'extracting' | 'mapping' | 'calculating' | 'done' | 'error';
  currentPage: number;
  totalPages: number;
  companiesFound: number;
  message: string;
}
