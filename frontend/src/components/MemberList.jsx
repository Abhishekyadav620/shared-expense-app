/**
 * Member list — renders all members (active and inactive) as MemberCards.
 */
import MemberCard from './MemberCard';

function MemberList({
  members,
  onMarkLeft,
  onEditJoinDate,
  onEditLeaveDate,
  onReactivate,
  actionLoading,
  loading,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
        <p className="text-sm font-medium text-gray-900">No members yet</p>
        <p className="mt-1 text-sm text-gray-500">Add members by their registered email</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          onMarkLeft={onMarkLeft}
          onEditJoinDate={onEditJoinDate}
          onEditLeaveDate={onEditLeaveDate}
          onReactivate={onReactivate}
          disabled={actionLoading === member.id}
        />
      ))}
    </div>
  );
}

export default MemberList;
