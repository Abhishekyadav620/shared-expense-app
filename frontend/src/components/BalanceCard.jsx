/**
 * Balance card — shows one user's net balance in a group.
 * Green = should receive, Red = owes money.
 */
function formatAmount(value) {
  const abs = Math.abs(value);
  return abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BalanceCard({ userName, balance, isCurrentUser = false }) {
  const isPositive = balance > 0;
  const isNegative = balance < 0;
  const isSettled = balance === 0;

  const initials = userName
    ? userName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        isCurrentUser ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
              isPositive
                ? 'bg-green-50 text-green-600'
                : isNegative
                  ? 'bg-red-50 text-red-500'
                  : 'bg-slate-100 text-gray-500'
            }`}
          >
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {userName}
              {isCurrentUser && (
                <span className="ml-2 text-xs font-normal text-indigo-600">(You)</span>
              )}
            </p>
            <p className="text-sm text-gray-500">
              {isPositive && 'Should receive'}
              {isNegative && 'Owes money'}
              {isSettled && 'All settled up'}
            </p>
          </div>
        </div>

        <p
          className={`text-lg font-bold ${
            isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {isPositive && '+'}
          {isNegative && '−'}
          ₹{formatAmount(balance)}
        </p>
      </div>
    </div>
  );
}

export default BalanceCard;
