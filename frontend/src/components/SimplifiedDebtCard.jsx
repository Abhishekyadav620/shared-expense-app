/**
 * Simplified debt card — shows one minimum payment to settle the group.
 * Example: "Meera pays Priya ₹300.00"
 */
function formatAmount(value) {
  return parseFloat(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SimplifiedDebtCard({
  fromUserName,
  toUserName,
  amount,
  fromUserId,
  toUserId,
  isCurrentUserPayer,
  isCurrentUserReceiver,
  onRecord,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              <span className={isCurrentUserPayer ? 'text-indigo-600' : ''}>{fromUserName}</span>
              {' pays '}
              <span className={isCurrentUserReceiver ? 'text-indigo-600' : ''}>{toUserName}</span>
            </p>
            <p className="text-sm text-gray-500">Suggested settlement</p>
          </div>
        </div>

        <p className="text-lg font-bold text-amber-500">₹{formatAmount(amount)}</p>
      </div>

      {onRecord && (
        <button
          type="button"
          onClick={() =>
            onRecord({
              fromUserId,
              toUserId,
              amount,
              fromUserName,
              toUserName,
            })
          }
          className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Record Payment
        </button>
      )}
    </div>
  );
}

export default SimplifiedDebtCard;
