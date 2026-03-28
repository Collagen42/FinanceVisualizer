import React from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import { formatPercent, formatRatio } from '../../utils/formatters';

const DuPontPanel: React.FC = () => {
  const { companies, selectedCompanyIds } = useFinancialStore();

  const selectedCompanies = companies.filter((c) => selectedCompanyIds.includes(c.id));
  const primaryCompany = selectedCompanies[0];

  const latestRatios =
    primaryCompany && primaryCompany.ratios.length > 0
      ? primaryCompany.ratios[primaryCompany.ratios.length - 1]
      : null;

  const netMargin = latestRatios?.netMargin ?? null;
  const assetTurnover = latestRatios?.assetTurnover ?? null;
  const equityMultiplier = latestRatios?.equityMultiplier ?? null;
  const roe = latestRatios?.roe ?? null;

  // DuPont product: (netMargin% / 100) * assetTurnover * equityMultiplier * 100
  const dupontROE =
    netMargin !== null && assetTurnover !== null && equityMultiplier !== null
      ? (netMargin / 100) * assetTurnover * equityMultiplier * 100
      : null;

  const levers: { label: string; value: number | null; formatted: string; color: string }[] = [
    {
      label: 'Net Margin',
      value: netMargin,
      formatted: formatPercent(netMargin),
      color: 'bg-purple-50 border-purple-200 text-purple-700',
    },
    {
      label: 'Asset Turnover',
      value: assetTurnover,
      formatted: formatRatio(assetTurnover),
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      label: 'Equity Multiplier',
      value: equityMultiplier,
      formatted: formatRatio(equityMultiplier),
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">DuPont ROE Decomposition</h3>

      {latestRatios ? (
        <>
          {/* Formula display */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {levers.map((lever, idx) => (
              <React.Fragment key={lever.label}>
                <div className={`rounded-lg border px-3 py-2 text-center min-w-[90px] ${lever.color}`}>
                  <div className="text-xs font-medium opacity-75">{lever.label}</div>
                  <div className="text-base font-bold">{lever.formatted}</div>
                </div>
                {idx < levers.length - 1 && (
                  <span className="text-gray-400 font-semibold text-lg">×</span>
                )}
              </React.Fragment>
            ))}
            <span className="text-gray-400 font-semibold text-lg">=</span>
            <div className="rounded-lg border px-3 py-2 text-center min-w-[90px] bg-emerald-50 border-emerald-200 text-emerald-700">
              <div className="text-xs font-medium opacity-75">DuPont ROE</div>
              <div className="text-base font-bold">{formatPercent(dupontROE)}</div>
            </div>
          </div>

          {/* Reconciliation note */}
          {roe !== null && dupontROE !== null && Math.abs(roe - dupontROE) > 0.5 && (
            <div className="text-xs text-gray-500 text-center bg-gray-50 rounded px-3 py-2">
              Reported ROE: <span className="font-semibold">{formatPercent(roe)}</span>
              {' '}— small delta is normal (year-end vs. average equity)
            </div>
          )}
          {roe !== null && dupontROE !== null && Math.abs(roe - dupontROE) <= 0.5 && (
            <div className="text-xs text-gray-500 text-center bg-gray-50 rounded px-3 py-2">
              Reconciles with reported ROE: <span className="font-semibold">{formatPercent(roe)}</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-400 py-4 text-center">No data available</div>
      )}
    </div>
  );
};

export default DuPontPanel;
