/**
 * Import report page — post-import summary with download option.
 */
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ImportReportCard from '../components/ImportReportCard';
import EmptyState from '../components/EmptyState';

const ISSUE_LABELS = {
  EXACT_DUPLICATE: 'Exact Duplicate',
  CONFLICTING_DUPLICATE: 'Conflicting Duplicate',
  NEGATIVE_AMOUNT: 'Negative Amount',
  INACTIVE_USER: 'Inactive User',
  SETTLEMENT_AS_EXPENSE: 'Settlement as Expense',
  INVALID_PERCENTAGE_SPLIT: 'Invalid Percentage Split',
  MISSING_PARTICIPANTS: 'Missing Participants',
  USD_CURRENCY: 'USD Currency',
  MISSING_AMOUNT: 'Missing Amount',
  ZERO_AMOUNT: 'Zero Amount',
  MISSING_DATE: 'Missing Date',
  MISSING_PAYER: 'Missing Payer',
  UNKNOWN_SPLIT_TYPE: 'Unknown Split Type',
  INVALID_EXACT_SPLIT: 'Invalid Exact Split',
  MISSING_RECEIVER: 'Missing Receiver',
};

function ImportReportPage() {
  const location = useLocation();
  const report = location.state?.report;

  const actionsTaken = report?.actionsTaken || [];

  const actionCounts = useMemo(() => {
    const approved = actionsTaken.filter((a) => a.actionTaken === 'approved').length;
    const rejected = actionsTaken.filter((a) => a.actionTaken === 'rejected').length;
    const skipped = actionsTaken.filter((a) => a.actionTaken === 'skipped').length;
    return { approved, rejected, skipped };
  }, [actionsTaken]);

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <EmptyState
            title="No import report"
            description="Complete an import from the review page to see the report here."
            actionLabel="Go to Import"
            actionTo="/import"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/import"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              ← Back to import
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Import Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generated {new Date(report.generatedAt).toLocaleString('en-IN')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Download report
          </button>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ImportReportCard label="Total rows" value={report.totalRows} variant="info" />
          <ImportReportCard
            label="Imported rows"
            value={report.successfulImports}
            variant="success"
          />
          <ImportReportCard label="Skipped rows" value={report.skippedRows} variant="warning" />
          <ImportReportCard
            label="Anomalies found"
            value={report.anomalyCount}
            variant="warning"
          />
        </div>

        {report.importedDetails?.length > 0 && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Imported records</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Row</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Record ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Currency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {report.importedDetails.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-gray-400">{item.rowNumber}</td>
                      <td className="px-4 py-3 capitalize text-gray-900">{item.type}</td>
                      <td className="px-4 py-3 text-gray-900">{item.id}</td>
                      <td className="px-4 py-3 text-gray-500">{item.currency || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Actions taken</h2>
              <p className="mt-1 text-sm text-gray-500">
                Review decisions applied during anomaly screening
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {actionCounts.approved} approved
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {actionCounts.skipped} skipped
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                {actionCounts.rejected} rejected
              </span>
            </div>
          </div>

          {actionsTaken.length === 0 ? (
            <p className="text-sm text-gray-500">No anomaly actions were recorded for this import.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Row</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Issue</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {actionsTaken.map((action, index) => (
                    <tr key={`${action.rowNumber}-${action.issueType}-${index}`}>
                      <td className="px-4 py-3 text-gray-400">{action.rowNumber}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {ISSUE_LABELS[action.issueType] || action.issueType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            action.actionTaken === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : action.actionTaken === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {action.actionTaken}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ImportReportPage;
