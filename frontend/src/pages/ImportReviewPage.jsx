/**
 * Import review page — anomaly dashboard with approve / reject / skip decisions.
 * Decisions are stored in local state only — nothing is written to the database.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnomalyCard from '../components/AnomalyCard';
import EmptyState from '../components/EmptyState';
import { getAllGroups } from '../services/groupService';
import { detectAnomalies } from '../services/anomalyService';
import { finalizeImport } from '../services/finalImportService';

function anomalyKey(anomaly) {
  return `${anomaly.rowNumber}-${anomaly.issueType}`;
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

  useEffect(() => {
    getAllGroups()
      .then((res) => {
        const list = res.data || [];
        setGroups(list);
        if (list.length > 0) {
          setSelectedGroupId(String(list[0].id));
        }
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
      const result = await detectAnomalies(rows, selectedGroupId || undefined);
      setAnomalies(result.anomalies || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to detect anomalies');
    } finally {
      setLoading(false);
    }
  }, [rows, selectedGroupId]);

  useEffect(() => {
    if (rows.length > 0 && selectedGroupId) {
      runDetection();
    }
  }, [rows, selectedGroupId, runDetection]);

  const counts = useMemo(() => {
    const high = anomalies.filter((a) => a.severity === 'HIGH').length;
    const medium = anomalies.filter((a) => a.severity === 'MEDIUM').length;
    const low = anomalies.filter((a) => a.severity === 'LOW').length;
    return { total: anomalies.length, high, medium, low };
  }, [anomalies]);

  const setDecision = (anomaly, decision) => {
    setDecisions((prev) => ({
      ...prev,
      [anomalyKey(anomaly)]: decision,
    }));
  };

  const reviewedCount = Object.keys(decisions).length;

  const approvedRows = useMemo(() => {
    const rowAnomalies = new Map();

    for (const anomaly of anomalies) {
      if (!rowAnomalies.has(anomaly.rowNumber)) {
        rowAnomalies.set(anomaly.rowNumber, []);
      }
      rowAnomalies.get(anomaly.rowNumber).push(anomaly);
    }

    return rows.filter((row) => {
      const issues = rowAnomalies.get(row.rowNumber);
      if (!issues || issues.length === 0) return true;

      return issues.every((issue) => decisions[anomalyKey(issue)] === 'approved');
    });
  }, [rows, anomalies, decisions]);

  const buildActionsTaken = () =>
    anomalies.map((anomaly) => ({
      rowNumber: anomaly.rowNumber,
      issueType: anomaly.issueType,
      actionTaken: decisions[anomalyKey(anomaly)] || 'pending',
    }));

  const handleFinalizeImport = async () => {
    if (!selectedGroupId) {
      setError('Select a group before importing.');
      return;
    }

    if (approvedRows.length === 0) {
      setError('No approved rows to import. Approve rows or resolve anomalies first.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const actionsTaken = buildActionsTaken();
      const result = await finalizeImport({
        groupId: Number(selectedGroupId),
        approvedRows,
        allRows: rows,
        totalRows: rows.length,
        actionsTaken,
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/import"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              ← Back to upload
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Import Review</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review anomalies before importing — your decisions are not saved yet
            </p>
          </div>

          {rows.length > 0 && (
            <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
            </span>
          )}
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
            <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="group" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Group context (for membership & settlement checks)
                </label>
                <select
                  id="group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 sm:max-w-xs"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="usdRate" className="mb-1.5 block text-sm font-medium text-gray-700">
                  USD → INR rate (Priya&apos;s trip expenses)
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
                  disabled={importing || loading || approvedRows.length === 0}
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? 'Importing…' : `Finalize import (${approvedRows.length})`}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {!loading && anomalies.length === 0 && !error && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
                No anomalies detected. {approvedRows.length} row{approvedRows.length !== 1 ? 's' : ''}{' '}
                ready to import.
              </div>
            )}

            {anomalies.length > 0 && (
              <>
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
                    <p className="mt-1 text-sm text-gray-500">Total anomalies</p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-red-600">{counts.high}</p>
                    <p className="mt-1 text-sm text-gray-500">High severity</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-amber-600">{counts.medium}</p>
                    <p className="mt-1 text-sm text-gray-500">Medium severity</p>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-600">{counts.low}</p>
                    <p className="mt-1 text-sm text-gray-500">Low severity</p>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Detected issues</h2>
                  <span className="text-sm text-gray-500">
                    {reviewedCount} of {anomalies.length} reviewed
                  </span>
                </div>

                <div className="space-y-4">
                  {anomalies.map((anomaly) => {
                    const key = anomalyKey(anomaly);
                    return (
                      <AnomalyCard
                        key={key}
                        anomaly={anomaly}
                        decision={decisions[key]}
                        onApprove={() => setDecision(anomaly, 'approved')}
                        onReject={() => setDecision(anomaly, 'rejected')}
                        onSkip={() => setDecision(anomaly, 'skipped')}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {rows.length > 0 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => navigate('/import', { state: { rows } })}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Upload a different file
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default ImportReviewPage;
