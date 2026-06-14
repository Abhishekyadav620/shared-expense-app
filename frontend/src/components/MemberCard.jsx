/**
 * Reusable member card — shows user info, membership dates, and actions.
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MemberCard({
  member,
  onRemove,
  onUpdateJoinDate,
  onUpdateLeaveDate,
  disabled = false,
}) {
  const isActive = !member.leftAt;
  const initials = member.user?.name
    ? member.user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900">{member.user?.name || 'Unknown'}</p>
            <p className="text-sm text-gray-500">{member.user?.email}</p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isActive ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-gray-500'
          }`}
        >
          {isActive ? 'Active' : 'Left'}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">Joined</dt>
          <dd className="font-medium text-gray-900">{formatDate(member.joinedAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Left</dt>
          <dd className="font-medium text-gray-900">{formatDate(member.leftAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {isActive && (
          <button
            type="button"
            onClick={() => onRemove(member)}
            disabled={disabled}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={() => onUpdateJoinDate(member)}
          disabled={disabled}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Edit Join Date
        </button>
        {!isActive && (
          <button
            type="button"
            onClick={() => onUpdateLeaveDate(member)}
            disabled={disabled}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Edit Leave Date
          </button>
        )}
      </div>
    </div>
  );
}

export default MemberCard;
