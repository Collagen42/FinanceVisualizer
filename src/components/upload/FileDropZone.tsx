import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFinancialStore } from '../../store/useFinancialStore';
import { parsePDF } from '../../parsing/pdfParser';
import { parseXLSX } from '../../parsing/xlsxParser';

export function FileDropZone() {
  const { setDataset, setParsingProgress } = useFinancialStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let dataset;

        if (ext === 'pdf') {
          dataset = await parsePDF(file, setParsingProgress);
        } else if (ext === 'xlsx' || ext === 'xls') {
          dataset = await parseXLSX(file, setParsingProgress);
        } else {
          setParsingProgress({
            stage: 'error',
            message: `Unsupported file type: .${ext}. Please upload a PDF or XLSX file.`,
          });
          return;
        }

        setParsingProgress({ stage: 'done', message: 'Parsing complete!' });
        setDataset(dataset);
      } catch (err) {
        setParsingProgress({
          stage: 'error',
          message: `Parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    },
    [setDataset, setParsingProgress]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        {...getRootProps()}
        className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-5xl text-gray-300">
            {isDragActive ? '📂' : '📊'}
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive
                ? 'Drop your file here...'
                : 'Drag & drop a financial report'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              PDF or XLSX files with Balance Sheet & P&L data
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            or click to browse
          </button>
        </div>
      </div>
    </div>
  );
}
