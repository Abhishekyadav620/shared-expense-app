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

export async function removeMember(groupId, memberId, leftAt) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/remove`, {
    leftAt,
  });
  return response.data;
}

export async function updateJoinDate(groupId, memberId, joinedAt) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/join-date`, {
    joinedAt,
  });
  return response.data;
}

export async function updateLeaveDate(groupId, memberId, leftAt) {
  const response = await api.patch(`/groups/${groupId}/members/${memberId}/leave-date`, {
    leftAt,
  });
  return response.data;
}
