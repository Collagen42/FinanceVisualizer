import React, { useMemo, useState } from 'react';
import { useFinancialStore } from '../../store/useFinancialStore';
import { calculateFinancialScore } from '../../calculations/financialScore';
import { FinancialScoreRadarChart } from '../charts/FinancialScoreRadarChart';
import { FinancialScoreResult } from '../../types/financial';

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function getBarColor(score: number | null): string {
  if (score === null) return 'bg-gray-200';
  if (score >= 7) return 'bg-emerald-500';
  if (score >= 5) return 'bg-blue-500';
  if (score >= 3) return 'bg-amber-400';
  return 'bg-red-400';
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const InfoTooltip: React.FC = () => (
  <div className="relative group inline-block ml-2">
    <button className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold leading-none hover:bg-gray-300 transition-colors flex items-center justify-center">
      i
    </button>
    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute left-0 top-7 z-50 w-[420px] max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-xs text-gray-600">
      <p className="text-sm font-semibold text-gray-800 mb-2">Financial Score Methodology</p>
      <p className="mb-3">
        Composite score (0–100) across 5 dimensions, each scored 0–10 using linear interpolation between a floor (0 pts) and ceiling (10 pts). The overall score is a weighted average of non-null dimensions, scaled to 0–100.
      </p>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 mb-1">Profitability (25%)</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li><strong>Operating Margin</strong> — Op. Profit / Revenue. Floor: -5%, Ceiling: 20%</li>
          <li><strong>Net Margin</strong> — Net Profit / Revenue. Floor: -5%, Ceiling: 15%</li>
          <li><strong>ROE</strong> — Net Profit / Own Capital. Floor: 0%, Ceiling: 25%</li>
          <li><strong>ROA</strong> — Net Profit / Total Assets. Floor: 0%, Ceiling: 15%</li>
          <li><strong>Piotroski F-Score</strong> — 9-point binary test: positive ROA, positive cash flow, increasing ROA, earnings quality, decreasing LT debt ratio, increasing current ratio, no dilution, increasing gross margin, increasing asset turnover. Floor: 0, Ceiling: 9</li>
        </ul>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 mb-1">Growth (20%)</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li><strong>Revenue Growth</strong> — YoY change. Floor: -10%, Ceiling: 30%</li>
          <li><strong>Net Profit Growth</strong> — YoY change. Floor: -20%, Ceiling: 40%</li>
          <li><strong>Op. Profit Growth</strong> — YoY change. Floor: -20%, Ceiling: 40%</li>
          <li><strong>Revenue CAGR</strong> — Compound annual growth over all years. Floor: -5%, Ceiling: 20%</li>
          <li><strong>Equity Growth</strong> — YoY change. Floor: -10%, Ceiling: 20%</li>
        </ul>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 mb-1">Financial Strength (25%)</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li><strong>Debt-to-Equity</strong> — Total Debts / Own Capital. Floor: 3.0, Ceiling: 0.0 (lower is better)</li>
          <li><strong>Equity Ratio</strong> — Own Capital / Total Assets. Floor: 0.1, Ceiling: 0.7</li>
          <li><strong>Current Ratio</strong> — Current Assets / ST Debts. Floor: 0.5, Ceiling: 2.5</li>
          <li><strong>Quick Ratio</strong> — (Current Assets - Stocks) / ST Debts. Floor: 0.2, Ceiling: 1.5</li>
          <li><strong>Cash-to-Debt</strong> — Cash / Total Debts. Floor: 0.0, Ceiling: 0.5</li>
        </ul>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 mb-1">Efficiency (15%)</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li><strong>Asset Turnover</strong> — Revenue / Total Assets. Floor: 0.1, Ceiling: 2.0</li>
          <li><strong>Revenue/Employee</strong> — Floor: 50k, Ceiling: 500k</li>
          <li><strong>Profit/Employee</strong> — Floor: 0, Ceiling: 50k</li>
          <li><strong>ROIC</strong> — Op. Profit / (Own Capital + LT Debts). Floor: 0%, Ceiling: 20%</li>
        </ul>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 mb-1">Stability (15%)</p>
        <p className="mb-1 text-gray-500">Requires 3+ years of data. Measures consistency via coefficient of variation (CV = stddev / |mean|).</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li><strong>Op. Margin Stability</strong> — CV of operating margin. Floor: CV=1.5, Ceiling: CV=0.0</li>
          <li><strong>Net Margin Stability</strong> — CV of net margin. Floor: CV=1.5, Ceiling: CV=0.0</li>
          <li><strong>Revenue Stability</strong> — CV of revenue. Floor: CV=1.0, Ceiling: CV=0.0</li>
          <li><strong>Profit Consistency</strong> — % of years with positive net profit. Floor: 0%, Ceiling: 100%</li>
        </ul>
      </div>

      <div className="border-t border-gray-100 pt-2 mt-2">
        <p className="text-gray-500">Score ranges: <span className="text-emerald-600 font-medium">80–100 Strong</span> · <span className="text-blue-600 font-medium">60–79 Good</span> · <span className="text-amber-500 font-medium">40–59 Average</span> · <span className="text-red-500 font-medium">0–39 Weak</span></p>
      </div>
    </div>
  </div>
);

const FinancialScorePanel: React.FC = () => {
  const { companies, selectedCompanyIds, dataset } = useFinancialStore();
  const years = dataset?.years ?? [];

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selectedCompanyIds.includes(c.id)),
    [companies, selectedCompanyIds]
  );

  const [selectedYear, setSelectedYear] = useState<number>(() =>
    years.length > 0 ? years[years.length - 1] : 0
  );

  const scores: FinancialScoreResult[] = useMemo(
    () => selectedCompanies.map((c) => calculateFinancialScore(c, selectedYear)),
    [selectedCompanies, selectedYear]
  );

  if (selectedCompanies.length === 0 || years.length === 0) return null;

  const isMultiCompany = selectedCompanies.length > 1;
  const primaryScore = scores[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-800">Financial Score</h2>
          <InfoTooltip />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`grid gap-6 ${isMultiCompany ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
        {/* Radar Chart */}
        <div>
          <FinancialScoreRadarChart companies={selectedCompanies} year={selectedYear} />
        </div>

        {/* Score Breakdown */}
        <div>
          {isMultiCompany ? (
            <div className="space-y-4">
              {scores.map((score, idx) => (
                <div key={score.companyId} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{score.companyName}</span>
                    <span className={`text-xl font-bold ml-auto ${getScoreColor(score.overall)}`}>
                      {score.overall ?? '—'}
                      <span className="text-sm font-normal text-gray-400">/100</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {score.dimensions.map((dim) => (
                      <div key={dim.name} className="text-center">
                        <div className="text-[10px] text-gray-500 truncate">{dim.name}</div>
                        <div className={`text-xs font-semibold ${dim.score !== null ? 'text-gray-700' : 'text-gray-300'}`}>
                          {dim.score !== null ? dim.score.toFixed(1) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="text-sm text-gray-500 mb-1">Overall Score</div>
                <span className={`text-4xl font-bold ${getScoreColor(primaryScore.overall)}`}>
                  {primaryScore.overall ?? '—'}
                </span>
                <span className="text-lg text-gray-400">/100</span>
              </div>

              <div className="space-y-3">
                {primaryScore.dimensions.map((dim) => (
                  <div key={dim.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{dim.name}</span>
                      <span className="text-xs text-gray-500">
                        {dim.score !== null ? `${dim.score.toFixed(1)}/10` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getBarColor(dim.score)}`}
                        style={{ width: `${dim.score !== null ? (dim.score / 10) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialScorePanel;
