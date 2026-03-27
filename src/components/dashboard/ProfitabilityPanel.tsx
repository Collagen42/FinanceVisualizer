import React from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import RatioCard from './RatioCard';

const ProfitabilityPanel: React.FC = () => {
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
    thresholdKey: string;
  }[] = [
    { label: 'Operating Margin', key: 'operatingMargin', thresholdKey: 'operatingMargin' },
    { label: 'Net Margin', key: 'netMargin', thresholdKey: 'netMargin' },
    { label: 'ROE', key: 'roe', thresholdKey: 'roe' },
    { label: 'ROA', key: 'roa', thresholdKey: 'roa' },
    { label: 'ROIC', key: 'roic', thresholdKey: 'roic' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-purple-600 px-5 py-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Profitability
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
                  ? (previousRatios[card.key] as number | null)
                  : undefined
              }
              thresholdKey={card.thresholdKey}
              format="percent"
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

export default ProfitabilityPanel;
