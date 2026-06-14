/**
 * Anomaly detection API calls.
 */
import api from './api';

/**
 * POST /import/anomalies
 * Body: { rows, groupId? }
 */
export async function detectAnomalies(rows, groupId) {
  const response = await api.post('/import/anomalies', {
    rows,
    groupId: groupId ? Number(groupId) : undefined,
  });
  return response.data;
}
