/**
 * SettlementHistoryCard — displays a recorded payment.
 * Example: "Rohan paid Aisha ₹2300.00 on 14 Jun 2026"
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(value) {
  return parseFloat(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SettlementHistoryCard({ settlement, onDelete, disabled = false, currentUserId }) {
  const isPayer = settlement.payer?.id === currentUserId;
  const isReceiver = settlement.receiver?.id === currentUserId;

  return (
    <div className="rounded-xl border border-green-100 bg-white p-5 shadow-md transition hover:shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <p className="font-medium text-gray-900">
              <span className={isPayer ? 'font-semibold text-green-700' : ''}>
                {settlement.payer?.name}
              </span>
              {' paid '}
              <span className={isReceiver ? 'font-semibold text-green-700' : ''}>
                {settlement.receiver?.name}
              </span>
            </p>
            <p className="mt-1 text-sm text-green-600">{formatDate(settlement.paymentDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-green-600">₹{formatAmount(settlement.amount)}</p>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(settlement)}
              disabled={disabled}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettlementHistoryCard;
