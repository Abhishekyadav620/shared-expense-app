/**
 * Group details page — overview of a single group.
 * Add Member / Add Expense buttons are placeholders until Part 3 & 4.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getGroupById } from '../services/groupService';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function GroupDetailsPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getGroupById(id);
      setGroup(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/groups"
          className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Groups
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-500">{error}</p>
            <Link
              to="/groups"
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Return to Groups
            </Link>
          </div>
        ) : (
          <>
            {/* Group info card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{group.name}</h1>
                  <p className="mt-1 text-sm text-gray-500">Group overview and quick actions</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled
                    title="Member management coming in Part 3"
                    className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    + Add Member
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Expense management coming in Part 4"
                    className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    + Add Expense
                  </button>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-100 p-4">
                  <dt className="text-sm font-medium text-gray-500">Creator</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {group.creator?.name || 'Unknown'}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {formatDate(group.createdAt)}
                  </dd>
                </div>
                <div className="rounded-lg bg-indigo-50 p-4">
                  <dt className="text-sm font-medium text-gray-500">Members</dt>
                  <dd className="mt-1 text-base font-semibold text-indigo-600">
                    {group._count?.members ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <dt className="text-sm font-medium text-gray-500">Expenses</dt>
                  <dd className="mt-1 text-base font-semibold text-green-500">
                    {group._count?.expenses ?? 0}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Placeholder sections for Part 3 & 4 */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                <p className="mt-1 text-sm text-gray-500">Group members will appear here</p>
                <div className="mt-6 rounded-lg border border-dashed border-slate-200 py-10 text-center">
                  <p className="text-sm text-gray-400">Coming in Part 3</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
                <p className="mt-1 text-sm text-gray-500">Group expenses will appear here</p>
                <div className="mt-6 rounded-lg border border-dashed border-slate-200 py-10 text-center">
                  <p className="text-sm text-gray-400">Coming in Part 4</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default GroupDetailsPage;
