/**
 * Dashboard — overview cards and recent activity from live API data.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getAllGroups } from '../services/groupService';
import { getAllExpenses } from '../services/expenseService';

function formatAmount(amount, currency) {
  const symbol = currency === 'USD' ? '$' : '₹';
  return `${symbol}${parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

function DashboardPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, expensesRes] = await Promise.all([
          getAllGroups(),
          getAllExpenses(),
        ]);
        setGroups(groupsRes.data);
        setExpenses(expensesRes.data);
      } catch {
        // Dashboard still renders with zero counts on error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const amountPaid = expenses
    .filter((e) => e.paidBy === user?.id)
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const amountOwed = expenses
    .flatMap((e) => e.participants || [])
    .filter((p) => p.userId === user?.id)
    .reduce((sum, p) => sum + parseFloat(p.shareAmount), 0);

  const statCards = [
    { label: 'Total Groups', value: groups.length, color: 'text-indigo-600' },
    { label: 'Total Expenses', value: expenses.length, color: 'text-gray-900' },
    {
      label: 'Amount Paid',
      value: formatAmount(amountPaid, 'INR'),
      color: 'text-green-500',
    },
    {
      label: 'Your Share',
      value: formatAmount(amountOwed, 'INR'),
      color: 'text-amber-500',
    },
  ];

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s an overview of your shared expenses
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${card.color}`}>
                {loading ? '—' : card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
              <Link to="/expenses" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
            ) : recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No expenses yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    to={`/expenses/${expense.id}`}
                    className="flex items-center justify-between py-3 transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{expense.title}</p>
                      <p className="text-sm text-gray-500">
                        {expense.group?.name} · {formatDate(expense.expenseDate)}
                      </p>
                    </div>
                    <p className="font-semibold text-indigo-600">
                      {formatAmount(expense.amount, expense.currency)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link
                to="/groups/create"
                className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
              >
                Create Group
              </Link>
              <Link
                to="/groups"
                className="block rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-slate-100"
              >
                View Groups
              </Link>
              <Link
                to="/expenses"
                className="block rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-slate-100"
              >
                View Expenses
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
