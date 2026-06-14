/**
 * Final import API calls.
 */
import api from './api';

/**
 * POST /import/finalize
 * Body: { groupId, allRows, totalRows, actionsTaken, anomalyCount, usdToInrRate }
 */
export async function finalizeImport(payload) {
  const response = await api.post('/import/finalize', payload);
  return response.data;
}
