import { CompetitorYearData } from './competitorKpis';

// ---------------------------------------------------------------------------
// Shared formatting helpers (used by KPI_ROWS format functions)
// ---------------------------------------------------------------------------

export function fmtMio(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fmtPct(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  return `${Math.round(v)}%`;
}

export function fmtYears(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// ---------------------------------------------------------------------------
// KPI row definition type
// ---------------------------------------------------------------------------

export interface KpiRowDef {
  label: string;
  subLabel?: string;
  section: 1 | 2 | 3 | 4;
  getValue: (d: CompetitorYearData) => number | null;
  format: (v: number | null) => string;
  deltaType?: 'pct' | 'pp' | 'abs' | 'none';
  direction?: 'higher-better' | 'lower-better' | 'neutral';
  isSubRow?: boolean;
}

// ---------------------------------------------------------------------------
// All KPI rows
// ---------------------------------------------------------------------------

export const KPI_ROWS: KpiRowDef[] = [
  // Section 1: Income Statement
  { label: 'Umsatz', subLabel: 'Mio RON', section: 1, getValue: d => d.umsatz, format: fmtMio, deltaType: 'pct', direction: 'higher-better' },
  { label: 'Umsatzänderung', subLabel: '% zu VJ', section: 1, getValue: d => d.umsatzChange, format: fmtPct, deltaType: 'none' },
  { label: 'EBITDA', subLabel: 'Mio RON', section: 1, getValue: d => d.ebitda, format: fmtMio, deltaType: 'pct', direction: 'higher-better' },
  { label: '', subLabel: '% Ums', section: 1, getValue: d => d.ebitdaPctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'EGT', subLabel: 'Mio RON', section: 1, getValue: d => d.egt, format: fmtMio, deltaType: 'pct', direction: 'higher-better' },
  { label: '', subLabel: '% Ums', section: 1, getValue: d => d.egtPctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  // Section 2: Balance Sheet
  { label: 'Eigenkapital', subLabel: 'Mio RON', section: 2, getValue: d => d.eigenkapital, format: fmtMio, deltaType: 'pct', direction: 'higher-better' },
  { label: '', subLabel: 'Quote %', section: 2, getValue: d => d.eigenkapitalQuote, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'Investition', subLabel: 'Mio RON', section: 2, getValue: d => d.investition, format: fmtMio, deltaType: 'pct', direction: 'neutral' },
  { label: '', subLabel: '% Ums', section: 2, getValue: d => d.investitionPctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'Sachanlagen', subLabel: 'Mio RON', section: 2, getValue: d => d.sachanlagen, format: fmtMio, deltaType: 'pct', direction: 'neutral' },
  { label: '', subLabel: '% Ums', section: 2, getValue: d => d.sachanlagenPctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'Vorräte', subLabel: 'Mio RON', section: 2, getValue: d => d.vorraete, format: fmtMio, deltaType: 'pct', direction: 'neutral' },
  { label: '', subLabel: '% Ums', section: 2, getValue: d => d.vorraetePctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'Kunden', subLabel: 'Mio RON', section: 2, getValue: d => d.kunden, format: fmtMio, deltaType: 'pct', direction: 'neutral' },
  { label: 'Lieferanten', subLabel: 'Mio RON', section: 2, getValue: d => d.lieferanten, format: fmtMio, deltaType: 'pct', direction: 'neutral' },
  { label: 'Working Capital', subLabel: '% Ums', section: 2, getValue: d => d.workingCapitalPct, format: fmtPct, deltaType: 'pp', direction: 'neutral' },
  // Section 3: Balance Sheet Totals
  { label: 'Bilanzsumme', subLabel: 'Mio RON', section: 3, getValue: d => d.bilanzsumme, format: fmtMio, deltaType: 'pct', direction: 'neutral' },
  { label: '', subLabel: '% Ums', section: 3, getValue: d => d.bilanzsummePctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'EGT/BS', subLabel: '%', section: 3, getValue: d => d.egtBs, format: fmtPct, deltaType: 'pp', direction: 'higher-better' },
  // Section 4: Debt & Valuation
  { label: 'net debts', subLabel: 'Mio RON', section: 4, getValue: d => d.netDebts, format: fmtMio, deltaType: 'pct', direction: 'lower-better' },
  { label: 'SD (net debts/EBITDA)', subLabel: 'Jahre', section: 4, getValue: d => d.sdLeverage, format: fmtYears, deltaType: 'abs', direction: 'lower-better' },
  { label: 'EV', subLabel: 'EBITDA×5−net debts Mio RON', section: 4, getValue: d => d.ev, format: fmtMio, deltaType: 'pct', direction: 'higher-better' },
  { label: '', subLabel: '% Ums', section: 4, getValue: d => d.evPctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
  { label: 'Viennese Method', subLabel: '(EV+EK)/2 Mio RON', section: 4, getValue: d => d.vienneseMethod, format: fmtMio, deltaType: 'pct', direction: 'higher-better' },
  { label: '', subLabel: '% Ums', section: 4, getValue: d => d.vienneseMethodPctUms, format: fmtPct, deltaType: 'none', isSubRow: true },
];

// ---------------------------------------------------------------------------
// Selectable KPIs (non-sub-row rows with a label)
// ---------------------------------------------------------------------------

export const SELECTABLE_KPIS = KPI_ROWS
  .map((row, originalIdx) => ({ row, originalIdx }))
  .filter(({ row }) => !row.isSubRow && row.label !== '')
  .map(({ row, originalIdx }) => ({
    ...row,
    displayLabel: `${row.label}${row.subLabel ? ` (${row.subLabel})` : ''}`,
    uniqueKey: originalIdx,
  }));
