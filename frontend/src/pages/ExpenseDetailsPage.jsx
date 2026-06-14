/**
 * Expense details page — full expense view with participant breakdown.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getExpenseById, deleteExpense } from '../services/expenseService';

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
  EQUAL: 'Equal Split',
  EXACT: 'Exact Amount',
  PERCENTAGE: 'Percentage',
  SHARE: 'Share Based',
};

function ExpenseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await getExpenseById(id);
        setExpense(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load expense');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${expense.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteExpense(id);
      navigate(`/groups/${expense.group?.id || expense.groupId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={expense ? `/groups/${expense.groupId}` : '/expenses'}
          className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{expense.title}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {expense.group?.name} · {formatDate(expense.expenseDate)}
                </p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">
                {formatAmount(expense.amount, expense.currency)}
              </p>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-100 p-4">
                <dt className="text-sm text-gray-500">Paid by</dt>
                <dd className="mt-1 font-semibold text-gray-900">{expense.payer?.name}</dd>
              </div>
              <div className="rounded-lg bg-slate-100 p-4">
                <dt className="text-sm text-gray-500">Currency</dt>
                <dd className="mt-1 font-semibold text-gray-900">{expense.currency}</dd>
              </div>
              <div className="rounded-lg bg-indigo-50 p-4">
                <dt className="text-sm text-gray-500">Split type</dt>
                <dd className="mt-1 font-semibold text-indigo-600">
                  {splitLabels[expense.splitType]}
                </dd>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <dt className="text-sm text-gray-500">Participants</dt>
                <dd className="mt-1 font-semibold text-green-500">
                  {expense.participants?.length}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">Split breakdown</h2>
              <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {expense.participants?.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{p.user?.name}</p>
                      <p className="text-sm text-gray-500">{p.user?.email}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatAmount(p.shareAmount, expense.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Expense'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ExpenseDetailsPage;
