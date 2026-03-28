# FinanceVisualizer

A financial analysis dashboard that transforms uploaded financial statements (PDF/XLSX) into interactive visualizations, ratios, and composite scores. Supports multi-company comparison.

**Live demo:** https://collagen42.github.io/FinanceVisualizer/

## Features

### Data Import
- Upload financial statements as **PDF** or **Excel** (XLSX/XLS) files
- Automatic parsing and field mapping from accounting labels (supports Romanian financial statement format)
- Multi-company datasets supported — one file can contain multiple companies

### Dashboard Sections

#### Financial Score
A composite 0–100 score inspired by the [GuruFocus GF Score](https://www.gurufocus.com/term/gf-score/), displayed as a radar chart with 5 dimensions. See [Financial Score Methodology](#financial-score-methodology) below.

#### Summary Panels
- **Financial Strength** — Debt-to-Equity, Current Ratio, Quick Ratio, Equity Ratio
- **Profitability** — Operating Margin, Net Margin, ROE, ROA, ROIC
- **Growth** — Revenue, Net Profit, Operating Profit YoY growth + CAGR

#### Income Statement Charts
- **Revenue & Profit** — Bar chart of Turnover, Operating Profit, Net Profit per year
- **Margin Trends** — Line chart of Operating and Net Margin over time
- **Efficiency** — Asset Turnover, Revenue/Employee, Profit/Employee

#### Balance Sheet Charts
- **Assets Composition** — Stacked bar (Fixed Assets, Stocks, Receivables, Cash)
- **Liabilities & Equity** — Stacked bar of liability components
- **Balance Sheet Evolution** — Line chart of Total Assets, Own Capital, Total Debts
- **Working Capital** — Bar chart colored by positive/negative

#### Key Ratios Charts
- **Profitability Ratios** — ROE, ROA, ROIC over time
- **Leverage Ratios** — Debt-to-Equity, Debt-to-Assets, Equity Ratio
- **Liquidity Ratios** — Current Ratio, Quick Ratio

#### Peer Comparison Table
Sortable table comparing all companies across key metrics for a selected year.

#### Financial Statements Table
Detailed data table showing raw financial statement figures.

### Multi-Company Comparison
When multiple companies are selected, charts automatically switch to comparison mode — overlaying data from each company using distinct colors.

---

## Financial Score Methodology

The Financial Score is a composite metric (0–100) that rates a company across 5 dimensions, each scored 0–10. It is inspired by the GuruFocus GF Score but adapted for financial statement data (no market/stock price data required).

Two of the original GF Score dimensions (GF Value and Momentum) require stock market price data. These are replaced with **Efficiency** and **Stability**, which are fully calculable from financial statements.

### Scoring Approach

Each sub-indicator is scored using **linear interpolation** between a floor (0 points) and a ceiling (10 points), clamped to [0, 10]. Within each dimension, the score is the average of all non-null sub-indicators.

### Dimension 1: Profitability (weight: 25%)

| Sub-indicator | Formula | Floor (0 pts) | Ceiling (10 pts) |
|---|---|---|---|
| Operating Margin | Operating Profit / Revenue × 100 | -5% | 20% |
| Net Margin | Net Profit / Revenue × 100 | -5% | 15% |
| ROE | Net Profit / Own Capital × 100 | 0% | 25% |
| ROA | Net Profit / Total Assets × 100 | 0% | 15% |
| Piotroski F-Score | 9-point binary test (see below) | 0 | 9 |

**Piotroski F-Score** awards 1 point each for:
1. Positive ROA
2. Positive operating cash flow (Net Profit + Depreciation > 0)
3. Increasing ROA vs prior year
4. Operating cash flow > Net Profit (earnings quality)
5. Decreasing long-term debt ratio vs prior year
6. Increasing current ratio vs prior year
7. No new shares issued (default 1 — not tracked)
8. Increasing gross margin vs prior year
9. Increasing asset turnover vs prior year

### Dimension 2: Growth (weight: 20%)

| Sub-indicator | Formula | Floor (0 pts) | Ceiling (10 pts) |
|---|---|---|---|
| Revenue Growth | (Revenue_t - Revenue_t-1) / \|Revenue_t-1\| × 100 | -10% | 30% |
| Net Profit Growth | (NetProfit_t - NetProfit_t-1) / \|NetProfit_t-1\| × 100 | -20% | 40% |
| Operating Profit Growth | (OpProfit_t - OpProfit_t-1) / \|OpProfit_t-1\| × 100 | -20% | 40% |
| Revenue CAGR | (Revenue_end / Revenue_start)^(1/years) - 1 | -5% | 20% |
| Equity Growth | (Equity_t - Equity_t-1) / \|Equity_t-1\| × 100 | -10% | 20% |

### Dimension 3: Financial Strength (weight: 25%)

| Sub-indicator | Formula | Floor (0 pts) | Ceiling (10 pts) | Direction |
|---|---|---|---|---|
| Debt-to-Equity | Total Debts / Own Capital | 3.0 | 0.0 | Lower is better |
| Equity Ratio | Own Capital / Total Assets | 0.1 | 0.7 | Higher is better |
| Current Ratio | Current Assets / Short-Term Debts | 0.5 | 2.5 | Higher is better |
| Quick Ratio | (Current Assets - Stocks) / Short-Term Debts | 0.2 | 1.5 | Higher is better |
| Cash-to-Debt | Cash & Equivalents / Total Debts | 0.0 | 0.5 | Higher is better |

### Dimension 4: Efficiency (weight: 15%)

Replaces the GF Score's "GF Value" dimension (which requires market price data).

| Sub-indicator | Formula | Floor (0 pts) | Ceiling (10 pts) |
|---|---|---|---|
| Asset Turnover | Revenue / Total Assets | 0.1 | 2.0 |
| Revenue per Employee | Revenue / Employee Count | 50,000 | 500,000 |
| Profit per Employee | Net Profit / Employee Count | 0 | 50,000 |
| ROIC | Operating Profit / (Own Capital + Long-Term Debts) × 100 | 0% | 20% |

### Dimension 5: Stability (weight: 15%)

Replaces the GF Score's "Momentum" dimension (which requires stock price data). Measures consistency of financial performance over time. **Requires at least 3 years of data**; returns null otherwise.

| Sub-indicator | Metric | Floor (0 pts) | Ceiling (10 pts) | Direction |
|---|---|---|---|---|
| Operating Margin Stability | CV of Operating Margin across years | CV = 1.5 | CV = 0.0 | Lower CV is better |
| Net Margin Stability | CV of Net Margin across years | CV = 1.5 | CV = 0.0 | Lower CV is better |
| Revenue Stability | CV of Revenue across years | CV = 1.0 | CV = 0.0 | Lower CV is better |
| Profit Consistency | % of years with positive Net Profit | 0% | 100% | Higher is better |

*CV = Coefficient of Variation (standard deviation / |mean|). A lower CV indicates more stable/consistent performance.*

### Overall Score Calculation

The overall score (0–100) is a weighted average of the 5 dimensions:

```
Overall = (Σ dimension_score × dimension_weight) / (Σ non-null weights) × 10
```

If a dimension is null (insufficient data), its weight is redistributed proportionally among the remaining dimensions.

| Score Range | Rating | Color |
|---|---|---|
| 80–100 | Strong | Green |
| 60–79 | Good | Blue |
| 40–59 | Average | Amber |
| 0–39 | Weak | Red |

---

## Tech Stack

- **React 18** + TypeScript
- **Vite** — build tool
- **Recharts** — charting (line, bar, stacked bar, radar)
- **Zustand** — state management
- **Tailwind CSS** — styling
- **TanStack Table** — sortable data tables
- **XLSX** — Excel file parsing
- **PDF.js** — PDF file parsing

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173/FinanceVisualizer/
