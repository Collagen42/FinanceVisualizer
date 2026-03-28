import React, { useMemo } from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import {
  calculateCompetitorKpis,
  calculateCompetitorAverage,
  CompetitorCompanyData,
  CompetitorYearData,
  getCompanyHealthColor,
  getDeltaColor,
} from '../../calculations/competitorKpis';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtMio(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtPct(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  return `${Math.round(v)}%`;
}

function fmtDelta(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  const rounded = Math.round(v);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function fmtYears(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtDeltaPp(current: number | null, prior: number | null): string {
  if (current == null || prior == null || isNaN(current) || isNaN(prior)) return '';
  const diff = Math.round(current - prior);
  return `${diff > 0 ? '+' : ''}${diff}pp`;
}

function fmtDeltaAbs(current: number | null, prior: number | null): string {
  if (current == null || prior == null || isNaN(current) || isNaN(prior)) return '';
  const diff = current - prior;
  return diff.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' });
}

// ---------------------------------------------------------------------------
// KPI row definitions
// ---------------------------------------------------------------------------

interface KpiRowDef {
  label: string;
  subLabel?: string;
  section: 1 | 2 | 3 | 4;
  getValue: (d: CompetitorYearData) => number | null;
  format: (v: number | null) => string;
  deltaType?: 'pct' | 'pp' | 'abs' | 'none';
  direction?: 'higher-better' | 'lower-better' | 'neutral';
  isSubRow?: boolean;
}

function pctChangeFn(
  getValue: (d: CompetitorYearData) => number | null
): (cur: CompetitorYearData, prev: CompetitorYearData | null) => string {
  return (cur, prev) => {
    const c = getValue(cur);
    const p = prev ? getValue(prev) : null;
    if (c === null || p === null || p === 0) return '';
    return fmtDelta(((c / p) - 1) * 100);
  };
}

const KPI_ROWS: KpiRowDef[] = [
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
// Component
// ---------------------------------------------------------------------------

const HEALTH_COLORS: Record<string, string> = {
  green: 'bg-emerald-50',
  orange: 'bg-amber-50',
  red: 'bg-red-50',
  none: '',
};

const CompetitorOverviewTable: React.FC = () => {
  const { companies, dataset } = useFinancialStore();
  const years = dataset?.years ?? [];

  const { orderedData, avgData } = useMemo(() => {
    if (companies.length === 0) return { orderedData: [], avgData: null };

    const allKpis = companies.map(c => calculateCompetitorKpis(c, years));
    const ref = allKpis.find(d => d.isReference);
    const competitors = allKpis.filter(d => !d.isReference);
    const avg = calculateCompetitorAverage(allKpis, years);

    const orderedData: CompetitorCompanyData[] = [];
    if (ref) orderedData.push(ref);
    orderedData.push(avg);
    orderedData.push(...competitors);

    return { orderedData, avgData: avg };
  }, [companies, years]);

  if (orderedData.length === 0) return null;

  const displayYears = [2022, 2023, 2024].filter(y => years.includes(y));

  // Build rows with delta sub-rows
  const tableRows: Array<{
    kpi: KpiRowDef;
    isDeltaRow: boolean;
  }> = [];

  let lastSection = 0;
  for (const kpi of KPI_ROWS) {
    if (kpi.section !== lastSection) {
      lastSection = kpi.section;
    }
    tableRows.push({ kpi, isDeltaRow: false });
    if (kpi.deltaType && kpi.deltaType !== 'none') {
      tableRows.push({ kpi, isDeltaRow: true });
    }
  }

  function renderCell(
    company: CompetitorCompanyData,
    kpi: KpiRowDef,
    year: number,
    isDeltaRow: boolean,
    isLast2024: boolean
  ): React.ReactNode {
    const yearData = company.years.find(y => y.year === year);
    const prevYearData = company.years.find(y => y.year === year - 1);

    if (!isDeltaRow) {
      const value = yearData ? kpi.getValue(yearData) : null;
      const healthColor = isLast2024 ? HEALTH_COLORS[getCompanyHealthColor(company)] : '';
      return (
        <td key={`${company.companyId}-${year}`} className={`px-2 py-0.5 text-right text-xs whitespace-nowrap ${healthColor}`}>
          {kpi.format(value)}
        </td>
      );
    }

    // Delta row
    if (!yearData) {
      return <td key={`${company.companyId}-${year}-d`} className="px-2 py-0.5 text-right text-xs" />;
    }

    const curVal = kpi.getValue(yearData);
    const prevVal = prevYearData ? kpi.getValue(prevYearData) : null;

    let text = '';
    let colorClass = 'text-gray-400';

    if (kpi.deltaType === 'pct') {
      if (curVal !== null && prevVal !== null && prevVal !== 0) {
        const delta = ((curVal / prevVal) - 1) * 100;
        text = fmtDelta(delta);
        colorClass = getDeltaColor(delta, kpi.direction === 'lower-better' ? 'lower-better' : 'higher-better');
      }
    } else if (kpi.deltaType === 'pp') {
      text = fmtDeltaPp(curVal, prevVal);
      if (curVal !== null && prevVal !== null) {
        const diff = curVal - prevVal;
        colorClass = getDeltaColor(diff, kpi.direction === 'lower-better' ? 'lower-better' : 'higher-better');
      }
    } else if (kpi.deltaType === 'abs') {
      text = fmtDeltaAbs(curVal, prevVal);
      if (curVal !== null && prevVal !== null) {
        const diff = curVal - prevVal;
        colorClass = getDeltaColor(diff * 10, kpi.direction === 'lower-better' ? 'lower-better' : 'higher-better');
      }
    }

    const healthColor = isLast2024 ? HEALTH_COLORS[getCompanyHealthColor(company)] : '';

    return (
      <td key={`${company.companyId}-${year}-d`} className={`px-2 py-0.5 text-right text-xs whitespace-nowrap ${colorClass} ${healthColor}`}>
        {text}
      </td>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Wettbewerb Rumänien {years[0]}–{years[years.length - 1]}</h2>
        <p className="text-xs text-gray-500 mt-0.5">Basis: Veröffentlichte HGB Bilanzen · Werte in Mio RON</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            {/* Company name header */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">
                KPI
              </th>
              {orderedData.map((company, idx) => {
                const isRef = company.isReference;
                const isAvg = company.companyId === 'AVERAGE';
                const bgClass = isRef ? 'bg-blue-50' : isAvg ? 'bg-amber-50' : 'bg-gray-50';
                return (
                  <th
                    key={company.companyId}
                    colSpan={displayYears.length}
                    className={`px-2 py-2 text-center font-semibold text-gray-700 border-l border-gray-200 ${bgClass}`}
                  >
                    <div className="truncate max-w-[200px]" title={company.companyName}>
                      {isAvg ? 'Ø Wettbewerber' : company.companyName.replace(/SW UMWELTTECHNIK ROMANIA SRL/i, 'SWR').replace(/\s+(SRL|SA|S\.R\.L|S\.A)\.?$/i, '')}
                    </div>
                  </th>
                );
              })}
            </tr>
            {/* Year sub-headers */}
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-1 text-left text-gray-500 font-normal" />
              {orderedData.map((company) =>
                displayYears.map((year) => {
                  const isRef = company.isReference;
                  const isAvg = company.companyId === 'AVERAGE';
                  const bgClass = isRef ? 'bg-blue-50' : isAvg ? 'bg-amber-50' : 'bg-gray-50';
                  return (
                    <th
                      key={`${company.companyId}-${year}`}
                      className={`px-2 py-1 text-center font-medium text-gray-500 ${year === displayYears[0] ? 'border-l border-gray-200' : ''} ${bgClass}`}
                    >
                      {year}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ kpi, isDeltaRow }, rowIdx) => {
              // Section separator
              const prevRow = rowIdx > 0 ? tableRows[rowIdx - 1] : null;
              const showSectionBorder = prevRow && prevRow.kpi.section !== kpi.section && !isDeltaRow;

              const rowLabel = isDeltaRow
                ? '∆% vj'
                : kpi.isSubRow
                  ? kpi.subLabel || ''
                  : kpi.label;

              const rowSubLabel = !isDeltaRow && !kpi.isSubRow ? kpi.subLabel : '';

              return (
                <tr
                  key={`${kpi.label}-${kpi.subLabel}-${isDeltaRow}-${rowIdx}`}
                  className={`
                    ${showSectionBorder ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                    ${isDeltaRow ? 'bg-gray-50/50' : ''}
                    ${kpi.isSubRow ? 'bg-gray-50/30' : ''}
                    hover:bg-blue-50/30
                  `}
                >
                  <td className={`sticky left-0 bg-white z-10 px-3 py-0.5 ${isDeltaRow ? 'bg-gray-50/50' : ''}`}>
                    <div className={`${isDeltaRow || kpi.isSubRow ? 'pl-4 text-gray-400 italic' : 'font-medium text-gray-700'} text-xs`}>
                      {rowLabel}
                      {rowSubLabel && (
                        <span className="text-gray-400 font-normal ml-1">{rowSubLabel}</span>
                      )}
                    </div>
                  </td>
                  {orderedData.map((company) =>
                    displayYears.map((year) => {
                      const is2024 = year === 2024;
                      return renderCell(company, kpi, year, isDeltaRow, is2024);
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompetitorOverviewTable;
