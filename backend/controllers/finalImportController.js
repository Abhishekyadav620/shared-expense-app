/**
 * Final import HTTP handler — persists approved rows and returns a report.
 */
const databaseImportService = require('../services/databaseImportService');
const importReportService = require('../services/importReportService');

/**
 * POST /api/import/finalize
 * Body: { groupId, approvedRows, totalRows?, actionsTaken?, anomalyCount? }
 */
async function finalizeImport(req, res, next) {
  try {
    const { groupId, approvedRows, totalRows, actionsTaken, anomalyCount } = req.body;
    const userId = req.user.id;

    const importResult = await databaseImportService.importApprovedRows(
      approvedRows,
      groupId,
      userId
    );

    const total = totalRows ?? approvedRows.length;
    const successful = importResult.successfulImports;
    const skipped = Math.max(0, total - successful);

    const report = importReportService.generateReport({
      totalRows: total,
      successfulImports: successful,
      skippedRows: skipped,
      anomalyCount: anomalyCount ?? (actionsTaken ? actionsTaken.length : 0),
      actionsTaken: actionsTaken || [],
      importedDetails: importResult.imported,
    });

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  finalizeImport,
};
