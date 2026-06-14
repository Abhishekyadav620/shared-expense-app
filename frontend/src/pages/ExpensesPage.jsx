/**
 * Expenses page — all expenses with search, filter, and sort.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ExpenseCard from '../components/ExpenseCard';
import EmptyState from '../components/EmptyState';
import { getAllExpenses, deleteExpense } from '../services/expenseService';

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-desc');
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllExpenses();
      setExpenses(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete "${expense.title}"?`)) return;
    setDeleteLoading(expense.id);
    try {
      await deleteExpense(expense.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleteLoading(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.group?.name?.toLowerCase().includes(q) ||
          e.payer?.name?.toLowerCase().includes(q)
      );
    }

    if (currencyFilter !== 'ALL') {
      result = result.filter((e) => e.currency === currencyFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.expenseDate) - new Date(a.expenseDate);
      if (sortBy === 'date-asc') return new Date(a.expenseDate) - new Date(b.expenseDate);
      if (sortBy === 'amount-desc') return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortBy === 'amount-asc') return parseFloat(a.amount) - parseFloat(b.amount);
      return 0;
    });

    return result;
  }, [expenses, search, currencyFilter, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
            <p className="mt-1 text-sm text-gray-500">All shared expenses across your groups</p>
          </div>
          <Link
            to="/groups"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + Add via Group
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search by title, group, or payer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
          />
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600"
          >
            <option value="ALL">All currencies</option>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600"
          >
            <option value="date-desc">Date (newest)</option>
            <option value="date-asc">Date (oldest)</option>
            <option value="amount-desc">Amount (high)</option>
            <option value="amount-asc">Amount (low)</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description={
              expenses.length === 0
                ? 'Create an expense from a group to get started'
                : 'Try adjusting your search or filters'
            }
            actionLabel={expenses.length === 0 ? 'Go to Groups' : undefined}
            actionTo={expenses.length === 0 ? '/groups' : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onDelete={handleDelete}
                disabled={deleteLoading === expense.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ExpensesPage;
