/**
 * Final import API calls.
 */
import api from './api';

/**
 * POST /import/finalize
 * Body: { groupId, approvedRows, totalRows, actionsTaken, anomalyCount }
 */
export async function finalizeImport(payload) {
  const response = await api.post('/import/finalize', payload);
  return response.data;
}
