/**
 * Final import HTTP handler — persists reviewed rows and returns a report.
 */
const finalImportService = require('../services/finalImportService');

async function finalizeImport(req, res, next) {
  try {
    const { groupId, allRows, totalRows, actionsTaken, anomalyCount, usdToInrRate } = req.body;
    const userId = req.user.id;

    const result = await finalImportService.finalizeImport({
      groupId,
      userId,
      allRows,
      totalRows,
      actionsTaken,
      anomalyCount,
      usdToInrRate: usdToInrRate || process.env.USD_TO_INR_RATE || 83,
    });

    res.status(200).json({
      success: true,
      report: result.report,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  finalizeImport,
};
