import { CompanyFinancials, AnnualFinancials } from '../types/financial';

/**
 * Competitor overview KPIs per company per year, matching the reference table structure.
 * All "Mio RON" values are in millions (T RON / 1000).
 */
export interface CompetitorYearData {
  year: number;
  // Section 1: Income Statement
  umsatz: number | null;              // Revenue in Mio RON
  umsatzChange: number | null;        // Revenue change % vs prior year
  ebitda: number | null;              // EBITDA in Mio RON
  ebitdaPctUms: number | null;        // EBITDA as % of Revenue
  egt: number | null;                 // EGT (pre-tax profit) in Mio RON
  egtPctUms: number | null;           // EGT as % of Revenue
  // Section 2: Balance Sheet
  eigenkapital: number | null;        // Equity in Mio RON
  eigenkapitalQuote: number | null;   // Equity ratio %
  investition: number | null;         // Net investment in Mio RON
  investitionPctUms: number | null;
  sachanlagen: number | null;         // Fixed assets in Mio RON
  sachanlagenPctUms: number | null;
  vorraete: number | null;            // Stocks in Mio RON
  vorraetePctUms: number | null;
  kunden: number | null;              // Trade receivables in Mio RON
  lieferanten: number | null;         // Trade payables in Mio RON
  workingCapitalPct: number | null;   // Working capital as % of revenue
  // Section 3: Balance Sheet Totals
  bilanzsumme: number | null;         // Total assets in Mio RON
  bilanzsummePctUms: number | null;
  egtBs: number | null;              // EGT / Total assets %
  // Section 4: Debt & Valuation
  netDebts: number | null;           // Net debts in Mio RON
  sdLeverage: number | null;         // net debts / EBITDA (years)
  ev: number | null;                 // Enterprise value (EBITDA×5 - net debts)
  evPctUms: number | null;
  vienneseMethod: number | null;     // (EV + EK) / 2
  vienneseMethodPctUms: number | null;
}

export interface CompetitorCompanyData {
  companyId: string;
  companyName: string;
  isReference: boolean;
  years: CompetitorYearData[];
}

function toMio(val: number | null | undefined): number | null {
  if (val == null || isNaN(val)) return null;
  return val / 1000;
}

function pctChange(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null || prior === 0) return null;
  return ((current / prior) - 1) * 100;
}

function pctOf(value: number | null, base: number | null): number | null {
  if (value == null || base == null || base === 0) return null;
  return (value / base) * 100;
}

function getAnnual(company: CompanyFinancials, year: number): AnnualFinancials | undefined {
  return company.annuals.find(a => a.year === year);
}

export function calculateCompetitorKpis(
  company: CompanyFinancials,
  years: number[]
): CompetitorCompanyData {
  const sortedYears = [...years].sort((a, b) => a - b);
  const yearData: CompetitorYearData[] = [];

  for (const year of sortedYears) {
    const cur = getAnnual(company, year);
    const prev = getAnnual(company, year - 1);

    if (!cur) {
      yearData.push(createBlankYear(year));
      continue;
    }

    // Revenue in Mio RON
    const umsatz = toMio(cur.turnover);
    const prevUmsatz = prev ? toMio(prev.turnover) : null;
    const umsatzChange = pctChange(umsatz, prevUmsatz);

    // EBITDA = Operating Profit + Depreciation
    let ebitda: number | null = null;
    if (cur.operatingProfit !== null && cur.depreciation !== null) {
      ebitda = toMio(cur.operatingProfit + cur.depreciation);
    } else if (cur.operatingProfit !== null) {
      ebitda = toMio(cur.operatingProfit);
    }
    const ebitdaPctUms = pctOf(ebitda, umsatz);

    // EGT = GROSS PROFIT (pre-tax profit in Romanian format)
    const egt = toMio(cur.grossProfit);
    const egtPctUms = pctOf(egt, umsatz);

    // Equity
    const eigenkapital = toMio(cur.ownCapital);
    const bilanzsumme = toMio(cur.totalAssets);
    const eigenkapitalQuote = pctOf(eigenkapital, bilanzsumme);

    // Net Investment = (Fixed Assets current - Fixed Assets prior) + Depreciation current
    let investition: number | null = null;
    if (cur.fixedAssets !== null && cur.depreciation !== null) {
      const prevFixed = prev?.fixedAssets ?? null;
      if (prevFixed !== null) {
        investition = toMio((cur.fixedAssets - prevFixed) + cur.depreciation);
      }
    }
    const investitionPctUms = pctOf(investition, umsatz);

    // Fixed assets (Sachanlagen)
    const sachanlagen = toMio(cur.fixedAssets);
    const sachanlagenPctUms = pctOf(sachanlagen, umsatz);

    // Stocks (Vorräte)
    const vorraete = toMio(cur.stocks);
    const vorraetePctUms = pctOf(vorraete, umsatz);

    // Trade receivables / payables
    const kunden = toMio(cur.receivables);
    const lieferanten = toMio(cur.tradePayables);

    // Working capital % = (Stocks + Trade Receivables - Trade Payables) / Revenue
    let workingCapitalPct: number | null = null;
    if (vorraete !== null && kunden !== null && lieferanten !== null && umsatz !== null && umsatz !== 0) {
      workingCapitalPct = ((vorraete + kunden - lieferanten) / umsatz) * 100;
    }

    // Balance sheet totals
    const bilanzsummePctUms = pctOf(bilanzsumme, umsatz);
    const egtBs = pctOf(egt, bilanzsumme);

    // Net debts = Financial Debts - Cash
    // Financial Debts = credit institutions (short + long term)
    let financialDebts: number | null = null;
    const ciSt = cur.creditInstitutionsShortTerm;
    const ciLt = cur.creditInstitutionsLongTerm;
    if (ciSt != null || ciLt != null) {
      financialDebts = (ciSt ?? 0) + (ciLt ?? 0);
    }
    // No fallback to totalDebts — totalDebts includes trade payables etc., not just financial debts
    let netDebts: number | null = null;
    if (financialDebts !== null) {
      netDebts = toMio(financialDebts - (cur.cashAndEquivalents ?? 0));
    }

    // SD = net debts / EBITDA
    const sdLeverage = (netDebts !== null && ebitda !== null && ebitda !== 0) ? netDebts / ebitda : null;

    // EV = EBITDA × 5 - net debts
    let ev: number | null = null;
    if (ebitda !== null) {
      ev = ebitda * 5 - (netDebts ?? 0);
    }
    const evPctUms = pctOf(ev, umsatz);

    // Viennese Method = (EV + EK) / 2
    let vienneseMethod: number | null = null;
    if (ev !== null && eigenkapital !== null) {
      vienneseMethod = (ev + eigenkapital) / 2;
    }
    const vienneseMethodPctUms = pctOf(vienneseMethod, umsatz);

    yearData.push({
      year,
      umsatz, umsatzChange,
      ebitda, ebitdaPctUms,
      egt, egtPctUms,
      eigenkapital, eigenkapitalQuote,
      investition, investitionPctUms,
      sachanlagen, sachanlagenPctUms,
      vorraete, vorraetePctUms,
      kunden, lieferanten,
      workingCapitalPct,
      bilanzsumme, bilanzsummePctUms,
      egtBs,
      netDebts, sdLeverage,
      ev, evPctUms,
      vienneseMethod, vienneseMethodPctUms,
    });
  }

  return {
    companyId: company.id,
    companyName: company.name,
    isReference: company.isReferenceCompany,
    years: yearData,
  };
}

function createBlankYear(year: number): CompetitorYearData {
  return {
    year,
    umsatz: null, umsatzChange: null,
    ebitda: null, ebitdaPctUms: null,
    egt: null, egtPctUms: null,
    eigenkapital: null, eigenkapitalQuote: null,
    investition: null, investitionPctUms: null,
    sachanlagen: null, sachanlagenPctUms: null,
    vorraete: null, vorraetePctUms: null,
    kunden: null, lieferanten: null,
    workingCapitalPct: null,
    bilanzsumme: null, bilanzsummePctUms: null,
    egtBs: null,
    netDebts: null, sdLeverage: null,
    ev: null, evPctUms: null,
    vienneseMethod: null, vienneseMethodPctUms: null,
  };
}

/**
 * Calculate the arithmetic mean of competitor values for each KPI/year.
 * Excludes the reference company and nulls from the average.
 */
export function calculateCompetitorAverage(
  allData: CompetitorCompanyData[],
  years: number[]
): CompetitorCompanyData {
  const competitors = allData.filter(d => !d.isReference);
  const kpiKeys: (keyof Omit<CompetitorYearData, 'year'>)[] = [
    'umsatz', 'umsatzChange', 'ebitda', 'ebitdaPctUms', 'egt', 'egtPctUms',
    'eigenkapital', 'eigenkapitalQuote', 'investition', 'investitionPctUms',
    'sachanlagen', 'sachanlagenPctUms', 'vorraete', 'vorraetePctUms',
    'kunden', 'lieferanten', 'workingCapitalPct',
    'bilanzsumme', 'bilanzsummePctUms', 'egtBs',
    'netDebts', 'sdLeverage', 'ev', 'evPctUms', 'vienneseMethod', 'vienneseMethodPctUms',
  ];

  const avgYears: CompetitorYearData[] = years.map(year => {
    const result = createBlankYear(year);
    for (const key of kpiKeys) {
      const values = competitors
        .map(c => c.years.find(y => y.year === year)?.[key] ?? null)
        .filter((v): v is number => v !== null);
      if (values.length > 0) {
        (result as unknown as Record<string, number | null>)[key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    }
    return result;
  });

  return {
    companyId: 'AVERAGE',
    companyName: 'Durchschnitt der Wettbewerber',
    isReference: false,
    years: avgYears,
  };
}

/**
 * Determine 2024 column background color for a company.
 */
export function getCompanyHealthColor(data: CompetitorCompanyData): 'green' | 'orange' | 'red' | 'none' {
  const y2024 = data.years.find(y => y.year === 2024);
  if (!y2024) return 'none';

  const egt = y2024.egt;
  const umsatzChange = y2024.umsatzChange;
  const sd = y2024.sdLeverage;

  if (egt !== null && egt < 0) return 'red';
  if (sd !== null && sd > 5) return 'red';
  if (umsatzChange !== null && umsatzChange < -30) return 'red';

  if (egt !== null && egt > 0 && umsatzChange !== null && umsatzChange > 0 && (sd === null || sd < 3)) {
    return 'green';
  }

  if (egt !== null && egt > 0) return 'orange';

  return 'none';
}

/**
 * Determine cell-level color for a delta value.
 */
export function getDeltaColor(
  value: number | null,
  direction: 'higher-better' | 'lower-better' = 'higher-better'
): string {
  if (value == null || isNaN(value)) return 'text-gray-400';
  const threshold = 5;
  const adjusted = direction === 'lower-better' ? -value : value;
  if (adjusted > threshold) return 'text-emerald-600';
  if (adjusted < -threshold) return 'text-red-500';
  return 'text-gray-400';
}
