/**
 * Import report page — post-import summary with download option.
 */
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ImportReportCard from '../components/ImportReportCard';
import SummaryCard from '../components/SummaryCard';
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
  INCONSISTENT_NAME: 'Inconsistent Name',
  MISSING_CURRENCY: 'Missing Currency',
  AMBIGUOUS_DATE: 'Ambiguous Date',
  DECIMAL_PRECISION: 'Decimal Precision',
  EQUAL_WITH_SHARES: 'Equal Split with Shares',
  MEMBER_LEFT_BEFORE_EXPENSE: 'Member Left Before Expense',
  TEMPORARY_PARTICIPANT: 'Temporary Participant',
  DUPLICATE_EXPENSE: 'Duplicate Expense',
  NAME_NORMALIZED: 'Name Normalized',
  DUPLICATE_EXPENSE: 'Duplicate Expense',
};

const ACTION_STYLES = {
  approved: 'bg-green-100 text-green-700',
  kept_first: 'bg-indigo-100 text-indigo-700',
  kept_second: 'bg-indigo-100 text-indigo-700',
  merged: 'bg-emerald-100 text-emerald-700',
  stored: 'bg-green-100 text-green-700',
  skipped: 'bg-amber-100 text-amber-700',
  skip_row: 'bg-amber-100 text-amber-700',
  pending: 'bg-slate-100 text-slate-700',
  converted: 'bg-blue-100 text-blue-700',
  ignored: 'bg-slate-100 text-slate-700',
};

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  const headers = [
    'rowNumber',
    'description',
    'problemType',
    'severity',
    'actionTaken',
    'needsReview',
    'status',
  ];
  const escapeValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeValue(row[header])).join(','));
  }
  return lines.join('\n');
}

function openPdfPreview(report) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=700');
  if (!win) return;

  const summaryRows = Object.entries(report.summary || {})
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${value}</td></tr>`)
    .join('');

  const detailRows = (report.reportRows || [])
    .map(
      (row) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${row.rowNumber}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${row.description}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${row.problemType}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${row.actionTaken}</td></tr>`
    )
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>Import report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
          h1, h2 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; }
          th { text-align: left; background: #f8fafc; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; }
          td { vertical-align: top; }
        </style>
      </head>
      <body>
        <h1>Import Report</h1>
        <p>Generated ${new Date(report.generatedAt).toLocaleString('en-IN')}</p>
        <h2>Summary</h2>
        <table><tbody>${summaryRows}</tbody></table>
        <h2>Row details</h2>
        <table>
          <thead><tr><th>Row</th><th>Description</th><th>Problem type</th><th>Action</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

function ImportReportPage() {
  const location = useLocation();
  const report = location.state?.report;

  const actionsTaken = report?.actionsTaken || [];
  const reportRows = report?.reportRows || [];
  const summary = report?.summary || {};

  const actionCounts = useMemo(() => {
    const approved = actionsTaken.filter((a) => ['approved', 'stored', 'merged'].includes(a.actionTaken)).length;
    const skipped = actionsTaken.filter((a) => ['skipped', 'skip_row'].includes(a.actionTaken)).length;
    const pending = actionsTaken.filter((a) => a.actionTaken === 'pending').length;
    return { approved, skipped, pending };
  }, [actionsTaken]);

  const handleDownloadJson = () => {
    if (!report) return;

    downloadText(
      `import-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      'application/json'
    );
  };

  const handleDownloadCsv = () => {
    if (!report) return;
    downloadText(
      `import-report-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(reportRows),
      'text/csv'
    );
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    openPdfPreview(report);
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50"
            >
              Print / Save PDF
            </button>
          </div>
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

        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Policy summary</h2>
              <p className="mt-1 text-sm text-gray-500">
                What the import engine corrected, converted, or flagged for review
              </p>
            </div>
            <span className="text-sm text-gray-500">
              USD rate: {report.usdToInrRate || '—'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Warnings" value={summary.warnings || 0} variant="warning" />
            <SummaryCard label="Duplicates" value={summary.duplicates || 0} variant="info" />
            <SummaryCard label="Refunds" value={summary.refunds || 0} variant="success" />
            <SummaryCard label="Settlements" value={summary.settlements || 0} variant="info" />
            <SummaryCard label="Currency conversions" value={summary.currencyConversions || 0} variant="warning" />
            <SummaryCard label="Rows requiring review" value={summary.rowsRequiringReview || 0} variant="warning" />
          </div>
        </section>

        {reportRows.length > 0 && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Row audit trail</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Row</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Problem type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Severity</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Action taken</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Needs review</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {reportRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.problemType}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-gray-400">{row.rowNumber}</td>
                      <td className="px-4 py-3 text-gray-900">{row.description}</td>
                      <td className="px-4 py-3 text-gray-700">{row.problemType}</td>
                      <td className="px-4 py-3 text-gray-700">{row.severity}</td>
                      <td className="px-4 py-3 text-gray-900">{row.actionTaken}</td>
                      <td className="px-4 py-3 text-gray-700">{row.needsReview ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === 'Imported' || row.status === 'Ready'
                              ? 'bg-green-100 text-green-700'
                              : row.status === 'Needs Review'
                                ? 'bg-amber-100 text-amber-700'
                                : row.status === 'Skipped'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {actionCounts.pending} pending
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
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ACTION_STYLES[action.actionTaken] || 'bg-slate-100 text-slate-700'}`}
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
