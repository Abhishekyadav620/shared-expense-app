/**
 * Reusable expense card — used in ExpensesPage and GroupDetailsPage.
 */
import { Link } from 'react-router-dom';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(amount, currency) {
  const symbol = currency === 'USD' ? '$' : '₹';
  return `${symbol}${parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const splitLabels = {
  EQUAL: 'Equal',
  EXACT: 'Exact',
  PERCENTAGE: 'Percentage',
  SHARE: 'Share',
};

function ExpenseCard({ expense, onDelete, showGroup = true, disabled = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to={`/expenses/${expense.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-indigo-600"
          >
            {expense.title}
          </Link>
          {showGroup && expense.group && (
            <p className="mt-0.5 text-sm text-gray-500">{expense.group.name}</p>
          )}
        </div>
        <p className="shrink-0 text-lg font-semibold text-indigo-600">
          {formatAmount(expense.amount, expense.currency)}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-gray-500">Amount</dt>
          <dd className="font-semibold text-indigo-600">
            {formatAmount(expense.amount, expense.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Currency</dt>
          <dd className="font-medium text-gray-900">{expense.currency}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Paid by</dt>
          <dd className="font-medium text-gray-900">{expense.payer?.name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Date</dt>
          <dd className="font-medium text-gray-900">{formatDate(expense.expenseDate)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Split type</dt>
          <dd className="font-medium text-gray-900">{splitLabels[expense.splitType]}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
        <Link
          to={`/expenses/${expense.id}`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
        >
          View
        </Link>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(expense)}
            disabled={disabled}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default ExpenseCard;
