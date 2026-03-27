import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { useFinancialStore } from '../../store/useFinancialStore';
import { CompanyFinancials } from '../../types/financial';
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatNumber,
  getRatioColor,
} from '../../utils/formatters';
import { RATIO_THRESHOLDS } from '../../types/financial';

interface PeerRow {
  id: string;
  name: string;
  isReference: boolean;
  isSelected: boolean;
  revenue: number | null;
  netProfit: number | null;
  totalAssets: number | null;
  ownCapital: number | null;
  employees: number | null;
  roe: number | null;
  roa: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
}

const columnHelper = createColumnHelper<PeerRow>();

export default function PeerComparisonTable() {
  const { companies, dataset, selectedCompanyIds } = useFinancialStore();
  const [sorting, setSorting] = useState<SortingState>([]);

  const currency = dataset?.currency ?? 'T RON';
  const availableYears = dataset?.years ?? [];
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear ?? (availableYears.length > 0 ? availableYears[availableYears.length - 1] : null);

  const data = useMemo<PeerRow[]>(() => {
    if (!companies.length || activeYear === null) return [];

    return companies.map((company) => {
      const yearData = company.annuals.find((a) => a.year === activeYear) ?? null;
      const yearRatios = company.ratios.find((r) => r.year === activeYear) ?? null;
      const yearGrowth = company.growth.find((g) => g.year === activeYear) ?? null;

      return {
        id: company.id,
        name: company.name,
        isReference: company.isReferenceCompany,
        isSelected: selectedCompanyIds.includes(company.id),
        revenue: yearData?.turnover ?? null,
        netProfit: yearData?.netProfit ?? null,
        totalAssets: yearData?.totalAssets ?? null,
        ownCapital: yearData?.ownCapital ?? null,
        employees: yearData?.employeeCount ?? null,
        roe: yearRatios?.roe ?? null,
        roa: yearRatios?.roa ?? null,
        operatingMargin: yearRatios?.operatingMargin ?? null,
        netMargin: yearRatios?.netMargin ?? null,
        debtToEquity: yearRatios?.debtToEquity ?? null,
        currentRatio: yearRatios?.currentRatio ?? null,
        revenueGrowth: yearGrowth?.revenueGrowth ?? null,
      };
    });
  }, [companies, selectedCompanyIds, activeYear]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Company',
        cell: (info) => (
          <span className={info.row.original.isReference ? 'font-bold' : ''}>
            {info.getValue()}
          </span>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('revenue', {
        header: 'Revenue',
        cell: (info) => formatCurrency(info.getValue(), currency),
        enableSorting: true,
      }),
      columnHelper.accessor('netProfit', {
        header: 'Net Profit',
        cell: (info) => formatCurrency(info.getValue(), currency),
        enableSorting: true,
      }),
      columnHelper.accessor('totalAssets', {
        header: 'Total Assets',
        cell: (info) => formatCurrency(info.getValue(), currency),
        enableSorting: true,
      }),
      columnHelper.accessor('ownCapital', {
        header: 'Own Capital',
        cell: (info) => formatCurrency(info.getValue(), currency),
        enableSorting: true,
      }),
      columnHelper.accessor('employees', {
        header: 'Employees',
        cell: (info) => formatNumber(info.getValue()),
        enableSorting: true,
      }),
      columnHelper.accessor('roe', {
        header: 'ROE %',
        cell: (info) => {
          const value = info.getValue();
          const colorClass = getRatioColor(value, RATIO_THRESHOLDS.roe);
          return (
            <span className={`inline-block w-full rounded px-2 py-0.5 text-center ${colorClass}`}>
              {formatPercent(value)}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('roa', {
        header: 'ROA %',
        cell: (info) => {
          const value = info.getValue();
          const colorClass = getRatioColor(value, RATIO_THRESHOLDS.roa);
          return (
            <span className={`inline-block w-full rounded px-2 py-0.5 text-center ${colorClass}`}>
              {formatPercent(value)}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('operatingMargin', {
        header: 'Op. Margin %',
        cell: (info) => {
          const value = info.getValue();
          const colorClass = getRatioColor(value, RATIO_THRESHOLDS.operatingMargin);
          return (
            <span className={`inline-block w-full rounded px-2 py-0.5 text-center ${colorClass}`}>
              {formatPercent(value)}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('netMargin', {
        header: 'Net Margin %',
        cell: (info) => {
          const value = info.getValue();
          const colorClass = getRatioColor(value, RATIO_THRESHOLDS.netMargin);
          return (
            <span className={`inline-block w-full rounded px-2 py-0.5 text-center ${colorClass}`}>
              {formatPercent(value)}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('debtToEquity', {
        header: 'D/E Ratio',
        cell: (info) => {
          const value = info.getValue();
          const colorClass = getRatioColor(value, RATIO_THRESHOLDS.debtToEquity);
          return (
            <span className={`inline-block w-full rounded px-2 py-0.5 text-center ${colorClass}`}>
              {formatRatio(value)}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('currentRatio', {
        header: 'Current Ratio',
        cell: (info) => {
          const value = info.getValue();
          const colorClass = getRatioColor(value, RATIO_THRESHOLDS.currentRatio);
          return (
            <span className={`inline-block w-full rounded px-2 py-0.5 text-center ${colorClass}`}>
              {formatRatio(value)}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('revenueGrowth', {
        header: 'Rev Growth %',
        cell: (info) => {
          const value = info.getValue();
          if (value === null) return <span className="text-gray-400">—</span>;
          const color = value >= 0 ? 'text-emerald-600' : 'text-red-600';
          return <span className={`font-medium ${color}`}>{formatPercent(value)}</span>;
        },
        enableSorting: true,
      }),
    ],
    [currency]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!companies.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No data available. Upload a financial report to get started.
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white shadow-sm">
      {availableYears.length > 1 && (
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <span className="text-sm font-medium text-gray-600">Year:</span>
          <div className="flex gap-1">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  year === activeYear
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 ${
                      header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                    } ${index === 0 ? 'sticky left-0 z-10 bg-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <span className="text-blue-600">▲</span>,
                        desc: <span className="text-blue-600">▼</span>,
                      }[header.column.getIsSorted() as string] ?? (
                        header.column.getCanSort() ? (
                          <span className="text-gray-300">▲</span>
                        ) : null
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => {
              const isReference = row.original.isReference;
              const isSelected = row.original.isSelected;

              let rowBg = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
              if (isReference) rowBg = 'bg-blue-50';
              else if (isSelected) rowBg = 'bg-blue-50/30';

              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 transition-colors hover:bg-gray-100/50 ${rowBg}`}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      className={`whitespace-nowrap px-3 py-2.5 ${
                        cellIndex === 0
                          ? `sticky left-0 z-10 ${isReference ? 'bg-blue-50' : isSelected ? 'bg-blue-50/30' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`
                          : ''
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
