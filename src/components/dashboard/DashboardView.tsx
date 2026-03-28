import CompanyHeader from './CompanyHeader';
import FinancialScorePanel from './FinancialScorePanel';
import FinancialStrength from './FinancialStrength';
import ProfitabilityPanel from './ProfitabilityPanel';
import GrowthPanel from './GrowthPanel';
import DuPontPanel from './DuPontPanel';
import { RevenueProfitChart } from '../charts/RevenueProfitChart';
import { MarginTrendChart } from '../charts/MarginTrendChart';
import { WaterfallChart } from '../charts/WaterfallChart';
import { AssetsCompositionChart } from '../charts/AssetsCompositionChart';
import { LiabilitiesEquityChart } from '../charts/LiabilitiesEquityChart';
import { BalanceSheetEvolution } from '../charts/BalanceSheetEvolution';
import { WorkingCapitalChart } from '../charts/WorkingCapitalChart';
import { ProfitabilityRatiosChart } from '../charts/ProfitabilityRatiosChart';
import { LeverageRatiosChart } from '../charts/LeverageRatiosChart';
import { LiquidityRatiosChart } from '../charts/LiquidityRatiosChart';
import { EfficiencyChart } from '../charts/EfficiencyChart';
import PeerComparisonTable from '../tables/PeerComparisonTable';
import FinancialStatementsTable from '../tables/FinancialStatementsTable';

const DashboardView = () => {
  return (
    <div className="space-y-6">
      <CompanyHeader />

      <FinancialScorePanel />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinancialStrength />
        <ProfitabilityPanel />
        <GrowthPanel />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Income Statement</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueProfitChart />
          <MarginTrendChart />
          <WaterfallChart />
          <EfficiencyChart />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Balance Sheet</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetsCompositionChart />
          <LiabilitiesEquityChart />
          <BalanceSheetEvolution />
          <WorkingCapitalChart />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Key Ratios</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfitabilityRatiosChart />
          <LeverageRatiosChart />
          <LiquidityRatiosChart />
          <DuPontPanel />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Peer Comparison</h2>
        <PeerComparisonTable />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Financial Statements</h2>
        <FinancialStatementsTable />
      </section>
    </div>
  );
};

export default DashboardView;
