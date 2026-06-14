/**
 * Reusable group card — used in GroupsPage grid layout.
 * Displays group summary and View / Edit / Delete action buttons.
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function GroupCard({ group, onView, onEdit, onDelete, disabled = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>

      <div className="mt-4 space-y-2 text-sm text-gray-500">
        <p>
          <span className="font-medium text-gray-700">Created:</span>{' '}
          {formatDate(group.createdAt)}
        </p>
        <p>
          <span className="font-medium text-gray-700">Creator:</span>{' '}
          {group.creator?.name || 'Unknown'}
        </p>
        <p>
          <span className="font-medium text-gray-700">Members:</span>{' '}
          {group._count?.members ?? 0}
        </p>
        <p>
          <span className="font-medium text-gray-700">Expenses:</span>{' '}
          {group._count?.expenses ?? 0}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onView(group.id)}
          disabled={disabled}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onEdit(group)}
          disabled={disabled}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(group)}
          disabled={disabled}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default GroupCard;
