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

const OTHERS_COLOR = '#cbd5e1';
const RADIAN = Math.PI / 180;

function formatCompanyName(name: string): string {
  return name
    .replace(/SW UMWELTTECHNIK ROMANIA SRL/i, 'SWR')
    .replace(/\s+(SRL|SA|S\.R\.L|S\.A)\.?$/i, '');
}

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const MarketShareSection: React.FC = () => {
  const { companies, dataset } = useFinancialStore();
  const years = dataset?.years ?? [];
  const displayYears = useMemo(() => [...years].sort((a, b) => a - b), [years]);

  const allCompanyData = useMemo(
    () => companies.map(c => calculateCompetitorKpis(c, years)),
    [companies, years]
  );

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

  const selectedKpi = SELECTABLE_KPIS[selectedKpiIdx];

  const pieDataByYear = useMemo(() => {
    return displayYears.map(year => {
      let othersValue = 0;
      const slices: { companyId: string; name: string; value: number }[] = [];

      for (const c of allCompanyData) {
        const yd = c.years.find(y => y.year === year);
        const val = yd ? selectedKpi.getValue(yd) : null;
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
  }, [allCompanyData, selectedIds, selectedKpi, displayYears]);

  const sliceColor = (companyId: string) =>
    companyId === '__others__' ? OTHERS_COLOR : (companyColors[companyId] ?? DEFAULT_COLORS[0]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as { name: string; value: number; __total: number };
    const pct = d.__total > 0 ? ((d.value / d.__total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs min-w-[140px]">
        <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
        <p className="text-gray-600">{selectedKpi.format(d.value)}</p>
        <p className="text-gray-400 mt-0.5">{pct}% Marktanteil</p>
      </div>
    );
  };

  if (allCompanyData.length === 0) return null;

  const colCount = Math.min(displayYears.length, 3);
  const gridClass = colCount === 1 ? 'grid-cols-1 max-w-sm mx-auto' : colCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Marktanteile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Basis: {selectedKpi.displayLabel}</p>
        </div>
        <select
          value={selectedKpiIdx}
          onChange={e => setSelectedKpiIdx(Number(e.target.value))}
          className="ml-auto text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {SELECTABLE_KPIS.map((kpi, i) => (
            <option key={kpi.uniqueKey} value={i}>{kpi.displayLabel}</option>
          ))}
        </select>
      </div>

      {/* Company multi-select + color pickers */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {allCompanyData.map((company, i) => {
            const isSelected = selectedIds.has(company.companyId);
            const color = companyColors[company.companyId] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            return (
              <label
                key={company.companyId}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer select-none transition-all ${
                  isSelected
                    ? 'border-gray-300 bg-white shadow-sm'
                    : 'border-gray-200 bg-transparent opacity-40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCompany(company.companyId)}
                  className="cursor-pointer w-3 h-3 accent-blue-500"
                />
                <span
                  className="relative w-4 h-4 rounded shrink-0 overflow-hidden border border-gray-300 shadow-sm"
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
                <span className="text-gray-700 whitespace-nowrap font-medium">
                  {formatCompanyName(company.companyName)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Pie charts */}
      <div className="px-6 py-6">
        {pieDataByYear.every(d => d.slices.length === 0) ? (
          <p className="text-sm text-gray-400 text-center py-12">Keine Unternehmen ausgewählt</p>
        ) : (
          <div className={`grid ${gridClass} gap-6`}>
            {pieDataByYear.map(({ year, slices }) => {
              if (slices.length === 0) return null;
              const total = slices.reduce((s, sl) => s + sl.value, 0);
              const slicesWithTotal = slices.map(s => ({ ...s, __total: total }));

              return (
                <div key={year} className="flex flex-col">
                  {/* Year badge */}
                  <div className="text-center mb-4">
                    <span className="inline-block text-sm font-bold text-gray-700 bg-gray-100 rounded-full px-4 py-1 tracking-wide">
                      {year}
                    </span>
                  </div>

                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={slicesWithTotal}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="82%"
                        paddingAngle={2}
                        labelLine={false}
                        label={renderPieLabel}
                        isAnimationActive={false}
                        stroke="white"
                        strokeWidth={2}
                      >
                        {slices.map(slice => (
                          <Cell key={slice.companyId} fill={sliceColor(slice.companyId)} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="mt-4 space-y-2">
                    {slices.map(slice => {
                      const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0';
                      const color = sliceColor(slice.companyId);
                      return (
                        <div key={slice.companyId} className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-gray-600 truncate flex-1" title={slice.name}>
                            {slice.name}
                          </span>
                          <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                            {pct}%
                          </span>
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
