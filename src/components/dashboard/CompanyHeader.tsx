import React from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import CompanySelector from '../shared/CompanySelector';
import { formatCompactCurrency, formatNumber } from '../../utils/formatters';

const CompanyHeader: React.FC = () => {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const toggleCompany = useFinancialStore((s) => s.toggleCompany);

  const selectedCompanies = companies.filter((c) =>
    selectedCompanyIds.includes(c.id)
  );
  const primaryCompany = selectedCompanies[0];
  const latestAnnual =
    primaryCompany?.annuals[primaryCompany.annuals.length - 1] ?? null;

  const currency = dataset?.currency ?? '';
  const yearsRange =
    dataset && dataset.years.length > 0
      ? `${dataset.years[0]}\u2013${dataset.years[dataset.years.length - 1]}`
      : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Dataset info bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-500">
        {dataset?.sourceFileName && (
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {dataset.sourceFileName}
          </span>
        )}
        {currency && (
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-gray-700">Currency:</span> {currency}
          </span>
        )}
        {yearsRange && (
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-gray-700">Period:</span> {yearsRange}
          </span>
        )}
      </div>

      {/* Quick stats for primary company */}
      {primaryCompany && latestAnnual && (
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            {primaryCompany.name}
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({latestAnnual.year})
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickStat
              label="Revenue"
              value={formatCompactCurrency(latestAnnual.turnover, currency)}
            />
            <QuickStat
              label="Net Profit"
              value={formatCompactCurrency(latestAnnual.netProfit, currency)}
            />
            <QuickStat
              label="Total Assets"
              value={formatCompactCurrency(latestAnnual.totalAssets, currency)}
            />
            <QuickStat
              label="Employees"
              value={
                latestAnnual.employeeCount !== null
                  ? formatNumber(latestAnnual.employeeCount)
                  : '\u2014'
              }
            />
          </div>
        </div>
      )}

      {/* Company selector */}
      {companies.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">
            Companies
          </div>
          <CompanySelector
            companies={companies}
            selectedIds={selectedCompanyIds}
            onToggle={toggleCompany}
          />
        </div>
      )}
    </div>
  );
};

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default CompanyHeader;
