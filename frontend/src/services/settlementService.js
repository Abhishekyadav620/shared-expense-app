/**
 * Settlement API calls.
 */
import api from './api';

/**
 * GET /groups/:groupId/settlements
 */
export async function getGroupSettlements(groupId) {
  const response = await api.get(`/groups/${groupId}/settlements`);
  return response.data;
}

/**
 * POST /settlements
 * Body: { groupId, payerId, receiverId, amount, paymentDate }
 */
export async function createSettlement(data) {
  const response = await api.post('/settlements', data);
  return response.data;
}

/**
 * DELETE /settlements/:id
 */
export async function deleteSettlement(settlementId) {
  const response = await api.delete(`/settlements/${settlementId}`);
  return response.data;
}
