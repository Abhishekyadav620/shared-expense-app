/**
 * Member card — name, email, dates, status badge, and leave-management actions.
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
  onMarkLeft,
  onEditJoinDate,
  onEditLeaveDate,
  onReactivate,
  disabled = false,
}) {
  const isActive = member.leftAt === null;
  const initials = member.user?.name
    ? member.user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-md transition hover:shadow-lg ${
        isActive ? 'border-green-100' : 'border-red-100 opacity-95'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900">{member.user?.name || 'Unknown'}</p>
            <p className="text-sm text-gray-500">{member.user?.email}</p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isActive ? '🟢 Active' : '🔴 Inactive'}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">Joined Date</dt>
          <dd className="font-medium text-gray-900">{formatDate(member.joinedAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{isActive ? 'Left Date' : 'Left Date'}</dt>
          <dd className={`font-medium ${isActive ? 'text-gray-400' : 'text-red-600'}`}>
            {formatDate(member.leftAt)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-gray-500">Status</dt>
          <dd className={`font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {isActive ? (
          <>
            <button
              type="button"
              onClick={() => onMarkLeft(member)}
              disabled={disabled}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => onMarkLeft(member)}
              disabled={disabled}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Mark Left
            </button>
            <button
              type="button"
              onClick={() => onEditJoinDate(member)}
              disabled={disabled}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Edit Join Date
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEditLeaveDate(member)}
              disabled={disabled}
              className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              Edit Leave Date
            </button>
            <button
              type="button"
              onClick={() => onReactivate(member)}
              disabled={disabled}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
            >
              Reactivate
            </button>
            <button
              type="button"
              onClick={() => onEditJoinDate(member)}
              disabled={disabled}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Edit Join Date
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MemberCard;
