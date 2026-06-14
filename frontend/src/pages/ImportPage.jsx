/**
 * CSV import page — upload, parse preview, success feedback.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CSVUpload from '../components/CSVUpload';
import { uploadCsv } from '../services/importService';

function ImportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const handleUpload = async (file, onProgress) => {
    const result = await uploadCsv(file, onProgress);

    setRows(result.rows || []);
    setRowCount(result.rowCount || 0);
    setSuccessMessage(`Successfully parsed ${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}.`);
  };

  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((key) => key !== 'rowNumber')
      : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Import Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Step 1: Upload CSV → Step 2: Detect anomalies → Step 3: Review → Step 4: Import report
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">1. Upload</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">2. Detect</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">3. Review</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">4. Report</span>
          </div>
        </header>

        <CSVUpload onUpload={handleUpload} />

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {rows.length > 0 && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Parsed rows</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Preview of data read from your CSV (not saved yet)
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                {rowCount} row{rowCount !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => navigate('/import/review', { state: { rows } })}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Review anomalies →
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 text-left font-medium text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">{row.rowNumber}</td>
                      {columns.map((col) => (
                        <td key={col} className="whitespace-nowrap px-4 py-3 text-gray-900">
                          {row[col] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default ImportPage;
