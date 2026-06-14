/**
 * Modal to mark an active member as left with a leave date.
 */
import { useEffect, useState } from 'react';

function toInputDate(dateString) {
  return new Date(dateString).toISOString().split('T')[0];
}

function MarkLeftModal({ isOpen, onClose, onSubmit, loading, member, apiError = '' }) {
  const [leaveDate, setLeaveDate] = useState('');
  const [error, setError] = useState('');

  const minDate = member?.joinedAt ? toInputDate(member.joinedAt) : undefined;

  useEffect(() => {
    if (isOpen && member) {
      const today = toInputDate(new Date());
      setLeaveDate(minDate && today < minDate ? minDate : today);
      setError('');
    }
  }, [isOpen, member, minDate]);

  useEffect(() => {
    if (apiError) setError(apiError);
  }, [apiError]);

  if (!isOpen || !member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!leaveDate) {
      setError('Leave date is required');
      return;
    }

    if (minDate && leaveDate < minDate) {
      setError('Leave date cannot be before join date');
      return;
    }

    onSubmit({ leaveDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Mark Left</h2>
        <p className="mt-1 text-sm text-gray-500">
          Record when <span className="font-medium">{member.user?.name}</span> left the group
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="leaveDate" className="mb-1.5 block text-sm font-medium text-gray-700">
              Leave Date
            </label>
            <input
              id="leaveDate"
              type="date"
              value={leaveDate}
              min={minDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            {minDate && (
              <p className="mt-1 text-xs text-gray-500">
                Joined {new Date(member.joinedAt).toLocaleDateString('en-IN')} — leave date must be on or after this
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MarkLeftModal;
