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
import { formatCurrency } from '../../utils/formatters';
import { ChartWrapper } from './ChartWrapper';

export const EfficiencyChart: React.FC = () => {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const currency = dataset?.currency ?? 'T RON';

  const primaryCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyIds[0]) ?? null,
    [companies, selectedCompanyIds]
  );

  const chartData = useMemo(() => {
    if (!primaryCompany) return [];

    return primaryCompany.ratios
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((ratio) => ({
        year: ratio.year.toString(),
        revenuePerEmployee: ratio.revenuePerEmployee ?? null,
        profitPerEmployee: ratio.profitPerEmployee ?? null,
      }))
      .filter((d) => d.revenuePerEmployee !== null || d.profitPerEmployee !== null);
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
    <ChartWrapper title="Efficiency Metrics">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="revenuePerEmployee" name="Revenue / Employee" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="profitPerEmployee" name="Profit / Employee" fill="#10b981" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
