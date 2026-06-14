/**
 * AnomalyCard — displays one detected issue with severity-based styling.
 */
const SEVERITY_STYLES = {
  HIGH: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-500',
  },
  MEDIUM: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-500',
  },
  LOW: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-500',
  },
};

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

function AnomalyCard({
  anomaly,
  decision,
  onApprove,
  onReject,
  onSkip,
  disabled = false,
}) {
  const styles = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.MEDIUM;
  const issueLabel = ISSUE_LABELS[anomaly.issueType] || anomaly.issueType;

  return (
    <div className={`rounded-xl border ${styles.border} bg-white p-5 shadow-md`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Row {anomaly.rowNumber}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
              {anomaly.severity}
            </span>
            <span className="text-sm font-semibold text-gray-900">{issueLabel}</span>
          </div>

          <p className="mt-3 text-sm text-gray-700">{anomaly.description}</p>

          <div className={`mt-3 rounded-lg ${styles.bg} px-4 py-3`}>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Suggested action
            </p>
            <p className="mt-1 text-sm text-gray-800">{anomaly.suggestedAction}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
              decision === 'approved'
                ? 'bg-green-600 text-white'
                : 'border border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={disabled}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
              decision === 'rejected'
                ? 'bg-red-600 text-white'
                : 'border border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
              decision === 'skipped'
                ? 'bg-amber-500 text-white'
                : 'border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnomalyCard;
