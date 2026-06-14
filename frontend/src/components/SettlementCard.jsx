/**
 * SettlementCard — displays one simplified payment transaction.
 * Example: "Rohan pays Aisha ₹1000.00"
 */
function formatAmount(value) {
  return parseFloat(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SettlementCard({ transaction, currentUserId }) {
  const { fromUser, toUser, amount } = transaction;

  const isPayer = fromUser.userId === currentUserId;
  const isReceiver = toUser.userId === currentUserId;

  return (
    <div className="rounded-xl border border-green-100 bg-white p-5 shadow-md transition hover:shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
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
              <span className={isPayer ? 'font-semibold text-green-700' : ''}>
                {fromUser.userName}
              </span>
              {' pays '}
              <span className={isReceiver ? 'font-semibold text-green-700' : ''}>
                {toUser.userName}
              </span>
            </p>
            <p className="text-sm text-green-600">Minimum payment</p>
          </div>
        </div>

        <p className="text-xl font-bold text-green-600">₹{formatAmount(amount)}</p>
      </div>
    </div>
  );
}

export default SettlementCard;
