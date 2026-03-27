import { useState, useMemo } from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import { AnnualFinancials } from '../../types/financial';
import { formatCurrency } from '../../utils/formatters';

interface LineItem {
  key: keyof AnnualFinancials;
  label: string;
  isTotal: boolean;
  isMajorTotal?: boolean;
}

const balanceSheetItems: LineItem[] = [
  { key: 'fixedAssets', label: 'Fixed Assets', isTotal: true },
  { key: 'currentAssets', label: 'Current Assets', isTotal: true },
  { key: 'stocks', label: '  Stocks', isTotal: false },
  { key: 'receivables', label: '  Receivables', isTotal: false },
  { key: 'cashAndEquivalents', label: '  Cash & Bank Accounts', isTotal: false },
  { key: 'totalAssets', label: 'Total Assets', isTotal: true, isMajorTotal: true },
  { key: 'shortTermDebts', label: 'Short-term Debts', isTotal: true },
  { key: 'longTermDebts', label: 'Long-term Debts', isTotal: true },
  { key: 'totalDebts', label: 'Total Debts', isTotal: true, isMajorTotal: true },
  { key: 'ownCapital', label: 'Own Capital', isTotal: true, isMajorTotal: true },
];

const profitLossItems: LineItem[] = [
  { key: 'turnover', label: 'Turnover (Revenue)', isTotal: true, isMajorTotal: true },
  { key: 'grossProfit', label: 'Gross Profit', isTotal: true },
  { key: 'operatingProfit', label: 'Operating Profit', isTotal: true },
  { key: 'netProfit', label: 'Net Profit', isTotal: true, isMajorTotal: true },
  { key: 'depreciation', label: 'Depreciation', isTotal: false },
  { key: 'employeeCount', label: 'Employees', isTotal: false },
];

function getValueFromAnnual(annual: AnnualFinancials, key: keyof AnnualFinancials): number | null {
  const val = annual[key];
  if (typeof val === 'number') return val;
  return null;
}

export default function FinancialStatementsTable() {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    balanceSheet: true,
    profitLoss: true,
  });

  const currency = dataset?.currency ?? 'T RON';

  const primaryCompany = useMemo(() => {
    if (!selectedCompanyIds.length || !companies.length) return null;
    return companies.find((c) => c.id === selectedCompanyIds[0]) ?? null;
  }, [companies, selectedCompanyIds]);

  const sortedAnnuals = useMemo(() => {
    if (!primaryCompany) return [];
    return [...primaryCompany.annuals].sort((a, b) => a.year - b.year);
  }, [primaryCompany]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!primaryCompany || !sortedAnnuals.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        Select a company to view financial statements.
      </div>
    );
  }

  const renderSection = (
    title: string,
    sectionKey: string,
    items: LineItem[],
    showPercentOfTotal: boolean
  ) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <div key={sectionKey} className="mb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex w-full items-center gap-2 rounded-t-lg bg-gray-100 px-4 py-3 text-left font-semibold text-gray-800 transition-colors hover:bg-gray-200"
        >
          <span
            className={`inline-block text-xs text-gray-500 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
          {title}
        </button>

        {isExpanded && (
          <div className="overflow-x-auto border border-t-0 border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Line Item
                  </th>
                  {sortedAnnuals.map((annual) => (
                    <th
                      key={annual.year}
                      className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600"
                    >
                      {annual.year}
                    </th>
                  ))}
                  {showPercentOfTotal &&
                    sortedAnnuals.map((annual) => (
                      <th
                        key={`pct-${annual.year}`}
                        className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400"
                      >
                        % {annual.year}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isIndented = item.label.startsWith('  ');
                  const fontClass = item.isMajorTotal
                    ? 'font-bold text-lg'
                    : item.isTotal
                      ? 'font-semibold'
                      : 'text-gray-700';
                  const borderClass = item.isMajorTotal
                    ? 'border-t-2 border-gray-300'
                    : '';
                  const bgClass =
                    item.isMajorTotal
                      ? 'bg-gray-50'
                      : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50/30';

                  return (
                    <tr
                      key={item.key}
                      className={`border-b border-gray-100 ${borderClass} ${bgClass}`}
                    >
                      <td className={`whitespace-nowrap px-4 py-2 ${fontClass}`}>
                        {isIndented ? (
                          <span className="pl-4">{item.label.trim()}</span>
                        ) : (
                          item.label
                        )}
                      </td>
                      {sortedAnnuals.map((annual) => {
                        const value = getValueFromAnnual(annual, item.key);
                        const isNegative = value !== null && value < 0;
                        const isEmployees = item.key === 'employeeCount';
                        const formatted = isEmployees
                          ? value !== null
                            ? value.toLocaleString('de-DE')
                            : '—'
                          : formatCurrency(value, currency);

                        return (
                          <td
                            key={annual.year}
                            className={`whitespace-nowrap px-4 py-2 text-right ${fontClass} ${
                              isNegative ? 'text-red-600' : ''
                            }`}
                          >
                            {formatted}
                          </td>
                        );
                      })}
                      {showPercentOfTotal &&
                        sortedAnnuals.map((annual) => {
                          const value = getValueFromAnnual(annual, item.key);
                          const totalAssets = getValueFromAnnual(annual, 'totalAssets');
                          let pctStr = '—';
                          if (
                            value !== null &&
                            totalAssets !== null &&
                            totalAssets !== 0 &&
                            item.key !== 'employeeCount'
                          ) {
                            const pct = (value / totalAssets) * 100;
                            pctStr = `${pct.toFixed(1)}%`;
                          }
                          return (
                            <td
                              key={`pct-${annual.year}`}
                              className="whitespace-nowrap px-4 py-2 text-right text-gray-400"
                            >
                              {pctStr}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        Financial Statements — {primaryCompany.name}
      </h3>
      {renderSection('Balance Sheet', 'balanceSheet', balanceSheetItems, true)}
      {renderSection('Profit & Loss', 'profitLoss', profitLossItems, false)}
    </div>
  );
}
