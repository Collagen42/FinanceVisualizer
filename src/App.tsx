import { useState } from 'react';
import { useFinancialStore } from './store/useFinancialStore';
import { FileDropZone } from './components/upload/FileDropZone';
import { ParsingStatus } from './components/upload/ParsingStatus';
import DashboardView from './components/dashboard/DashboardView';
import CompetitorOverviewTable from './components/competitor/CompetitorOverviewTable';

const TABS = [
  { id: 'v1', label: 'Visualizer' },
  { id: 'v2', label: 'Competitor Analysis' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function App() {
  const { dataset, parsingProgress, reset } = useFinancialStore();
  const [activeTab, setActiveTab] = useState<TabId>('v1');

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-6">
          <h1 className="text-xl font-bold text-gray-800">FinanceVisualizer</h1>
          {dataset && (
            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}
          {dataset && (
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
            >
              Upload New File
            </button>
          )}
        </div>
      </header>

      <main className={`mx-auto px-4 py-6 ${activeTab === 'v2' ? 'max-w-full' : 'max-w-[1400px]'}`}>
        {!dataset && parsingProgress.stage === 'idle' && <FileDropZone />}
        {!dataset && parsingProgress.stage !== 'idle' && parsingProgress.stage !== 'done' && (
          <ParsingStatus />
        )}
        {dataset && activeTab === 'v1' && <DashboardView />}
        {dataset && activeTab === 'v2' && <CompetitorOverviewTable />}
      </main>
    </div>
  );
}

export default App;
