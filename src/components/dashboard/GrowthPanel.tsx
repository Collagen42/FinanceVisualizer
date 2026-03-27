import React from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import { calculateCAGR } from '../../calculations/trends';
import { formatPercent } from '../../utils/formatters';
import TrendArrow from '../shared/TrendArrow';

const GrowthPanel: React.FC = () => {
  const { companies, selectedCompanyIds } = useFinancialStore();

  const selectedCompanies = companies.filter((c) =>
    selectedCompanyIds.includes(c.id)
  );
  const primaryCompany = selectedCompanies[0];

  const latestGrowth =
    primaryCompany && primaryCompany.growth.length > 0
      ? primaryCompany.growth[primaryCompany.growth.length - 1]
      : null;

  const annuals = primaryCompany?.annuals ?? [];
  const hasCAGR = annuals.length >= 3;
  const cagrYears = annuals.length - 1;
  const firstAnnual = annuals[0] ?? null;
  const lastAnnual = annuals[annuals.length - 1] ?? null;

  const growthMetrics: { label: string; key: keyof NonNullable<typeof latestGrowth> }[] = [
    { label: 'Revenue Growth', key: 'revenueGrowth' },
    { label: 'Net Profit Growth', key: 'netProfitGrowth' },
    { label: 'Operating Profit Growth', key: 'operatingProfitGrowth' },
    { label: 'Asset Growth', key: 'assetGrowth' },
    { label: 'Equity Growth', key: 'equityGrowth' },
    { label: 'Employee Growth', key: 'employeeGrowth' },
  ];

  const cagrMetrics = hasCAGR
    ? [
        {
          label: 'Revenue CAGR',
          value: calculateCAGR(firstAnnual?.turnover, lastAnnual?.turnover, cagrYears),
        },
        {
          label: 'Net Profit CAGR',
          value: calculateCAGR(firstAnnual?.netProfit, lastAnnual?.netProfit, cagrYears),
        },
        {
          label: 'Asset CAGR',
          value: calculateCAGR(firstAnnual?.totalAssets, lastAnnual?.totalAssets, cagrYears),
        },
        {
          label: 'Equity CAGR',
          value: calculateCAGR(firstAnnual?.ownCapital, lastAnnual?.ownCapital, cagrYears),
        },
      ]
    : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-emerald-600 px-5 py-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Growth
        </h3>
      </div>
      <div className="p-4">
        {latestGrowth ? (
          <>
            {/* YoY Growth Metrics */}
            <div className="space-y-2 mb-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                Year-over-Year ({latestGrowth.year})
              </div>
              {growthMetrics.map((metric) => {
                const val = latestGrowth[metric.key] as number | null;
                return (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between py-1.5 px-3 rounded-md bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{metric.label}</span>
                    <TrendArrow value={val} />
                  </div>
                );
              })}
            </div>

            {/* CAGR Section */}
            {cagrMetrics.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                  CAGR ({cagrYears}yr)
                </div>
                {cagrMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between py-1.5 px-3 rounded-md bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{metric.label}</span>
                    <span
                      className={`text-sm font-medium ${
                        metric.value === null
                          ? 'text-gray-400'
                          : metric.value >= 0
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}
                    >
                      {formatPercent(metric.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400 py-4 text-center">
            No growth data available
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthPanel;
