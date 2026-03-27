import { useFinancialStore } from '../../store/useFinancialStore';

export function ParsingStatus() {
  const { parsingProgress, reset } = useFinancialStore();
  const { stage, currentPage, totalPages, companiesFound, message } = parsingProgress;

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {stage === 'error' ? (
          <div className="space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-600 font-medium">{message}</p>
            <button
              onClick={reset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{message || 'Processing...'}</span>
              {totalPages > 0 && (
                <span>
                  Page {currentPage}/{totalPages}
                </span>
              )}
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>

            {companiesFound > 0 && (
              <p className="text-xs text-gray-500">
                {companiesFound} companies found
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
