/**
 * Debt simplification API calls.
 */
import api from './api';

/**
 * GET /groups/:groupId/simplified-balances
 * Returns minimum transactions to settle the group.
 */
export async function getSimplifiedBalances(groupId) {
  const response = await api.get(`/groups/${groupId}/simplified-balances`);
  return response.data;
}
