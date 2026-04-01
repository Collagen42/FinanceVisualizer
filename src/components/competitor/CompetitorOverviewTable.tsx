import React, { useMemo, useState } from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import {
  calculateCompetitorKpis,
  calculateCompetitorAverage,
  CompetitorCompanyData,
  getCompanyHealthColor,
  getDeltaColor,
} from '../../calculations/competitorKpis';
import { KpiRowDef, KPI_ROWS, SELECTABLE_KPIS } from '../../calculations/kpiDefinitions';

// ---------------------------------------------------------------------------
// Formatting helpers (table-specific — not needed by other components)
// ---------------------------------------------------------------------------

function fmtDelta(v: number | null): string {
  if (v == null || isNaN(v)) return '';
  const rounded = Math.round(v);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
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
// Insights helpers
// ---------------------------------------------------------------------------

function formatCompanyName(name: string): string {
  return name
    .replace(/SW UMWELTTECHNIK ROMANIA SRL/i, 'SWR')
    .replace(/\s+(SRL|SA|S\.R\.L|S\.A)\.?$/i, '');
}

function formatInsightDelta(delta: number, kpi: KpiRowDef): string {
  if (kpi.deltaType === 'pct') return fmtDelta(delta);
  if (kpi.deltaType === 'pp') return `${delta > 0 ? '+' : ''}${Math.round(delta)}pp`;
  return delta.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  });
}

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

  const [selectedKpiIdx, setSelectedKpiIdx] = useState(0);
  const [selectedInsightYear, setSelectedInsightYear] = useState<number | null>(null);
  const [hiddenCompanyIds, setHiddenCompanyIds] = useState<Set<string>>(new Set());

  const displayYears = [2022, 2023, 2024].filter(y => years.includes(y));

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

  const insights = useMemo(() => {
    if (orderedData.length === 0) return null;
    const kpi = SELECTABLE_KPIS[selectedKpiIdx];
    const realCompanies = orderedData.filter(c => c.companyId !== 'AVERAGE');

    const allValues: { company: CompetitorCompanyData; year: number; value: number }[] = [];
    const allDeltas: { company: CompetitorCompanyData; year: number; delta: number }[] = [];

    for (const company of realCompanies) {
      for (const yearData of company.years) {
        if (!displayYears.includes(yearData.year)) continue;
        const val = kpi.getValue(yearData);

        if (val !== null) {
          allValues.push({ company, year: yearData.year, value: val });
        }

        const prevYearData = company.years.find(y => y.year === yearData.year - 1);
        if (prevYearData) {
          const prevVal = kpi.getValue(prevYearData);
          if (val !== null && prevVal !== null) {
            let delta: number | null = null;
            if (kpi.deltaType === 'pct') {
              if (prevVal !== 0) delta = ((val / prevVal) - 1) * 100;
            } else {
              delta = val - prevVal;
            }
            if (delta !== null) {
              allDeltas.push({ company, year: yearData.year, delta });
            }
          }
        }
      }
    }

    const filteredValues = selectedInsightYear === null
      ? allValues
      : allValues.filter(e => e.year === selectedInsightYear);
    const filteredDeltas = selectedInsightYear === null
      ? allDeltas
      : allDeltas.filter(e => e.year === selectedInsightYear);

    const topPerformers = [...filteredValues].sort((a, b) => b.value - a.value).slice(0, 5);
    const biggestIncreases = [...filteredDeltas].sort((a, b) => b.delta - a.delta).slice(0, 5);
    const biggestDecreases = [...filteredDeltas].sort((a, b) => a.delta - b.delta).slice(0, 5);

    return { topPerformers, biggestIncreases, biggestDecreases, kpi };
  }, [selectedKpiIdx, selectedInsightYear, orderedData, displayYears]);

  if (orderedData.length === 0) return null;

  const visibleData = orderedData.filter(c => !hiddenCompanyIds.has(c.companyId));

  const toggleCompany = (id: string) => {
    setHiddenCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

      {/* Company visibility filter */}
      <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 shrink-0">Anzeigen:</span>
        {orderedData.map(company => {
          const isHidden = hiddenCompanyIds.has(company.companyId);
          const isAvg = company.companyId === 'AVERAGE';
          const isRef = company.isReference;
          const label = isAvg
            ? 'Ø Wettbewerber'
            : formatCompanyName(company.companyName);
          const activeClass = isRef
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : isAvg
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-gray-300 bg-white text-gray-700';
          return (
            <button
              key={company.companyId}
              onClick={() => toggleCompany(company.companyId)}
              title={company.companyName}
              className={`text-xs px-2 py-0.5 rounded border transition-opacity ${
                isHidden ? 'opacity-30' : activeClass
              }`}
            >
              {label}
            </button>
          );
        })}
        {hiddenCompanyIds.size > 0 && (
          <button
            onClick={() => setHiddenCompanyIds(new Set())}
            className="text-xs text-blue-600 hover:text-blue-800 ml-1 underline underline-offset-2"
          >
            Alle anzeigen
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            {/* Company name header */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">
                KPI
              </th>
              {visibleData.map((company) => {
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
              {visibleData.map((company) =>
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
                  {visibleData.map((company) =>
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

      {/* Insights Panel */}
      {insights && (
        <div className="px-5 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Insights</h3>
            <select
              value={selectedKpiIdx}
              onChange={e => setSelectedKpiIdx(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {SELECTABLE_KPIS.map((kpi, i) => (
                <option key={kpi.uniqueKey} value={i}>{kpi.displayLabel}</option>
              ))}
            </select>
            <select
              value={selectedInsightYear ?? ''}
              onChange={e => setSelectedInsightYear(e.target.value === '' ? null : Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Alle Jahre</option>
              {displayYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Top Performers */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-600 mb-2">Top Performer</div>
              {insights.topPerformers.length > 0 ? (
                <div className="space-y-1.5">
                  {insights.topPerformers.map((entry, i) => (
                    <div key={`${entry.company.companyId}-${entry.year}`} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-400 w-4 shrink-0 text-right">{i + 1}.</span>
                      <span className="text-xs text-gray-700 truncate flex-1 min-w-0" title={entry.company.companyName}>
                        {formatCompanyName(entry.company.companyName)}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                        {insights.kpi.format(entry.value)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{entry.year}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Keine Daten</div>
              )}
            </div>

            {/* Biggest YoY Increases */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <div className="text-xs font-medium text-emerald-600 mb-2">Größter YoY-Anstieg</div>
              {insights.biggestIncreases.length > 0 ? (
                <div className="space-y-1.5">
                  {insights.biggestIncreases.map((entry, i) => (
                    <div key={`${entry.company.companyId}-${entry.year}`} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-400 w-4 shrink-0 text-right">{i + 1}.</span>
                      <span className="text-xs text-gray-700 truncate flex-1 min-w-0" title={entry.company.companyName}>
                        {formatCompanyName(entry.company.companyName)}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                        {formatInsightDelta(entry.delta, insights.kpi)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{entry.year}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Keine Daten</div>
              )}
            </div>

            {/* Biggest YoY Decreases */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <div className="text-xs font-medium text-red-600 mb-2">Größter YoY-Rückgang</div>
              {insights.biggestDecreases.length > 0 ? (
                <div className="space-y-1.5">
                  {insights.biggestDecreases.map((entry, i) => (
                    <div key={`${entry.company.companyId}-${entry.year}`} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-400 w-4 shrink-0 text-right">{i + 1}.</span>
                      <span className="text-xs text-gray-700 truncate flex-1 min-w-0" title={entry.company.companyName}>
                        {formatCompanyName(entry.company.companyName)}
                      </span>
                      <span className="text-xs font-semibold text-red-700 whitespace-nowrap">
                        {formatInsightDelta(entry.delta, insights.kpi)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{entry.year}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Keine Daten</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorOverviewTable;
