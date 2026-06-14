/**
 * Modal to edit the leave date of an inactive member.
 */
import { useEffect, useState } from 'react';

function toInputDate(dateString) {
  return new Date(dateString).toISOString().split('T')[0];
}

function EditLeaveDateModal({ isOpen, onClose, onSubmit, loading, member }) {
  const [leaveDate, setLeaveDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && member?.leftAt) {
      setLeaveDate(toInputDate(member.leftAt));
      setError('');
    }
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!leaveDate) {
      setError('Leave date is required');
      return;
    }

    onSubmit({ leaveDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Edit Leave Date</h2>
        <p className="mt-1 text-sm text-gray-500">
          Update when <span className="font-medium">{member.user?.name}</span> left the group
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="editLeaveDate" className="mb-1.5 block text-sm font-medium text-gray-700">
              Leave Date
            </label>
            <input
              id="editLeaveDate"
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
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
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditLeaveDateModal;
