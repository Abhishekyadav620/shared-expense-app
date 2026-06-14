/**
 * Create group page — single form to add a new shared expense group.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { createGroup } from '../services/groupService';

function CreateGroupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await createGroup(name.trim());
      setSuccess('Group created successfully!');
      // Brief success message, then redirect to the new group's details page
      setTimeout(() => {
        navigate(`/groups/${response.data.id}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/groups"
          className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Groups
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Create Group</h1>
            <p className="mt-1 text-sm text-gray-500">
              Start a new group to track shared expenses
            </p>
          </div>

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-500">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Group Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Roommates, Trip to Goa"
                disabled={loading || !!success}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating…' : success ? 'Redirecting…' : 'Create Group'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CreateGroupPage;
