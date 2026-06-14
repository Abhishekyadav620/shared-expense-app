/**
 * Modal to add a member by email with an optional join date.
 */
import { useState } from 'react';

function AddMemberModal({ isOpen, onClose, onSubmit, loading }) {
  const [email, setEmail] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    onSubmit({
      email: email.trim(),
      joinedAt: joinedAt || undefined,
    });
  };

  const handleClose = () => {
    setEmail('');
    setJoinedAt('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the email of a registered user to add them to this group
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="member-email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label htmlFor="joined-at" className="mb-1.5 block text-sm font-medium text-gray-700">
              Join Date <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="joined-at"
              type="date"
              value={joinedAt}
              onChange={(e) => setJoinedAt(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:bg-slate-50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMemberModal;
