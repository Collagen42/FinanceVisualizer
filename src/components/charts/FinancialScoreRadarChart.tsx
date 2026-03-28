import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { CompanyFinancials } from '../../types/financial';
import { calculateFinancialScore } from '../../calculations/financialScore';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface Props {
  companies: CompanyFinancials[];
  year: number;
}

export const FinancialScoreRadarChart: React.FC<Props> = ({ companies, year }) => {
  const { chartData, scores } = useMemo(() => {
    const scores = companies.map((c) => calculateFinancialScore(c, year));

    const dimensionNames = scores[0]?.dimensions.map((d) => d.name) ?? [];
    const chartData = dimensionNames.map((name) => {
      const point: Record<string, unknown> = { dimension: name };
      scores.forEach((score) => {
        const dim = score.dimensions.find((d) => d.name === name);
        point[score.companyId] = dim?.score ?? 0;
      });
      return point;
    });

    return { chartData, scores };
  }, [companies, year]);

  if (companies.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value !== null ? `${(entry.value as number).toFixed(1)}/10` : 'N/A'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 12, fill: '#374151' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fontSize: 10 }}
          tickCount={6}
        />
        <Tooltip content={<CustomTooltip />} />
        {companies.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12 }} />
        )}
        {companies.map((company, idx) => (
          <Radar
            key={company.id}
            name={company.name}
            dataKey={company.id}
            stroke={COLORS[idx % COLORS.length]}
            fill={COLORS[idx % COLORS.length]}
            fillOpacity={companies.length > 1 ? 0.15 : 0.25}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
};
