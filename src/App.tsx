import { useFinancialStore } from './store/useFinancialStore';
import { FileDropZone } from './components/upload/FileDropZone';
import { ParsingStatus } from './components/upload/ParsingStatus';
import DashboardView from './components/dashboard/DashboardView';

function App() {
  const { dataset, parsingProgress, reset } = useFinancialStore();

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">FinanceVisualizer</h1>
        {dataset && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
          >
            Upload New File
          </button>
        )}
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {!dataset && parsingProgress.stage === 'idle' && <FileDropZone />}
        {!dataset && parsingProgress.stage !== 'idle' && parsingProgress.stage !== 'done' && (
          <ParsingStatus />
        )}
        {dataset && <DashboardView />}
      </main>
    </div>
  );
}

export default App;
