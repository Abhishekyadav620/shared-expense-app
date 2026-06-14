/**
 * Dashboard — overview cards and recent activity.
 * Stats are placeholders until group/expense APIs are built (Part 2–4).
 */
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const statCards = [
  { label: 'Total Groups', value: '0', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Total Expenses', value: '0', color: 'text-gray-900', bg: 'bg-slate-100' },
  { label: 'Amount Paid', value: '₹0', color: 'text-green-500', bg: 'bg-green-50' },
  { label: 'Amount Owed', value: '₹0', color: 'text-amber-500', bg: 'bg-amber-50' },
];

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s an overview of your shared expenses
          </p>
        </div>

        {/* Stat cards — Stripe-inspired grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="mt-1 text-sm text-gray-500">Your latest expenses and group updates</p>

          <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No activity yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create a group and add expenses to see activity here
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
