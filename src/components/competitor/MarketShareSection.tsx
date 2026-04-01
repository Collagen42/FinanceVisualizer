import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinancialStore } from '../../store/useFinancialStore';
import { calculateCompetitorKpis } from '../../calculations/competitorKpis';
import { SELECTABLE_KPIS } from '../../calculations/kpiDefinitions';

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#14b8a6', '#a855f7', '#f43f5e',
];

const RADIAN = Math.PI / 180;

function formatCompanyName(name: string): string {
  return name
    .replace(/SW UMWELTTECHNIK ROMANIA SRL/i, 'SWR')
    .replace(/\s+(SRL|SA|S\.R\.L|S\.A)\.?$/i, '');
}

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 600, pointerEvents: 'none' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const MarketShareSection: React.FC = () => {
  const { companies, dataset } = useFinancialStore();
  const years = dataset?.years ?? [];
  const displayYears = useMemo(() => [...years].sort((a, b) => a - b), [years]);

  // Compute KPI data for all companies (preserves order from dataset)
  const allCompanyData = useMemo(
    () => companies.map(c => calculateCompetitorKpis(c, years)),
    [companies, years]
  );

  // Initialise selection and colors once on mount (allCompanyData is memoized before useState runs)
  const [selectedKpiIdx, setSelectedKpiIdx] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(allCompanyData.map(c => c.companyId))
  );
  const [companyColors, setCompanyColors] = useState<Record<string, string>>(() => {
    const colors: Record<string, string> = {};
    allCompanyData.forEach((c, i) => {
      colors[c.companyId] = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    });
    return colors;
  });

  const toggleCompany = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const setColor = (id: string, color: string) => {
    setCompanyColors(prev => ({ ...prev, [id]: color }));
  };

  // Build pie data per year — total always = all companies, unselected → "Sonstige"
  const pieDataByYear = useMemo(() => {
    const kpi = SELECTABLE_KPIS[selectedKpiIdx];
    return displayYears.map(year => {
      let othersValue = 0;
      const slices: { companyId: string; name: string; value: number }[] = [];

      for (const c of allCompanyData) {
        const yd = c.years.find(y => y.year === year);
        const val = yd ? kpi.getValue(yd) : null;
        if (val === null || val <= 0) continue;

        if (selectedIds.has(c.companyId)) {
          slices.push({ companyId: c.companyId, name: formatCompanyName(c.companyName), value: val });
        } else {
          othersValue += val;
        }
      }

      if (othersValue > 0) {
        slices.push({ companyId: '__others__', name: 'Sonstige', value: othersValue });
      }

      return { year, slices };
    });
  }, [allCompanyData, selectedIds, selectedKpiIdx, displayYears]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as { name: string; value: number };
    const total = payload[0].payload.__total as number;
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
        <p className="font-semibold text-gray-700 mb-0.5">{d.name}</p>
        <p className="text-gray-600">
          {d.value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio RON
        </p>
        <p className="text-gray-400">{pct}%</p>
      </div>
    );
  };

  if (allCompanyData.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Marktanteile</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Basis: {SELECTABLE_KPIS[selectedKpiIdx].displayLabel}
          </p>
        </div>
        <select
          value={selectedKpiIdx}
          onChange={e => setSelectedKpiIdx(Number(e.target.value))}
          className="ml-auto text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {SELECTABLE_KPIS.map((kpi, i) => (
            <option key={kpi.uniqueKey} value={i}>{kpi.displayLabel}</option>
          ))}
        </select>
      </div>

      {/* Company multi-select + color pickers */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex flex-wrap gap-2">
          {allCompanyData.map((company, i) => {
            const isSelected = selectedIds.has(company.companyId);
            const color = companyColors[company.companyId] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            return (
              <label
                key={company.companyId}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer select-none transition-opacity ${
                  isSelected ? 'border-gray-300 bg-white opacity-100' : 'border-gray-200 bg-gray-50 opacity-40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCompany(company.companyId)}
                  className="cursor-pointer w-3 h-3 accent-blue-500"
                />
                <span
                  className="relative w-4 h-4 rounded-sm shrink-0 overflow-hidden border border-gray-300"
                  title="Farbe ändern"
                  style={{ backgroundColor: color }}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(company.companyId, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </span>
                <span className="text-gray-700 whitespace-nowrap">
                  {formatCompanyName(company.companyName)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Pie charts */}
      <div className="px-5 py-4">
        {pieDataByYear.every(d => d.slices.length === 0) ? (
          <p className="text-xs text-gray-400 text-center py-8">Keine Unternehmen ausgewählt</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto justify-center">
            {pieDataByYear.map(({ year, slices }) => {
              const total = slices.reduce((s, sl) => s + sl.value, 0);
              // Inject total into each slice so the tooltip can access it
              const slicesWithTotal = slices.map(s => ({ ...s, __total: total }));
              if (slices.length === 0) return null;
              return (
                <div key={year} className="flex-1 min-w-[180px] max-w-[340px]">
                  <p className="text-sm font-semibold text-gray-700 text-center mb-1">{year}</p>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={slicesWithTotal}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="78%"
                        labelLine={false}
                        label={renderPieLabel}
                        isAnimationActive={false}
                      >
                        {slices.map(slice => (
                          <Cell
                            key={slice.companyId}
                            fill={slice.companyId === '__others__' ? '#d1d5db' : (companyColors[slice.companyId] ?? DEFAULT_COLORS[0])}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Per-chart legend */}
                  <div className="flex flex-col gap-0.5 mt-1 px-1">
                    {slices.map(slice => {
                      const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={slice.companyId} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: slice.companyId === '__others__' ? '#d1d5db' : (companyColors[slice.companyId] ?? DEFAULT_COLORS[0]) }}
                          />
                          <span className="text-gray-600 truncate" title={slice.name}>{slice.name}</span>
                          <span className="text-gray-400 whitespace-nowrap ml-auto">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketShareSection;
