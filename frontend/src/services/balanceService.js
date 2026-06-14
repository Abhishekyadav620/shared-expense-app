/**
 * Balance API calls.
 */
import api from './api';

/**
 * GET /groups/:groupId/balances
 */
export async function getGroupBalances(groupId, usdToInrRate) {
  const response = await api.get(`/groups/${groupId}/balances`, {
    params: usdToInrRate ? { usdToInrRate } : undefined,
  });
  return response.data;
}

export async function getMemberBalanceBreakdown(groupId, userId, usdToInrRate) {
  const response = await api.get(`/groups/${groupId}/balances/${userId}/breakdown`, {
    params: usdToInrRate ? { usdToInrRate } : undefined,
  });
  return response.data;
}

/**
 * GET /groups/:groupId/balances/simplified
 */
export async function getSimplifiedDebts(groupId) {
  const response = await api.get(`/groups/${groupId}/balances/simplified`);
  return response.data;
}
