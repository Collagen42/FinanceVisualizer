import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useFinancialStore } from '../../store/useFinancialStore';
import { formatCurrency } from '../../utils/formatters';
import { ChartWrapper } from './ChartWrapper';

const STEP_COLORS = {
  revenue: '#3b82f6',
  cogs: '#ef4444',
  opex: '#f97316',
  other: '#a855f7',
  netProfit: '#10b981',
};

type WaterfallStep = {
  name: string;
  offset: number;
  value: number;
  isTotal: boolean;
  color: string;
};

export const WaterfallChart: React.FC = () => {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const currency = dataset?.currency ?? 'T RON';

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selectedCompanyIds.includes(c.id)),
    [companies, selectedCompanyIds]
  );

  const primaryCompany = selectedCompanies[0];

  const availableYears = useMemo(() => {
    if (!primaryCompany) return [];
    return primaryCompany.annuals.map((a) => a.year).sort((a, b) => b - a);
  }, [primaryCompany]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const year = selectedYear ?? availableYears[0] ?? null;

  const steps = useMemo<WaterfallStep[]>(() => {
    if (!primaryCompany || year === null) return [];

    const annual = primaryCompany.annuals.find((a) => a.year === year);
    if (!annual) return [];

    const { turnover, grossProfit, operatingProfit, netProfit } = annual;

    if (turnover === null) return [];

    const cogs = grossProfit !== null ? turnover - grossProfit : null;
    const opex = grossProfit !== null && operatingProfit !== null ? grossProfit - operatingProfit : null;
    const taxAndInterest =
      operatingProfit !== null && netProfit !== null ? operatingProfit - netProfit : null;

    const result: WaterfallStep[] = [];

    // Revenue bar (starts at 0, full height)
    result.push({
      name: 'Revenue',
      offset: 0,
      value: turnover,
      isTotal: true,
      color: STEP_COLORS.revenue,
    });

    // COGS deduction
    if (grossProfit !== null && cogs !== null) {
      result.push({
        name: 'COGS',
        offset: grossProfit,
        value: cogs,
        isTotal: false,
        color: STEP_COLORS.cogs,
      });
      result.push({
        name: 'Gross Profit',
        offset: 0,
        value: grossProfit,
        isTotal: true,
        color: STEP_COLORS.revenue,
      });
    }

    // OpEx deduction
    if (operatingProfit !== null && opex !== null) {
      result.push({
        name: 'OpEx',
        offset: operatingProfit,
        value: opex,
        isTotal: false,
        color: STEP_COLORS.opex,
      });
      result.push({
        name: 'Operating Profit',
        offset: 0,
        value: operatingProfit,
        isTotal: true,
        color: STEP_COLORS.revenue,
      });
    }

    // Tax & Interest deduction
    if (netProfit !== null && taxAndInterest !== null) {
      result.push({
        name: 'Tax & Interest',
        offset: netProfit,
        value: taxAndInterest,
        isTotal: false,
        color: STEP_COLORS.other,
      });
      result.push({
        name: 'Net Profit',
        offset: 0,
        value: netProfit,
        isTotal: true,
        color: STEP_COLORS.netProfit,
      });
    }

    return result;
  }, [primaryCompany, year]);

  // Recharts waterfall: stacked bar where the first bar is transparent (offset)
  const chartData = steps.map((s) => ({
    name: s.name,
    offset: s.offset,
    value: s.value,
    isTotal: s.isTotal,
    color: s.color,
  }));

  const formatYAxis = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length < 2) return null;
    const entry = payload[1]; // actual value bar
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-xs" style={{ color: entry?.fill }}>
          {formatCurrency(entry?.value, currency)}
        </p>
      </div>
    );
  };

  if (!primaryCompany) return null;

  const title = `P&L Waterfall${year ? ` — ${year}` : ''}`;

  return (
    <ChartWrapper title={title}>
      {availableYears.length > 1 && (
        <div className="flex justify-end mb-2">
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={year ?? ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {chartData.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">No income statement data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            {/* Invisible offset bar to push visible bar up */}
            <Bar dataKey="offset" stackId="waterfall" fill="transparent" legendType="none" />
            {/* Visible value bar with per-bar colors */}
            <Bar dataKey="value" stackId="waterfall" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWrapper>
  );
};
