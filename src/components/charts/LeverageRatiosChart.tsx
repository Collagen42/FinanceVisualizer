import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFinancialStore } from '../../store/useFinancialStore';
import { formatRatio } from '../../utils/formatters';
import { ChartWrapper } from './ChartWrapper';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const LeverageRatiosChart: React.FC = () => {
  const { companies, selectedCompanyIds } = useFinancialStore();

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selectedCompanyIds.includes(c.id)),
    [companies, selectedCompanyIds]
  );

  const isMultiCompany = selectedCompanies.length > 1;

  const chartData = useMemo(() => {
    if (selectedCompanies.length === 0) return [];

    const allYears = new Set<number>();
    selectedCompanies.forEach((c) => c.ratios.forEach((r) => allYears.add(r.year)));
    const years = Array.from(allYears).sort();

    return years.map((year) => {
      const point: Record<string, unknown> = { year: year.toString() };

      if (isMultiCompany) {
        selectedCompanies.forEach((company) => {
          const ratio = company.ratios.find((r) => r.year === year);
          point[`de_${company.id}`] = ratio?.debtToEquity ?? null;
        });
      } else {
        const ratio = selectedCompanies[0].ratios.find((r) => r.year === year);
        point.debtToEquity = ratio?.debtToEquity ?? null;
        point.debtToAssets = ratio?.debtToAssets ?? null;
        point.equityRatio = ratio?.equityRatio ?? null;
      }

      return point;
    });
  }, [selectedCompanies, isMultiCompany]);

  if (selectedCompanies.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatRatio(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <ChartWrapper title="Leverage Ratios">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {isMultiCompany ? (
            selectedCompanies.map((company, idx) => (
              <Line
                key={company.id}
                type="monotone"
                dataKey={`de_${company.id}`}
                name={`${company.name} D/E`}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))
          ) : (
            <>
              <Line
                type="monotone"
                dataKey="debtToEquity"
                name="D/E Ratio"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="debtToAssets"
                name="Debt-to-Assets"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="equityRatio"
                name="Equity Ratio"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
