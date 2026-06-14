/**
 * Anomaly detection HTTP handler.
 */
const anomalyDetectionService = require('../services/anomalyDetectionService');

/**
 * POST /api/import/anomalies
 * Body: { rows: object[], groupId?: number }
 */
async function detectAnomalies(req, res, next) {
  try {
    const { rows, groupId } = req.body;
    const userId = req.user.id;

    const anomalies = await anomalyDetectionService.detectAnomalies(rows, groupId, userId);

    res.status(200).json({
      success: true,
      anomalies,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  detectAnomalies,
};
