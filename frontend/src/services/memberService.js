/**
 * Member API calls — nested under /groups/:groupId/members
 */
import api from './api';

export async function getMembers(groupId) {
  const response = await api.get(`/groups/${groupId}/members`);
  return response.data;
}

export async function addMember(groupId, email, joinedAt) {
  const response = await api.post(`/groups/${groupId}/members`, { email, joinedAt });
  return response.data;
}

/** Mark member as left — sets leftAt (soft delete). Uses PATCH for broad server compatibility. */
export async function markLeft(groupId, memberId, leaveDate) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/remove`, {
    leftAt: leaveDate,
  });
  return response.data;
}

/** Update leave date for an inactive member. */
export async function editLeaveDate(groupId, memberId, leaveDate) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/leave-date`, {
    leftAt: leaveDate,
  });
  return response.data;
}

/** Reactivate a former member — clears leftAt. */
export async function reactivateMember(groupId, memberId) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/reactivate`);
  return response.data;
}

// Legacy aliases
export async function removeMember(groupId, memberId, leftAt) {
  return markLeft(groupId, memberId, leftAt);
}

export async function updateJoinDate(groupId, memberId, joinedAt) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/join-date`, {
    joinedAt,
  });
  return response.data;
}

export async function updateLeaveDate(groupId, memberId, leftAt) {
  return editLeaveDate(groupId, memberId, leftAt);
}
