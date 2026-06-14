/**
 * CSV upload control — choose file, upload with progress, loading state.
 */
import { useRef, useState } from 'react';

function CSVUpload({ onUpload, disabled = false }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleChooseFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setError('');
    setProgress(0);

    if (!selected) {
      setFile(null);
      return;
    }

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file || !onUpload) return;

    setLoading(true);
    setError('');
    setProgress(0);

    try {
      await onUpload(file, setProgress);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>
      <p className="mt-1 text-sm text-gray-500">
        Select a CSV file with expense data. Rows will be parsed for review.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleChooseFile}
          disabled={loading || disabled}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Choose file
        </button>

        <span className="truncate text-sm text-gray-500">
          {file ? file.name : 'No file selected'}
        </span>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || loading || disabled}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 sm:ml-auto"
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {loading && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Upload progress</span>
            <span className="text-indigo-600">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

export default CSVUpload;
