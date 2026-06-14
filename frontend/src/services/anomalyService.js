/**
 * Anomaly detection API calls.
 */
import api from './api';

/**
 * POST /import/anomalies
 * Body: { rows, groupId?, usdToInrRate? }
 */
export async function detectAnomalies(rows, groupId, usdToInrRate) {
  const response = await api.post('/import/anomalies', {
    rows,
    groupId: groupId ? Number(groupId) : undefined,
    usdToInrRate,
  });
  return response.data;
}
