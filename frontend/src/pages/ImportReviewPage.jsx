/**
 * Import review page — anomaly dashboard with row-level policy actions.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnomalyCard from '../components/AnomalyCard';
import SummaryCard from '../components/SummaryCard';
import ReviewModal from '../components/ReviewModal';
import EmptyState from '../components/EmptyState';
import { getAllGroups } from '../services/groupService';
import { detectAnomalies } from '../services/anomalyService';
import { finalizeImport } from '../services/finalImportService';

function anomalyKey(anomaly) {
  return `${anomaly.rowNumber}-${anomaly.issueType}`;
}

function getActionsForIssue(issueType) {
  switch (issueType) {
    case 'DUPLICATE_EXPENSE':
    case 'EXACT_DUPLICATE':
    case 'CONFLICTING_DUPLICATE':
      return [
        { label: 'Keep first', value: 'kept_first' },
        { label: 'Keep second', value: 'kept_second' },
        { label: 'Merge', value: 'merged' },
        { label: 'Skip row', value: 'skip_row' },
      ];
    case 'AMBIGUOUS_DATE':
      return [
        { label: 'Treat as Apr 5', value: 'april_5' },
        { label: 'Treat as May 4', value: 'may_4' },
        { label: 'Skip row', value: 'skip_row' },
      ];
    case 'SETTLEMENT_AS_EXPENSE':
      return [
        { label: 'Move to settlement', value: 'stored' },
        { label: 'Keep as expense', value: 'approved' },
        { label: 'Skip row', value: 'skip_row' },
      ];
    case 'NEGATIVE_AMOUNT':
      return [
        { label: 'Treat as refund', value: 'approved' },
        { label: 'Skip row', value: 'skip_row' },
      ];
    case 'MEMBER_LEFT_BEFORE_EXPENSE':
      return [
        { label: 'Remove from split', value: 'remove_inactive' },
        { label: 'Skip row', value: 'skip_row' },
      ];
    case 'INVALID_PERCENTAGE_SPLIT':
      return [
        { label: 'Skip row', value: 'skip_row' },
      ];
    case 'MISSING_AMOUNT':
    case 'MISSING_DATE':
    case 'MISSING_PAYER':
    case 'MISSING_RECEIVER':
    case 'UNKNOWN_SPLIT_TYPE':
    case 'INVALID_EXACT_SPLIT':
    case 'ZERO_AMOUNT':
      return [{ label: 'Skip row', value: 'skip_row' }];
    default:
      return [
        { label: 'Apply policy', value: 'approved' },
        { label: 'Skip row', value: 'skip_row' },
      ];
  }
}

function hasBlockingAnomaly(anomaly) {
  return Boolean(anomaly?.needsReview);
}

function ImportReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [rows, setRows] = useState(location.state?.rows || []);
  const [anomalies, setAnomalies] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [usdToInrRate, setUsdToInrRate] = useState(83);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [reviewAnomaly, setReviewAnomaly] = useState(null);

  useEffect(() => {
    getAllGroups()
      .then((res) => {
        const list = res.data || [];
        setGroups(list);
        if (list.length > 0) setSelectedGroupId(String(list[0].id));
      })
      .catch(() => setError('Failed to load groups'));
  }, []);

  const runDetection = useCallback(async () => {
    if (rows.length === 0) {
      setError('No parsed rows to review. Upload a CSV first.');
      return;
    }

    setLoading(true);
    setError('');
    setDecisions({});

    try {
      const result = await detectAnomalies(rows, selectedGroupId || undefined, usdToInrRate);
      setAnomalies(result.anomalies || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to detect anomalies');
    } finally {
      setLoading(false);
    }
  }, [rows, selectedGroupId, usdToInrRate]);

  useEffect(() => {
    if (rows.length > 0 && selectedGroupId) runDetection();
  }, [rows, selectedGroupId, runDetection]);

  const counts = useMemo(() => {
    const high = anomalies.filter((a) => a.severity === 'HIGH').length;
    const medium = anomalies.filter((a) => a.severity === 'MEDIUM').length;
    const low = anomalies.filter((a) => a.severity === 'LOW').length;
    const needsReview = anomalies.filter((a) => hasBlockingAnomaly(a) && !decisions[anomalyKey(a)]).length;
    return { total: anomalies.length, high, medium, low, needsReview };
  }, [anomalies, decisions]);

  const setDecision = (anomaly, decision) => {
    setDecisions((prev) => ({ ...prev, [anomalyKey(anomaly)]: decision }));
    setReviewAnomaly(null);
  };

  const reviewedCount = Object.keys(decisions).length;

  const readyToImport = useMemo(() => {
    const blockingUnresolved = anomalies.filter(
      (a) => hasBlockingAnomaly(a) && !decisions[anomalyKey(a)]
    );
    return blockingUnresolved.length === 0 ? rows.length : Math.max(0, rows.length - blockingUnresolved.length);
  }, [anomalies, decisions, rows.length]);

  const buildActionsTaken = () =>
    anomalies.map((anomaly) => ({
      rowNumber: anomaly.rowNumber,
      issueType: anomaly.issueType,
      actionTaken: decisions[anomalyKey(anomaly)] || (anomaly.needsReview ? 'pending' : 'auto'),
    }));

  const handleFinalizeImport = async () => {
    if (!selectedGroupId) {
      setError('Select a group before importing.');
      return;
    }

    const unresolved = anomalies.filter((a) => hasBlockingAnomaly(a) && !decisions[anomalyKey(a)]);
    if (unresolved.length > 0) {
      setError(`Resolve ${unresolved.length} blocking anomal${unresolved.length === 1 ? 'y' : 'ies'} before importing.`);
      setReviewAnomaly(unresolved[0]);
      return;
    }

    setImporting(true);
    setError('');

    try {
      const result = await finalizeImport({
        groupId: Number(selectedGroupId),
        allRows: rows,
        totalRows: rows.length,
        actionsTaken: buildActionsTaken(),
        anomalyCount: anomalies.length,
        usdToInrRate,
      });

      navigate('/import/report', { state: { report: result.report } });
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const steps = [
    { label: 'Upload CSV', done: true },
    { label: 'Detect anomalies', done: anomalies.length > 0 || (!loading && rows.length > 0) },
    { label: 'Review policies', done: counts.needsReview === 0 && anomalies.length > 0 },
    { label: 'Import report', done: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link to="/import" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            ← Back to upload
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Import Review</h1>
          <p className="mt-1 text-sm text-gray-500">
            Step 2–4: detect anomalies, apply policies, then finalize import
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <span
              key={step.label}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                step.done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {index + 1}. {step.label}
            </span>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No rows to review"
            description="Upload a CSV file first, then return here to review anomalies."
            actionLabel="Upload CSV"
            actionTo="/import"
          />
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <label htmlFor="group" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Target group
                </label>
                <select
                  id="group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 sm:max-w-xs"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="usdRate" className="mb-1.5 block text-sm font-medium text-gray-700">
                  USD → INR rate
                </label>
                <input
                  id="usdRate"
                  type="number"
                  min="1"
                  step="0.01"
                  value={usdToInrRate}
                  onChange={(e) => setUsdToInrRate(Number(e.target.value) || 83)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 sm:w-32"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={runDetection}
                  disabled={loading || importing}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading ? 'Scanning…' : 'Re-scan anomalies'}
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeImport}
                  disabled={importing || loading}
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? 'Importing…' : `Finalize import (${rows.length} rows)`}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard label="Total anomalies" value={counts.total} />
              <SummaryCard label="High severity" value={counts.high} variant="danger" />
              <SummaryCard label="Medium severity" value={counts.medium} variant="warning" />
              <SummaryCard label="Low severity" value={counts.low} variant="success" />
              <SummaryCard label="Needs review" value={counts.needsReview} variant="warning" />
            </div>

            {!loading && anomalies.length === 0 && !error && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
                No anomalies detected. {rows.length} row{rows.length !== 1 ? 's' : ''} ready to import.
              </div>
            )}

            {anomalies.length > 0 && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Detected issues</h2>
                  <span className="text-sm text-gray-500">
                    {reviewedCount} of {anomalies.length} reviewed
                  </span>
                </div>

                <div className="space-y-4">
                  {anomalies.map((anomaly) => {
                    const key = anomalyKey(anomaly);
                    const actions = getActionsForIssue(anomaly.issueType).map((action) => ({
                      ...action,
                      className:
                        action.value === 'skip_row'
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-green-200 text-green-700 hover:bg-green-50',
                    }));
                    return (
                      <AnomalyCard
                        key={key}
                        anomaly={anomaly}
                        decision={decisions[key]}
                        actions={actions}
                        onAction={(action) => setDecision(anomaly, action)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {reviewAnomaly && (
        <ReviewModal
          anomaly={reviewAnomaly}
          decision={decisions[anomalyKey(reviewAnomaly)]}
          actions={getActionsForIssue(reviewAnomaly.issueType).map((action) => ({
            ...action,
            className: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
          }))}
          onAction={(action) => setDecision(reviewAnomaly, action)}
          onClose={() => setReviewAnomaly(null)}
        />
      )}
    </div>
  );
}

export default ImportReviewPage;
