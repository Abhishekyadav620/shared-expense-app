/**
 * Balance breakdown modal — Rohan's traceability requirement.
 * Shows every expense/settlement line that contributes to a member's balance.
 */
function formatAmount(value) {
  return Math.abs(Number(value || 0)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BalanceBreakdownModal({ memberName, breakdown, usdToInrRate, onClose }) {
  if (!breakdown) return null;

  const { lines = [], summary = {} } = breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Balance breakdown</h2>
            <p className="mt-1 text-sm text-slate-500">
              {memberName} — every line that makes up the net balance
            </p>
            {usdToInrRate && (
              <p className="mt-1 text-xs text-slate-400">USD → INR rate: {usdToInrRate}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Total paid</p>
            <p className="font-semibold text-slate-900">₹{formatAmount(summary.paid)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total share</p>
            <p className="font-semibold text-slate-900">₹{formatAmount(summary.share)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Net balance</p>
            <p
              className={`font-semibold ${
                summary.balance > 0
                  ? 'text-emerald-700'
                  : summary.balance < 0
                    ? 'text-rose-700'
                    : 'text-slate-700'
              }`}
            >
              {summary.balance > 0 && '+'}
              {summary.balance < 0 && '−'}₹{formatAmount(summary.balance)}
            </p>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No contributing transactions.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4 text-right">Effect (INR)</th>
                  <th className="pb-2 text-right">Running balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, index) => (
                  <tr key={`${line.type}-${line.expenseId || line.settlementId}-${index}`}>
                    <td className="py-3 pr-4 text-slate-600">
                      {line.date ? new Date(line.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-900">
                      {line.description}
                      {line.originalCurrency === 'USD' && (
                        <span className="ml-1 text-xs text-slate-400">
                          (${formatAmount(line.originalAmount)} USD)
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-medium ${
                        line.effect > 0 ? 'text-emerald-700' : line.effect < 0 ? 'text-rose-700' : 'text-slate-600'
                      }`}
                    >
                      {line.effect > 0 && '+'}
                      {line.effect < 0 && '−'}₹{formatAmount(line.effect)}
                    </td>
                    <td className="py-3 text-right text-slate-700">
                      {line.runningBalance >= 0 ? '' : '−'}₹{formatAmount(line.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default BalanceBreakdownModal;
