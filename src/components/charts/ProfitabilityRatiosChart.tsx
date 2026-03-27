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
import { formatPercent } from '../../utils/formatters';
import { ChartWrapper } from './ChartWrapper';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const ProfitabilityRatiosChart: React.FC = () => {
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
          point[`roe_${company.id}`] = ratio?.roe ?? null;
        });
      } else {
        const ratio = selectedCompanies[0].ratios.find((r) => r.year === year);
        point.roe = ratio?.roe ?? null;
        point.roa = ratio?.roa ?? null;
        point.roic = ratio?.roic ?? null;
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
            {entry.name}: {formatPercent(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <ChartWrapper title="Profitability Ratios">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {isMultiCompany ? (
            selectedCompanies.map((company, idx) => (
              <Line
                key={company.id}
                type="monotone"
                dataKey={`roe_${company.id}`}
                name={`${company.name} ROE`}
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
                dataKey="roe"
                name="ROE"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="roa"
                name="ROA"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="roic"
                name="ROIC"
                stroke="#f59e0b"
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
