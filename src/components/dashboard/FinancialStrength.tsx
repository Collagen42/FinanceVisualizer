import React from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import RatioCard from './RatioCard';

const FinancialStrength: React.FC = () => {
  const { companies, selectedCompanyIds } = useFinancialStore();

  const selectedCompanies = companies.filter((c) =>
    selectedCompanyIds.includes(c.id)
  );
  const primaryCompany = selectedCompanies[0];

  const latestRatios =
    primaryCompany && primaryCompany.ratios.length > 0
      ? primaryCompany.ratios[primaryCompany.ratios.length - 1]
      : null;

  const previousRatios =
    primaryCompany && primaryCompany.ratios.length > 1
      ? primaryCompany.ratios[primaryCompany.ratios.length - 2]
      : null;

  const ratioCards: {
    label: string;
    key: keyof NonNullable<typeof latestRatios>;
    prevKey: keyof NonNullable<typeof previousRatios>;
    thresholdKey: string;
  }[] = [
    { label: 'Debt-to-Equity', key: 'debtToEquity', prevKey: 'debtToEquity', thresholdKey: 'debtToEquity' },
    { label: 'Current Ratio', key: 'currentRatio', prevKey: 'currentRatio', thresholdKey: 'currentRatio' },
    { label: 'Quick Ratio', key: 'quickRatio', prevKey: 'quickRatio', thresholdKey: 'quickRatio' },
    { label: 'Debt-to-Assets', key: 'debtToAssets', prevKey: 'debtToAssets', thresholdKey: 'debtToAssets' },
    { label: 'Equity Ratio', key: 'equityRatio', prevKey: 'equityRatio', thresholdKey: 'equityRatio' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-blue-600 px-5 py-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Financial Strength
        </h3>
      </div>
      <div className="p-4 grid grid-cols-1 gap-3">
        {latestRatios ? (
          ratioCards.map((card) => (
            <RatioCard
              key={card.key}
              label={card.label}
              value={latestRatios[card.key] as number | null}
              previousValue={
                previousRatios
                  ? (previousRatios[card.prevKey] as number | null)
                  : undefined
              }
              thresholdKey={card.thresholdKey}
              format="ratio"
            />
          ))
        ) : (
          <div className="text-sm text-gray-400 py-4 text-center">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialStrength;
