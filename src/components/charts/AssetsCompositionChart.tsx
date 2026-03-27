import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFinancialStore } from '../../store/useFinancialStore';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import { ChartWrapper } from './ChartWrapper';

export const AssetsCompositionChart: React.FC = () => {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const currency = dataset?.currency ?? 'T RON';

  const primaryCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyIds[0]) ?? null,
    [companies, selectedCompanyIds]
  );

  const chartData = useMemo(() => {
    if (!primaryCompany) return [];

    return primaryCompany.annuals
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((annual) => ({
        year: annual.year.toString(),
        fixedAssets: annual.fixedAssets ?? null,
        stocks: annual.stocks ?? null,
        receivables: annual.receivables ?? null,
        cash: annual.cashAndEquivalents ?? null,
      }))
      .filter((d) => d.fixedAssets !== null || d.stocks !== null || d.receivables !== null || d.cash !== null);
  }, [primaryCompany]);

  if (!primaryCompany || chartData.length === 0) return null;

  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <ChartWrapper title="Assets Composition">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="fixedAssets" name="Fixed Assets" stackId="assets" fill="#3b82f6" />
          <Bar dataKey="stocks" name="Stocks" stackId="assets" fill="#10b981" />
          <Bar dataKey="receivables" name="Receivables" stackId="assets" fill="#f59e0b" />
          <Bar dataKey="cash" name="Cash" stackId="assets" fill="#06b6d4" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
