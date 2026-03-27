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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const LiabilitiesEquityChart: React.FC = () => {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const currency = dataset?.currency ?? 'T RON';

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selectedCompanyIds.includes(c.id)),
    [companies, selectedCompanyIds]
  );

  const isMultiCompany = selectedCompanies.length > 1;

  const chartData = useMemo(() => {
    if (selectedCompanies.length === 0) return [];

    const allYears = new Set<number>();
    selectedCompanies.forEach((c) => c.annuals.forEach((a) => allYears.add(a.year)));
    const years = Array.from(allYears).sort();

    return years.map((year) => {
      const point: Record<string, unknown> = { year: year.toString() };

      if (isMultiCompany) {
        selectedCompanies.forEach((company) => {
          const annual = company.annuals.find((a) => a.year === year);
          const total =
            (annual?.ownCapital ?? 0) +
            (annual?.shortTermDebts ?? 0) +
            (annual?.longTermDebts ?? 0);
          point[`totalLiabilities_${company.id}`] = total > 0 ? total : null;
        });
      } else {
        const annual = selectedCompanies[0].annuals.find((a) => a.year === year);
        point.ownCapital = annual?.ownCapital ?? null;
        point.shortTermDebts = annual?.shortTermDebts ?? null;
        point.longTermDebts = annual?.longTermDebts ?? null;
      }

      return point;
    });
  }, [selectedCompanies, isMultiCompany]);

  if (selectedCompanies.length === 0 || chartData.length === 0) return null;

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
    <ChartWrapper title="Liabilities & Equity">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {isMultiCompany ? (
            selectedCompanies.map((company, idx) => (
              <Bar
                key={company.id}
                dataKey={`totalLiabilities_${company.id}`}
                name={company.name}
                fill={COLORS[idx % COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))
          ) : (
            <>
              <Bar dataKey="ownCapital" name="Own Capital" stackId="liabilities" fill="#10b981" />
              <Bar dataKey="shortTermDebts" name="Short-term Debts" stackId="liabilities" fill="#ef4444" />
              <Bar dataKey="longTermDebts" name="Long-term Debts" stackId="liabilities" fill="#f97316" radius={[2, 2, 0, 0]} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
