/**
 * Final import HTTP handler — persists approved rows and returns a report.
 */
const databaseImportService = require('../services/databaseImportService');
const importReportService = require('../services/importReportService');
const anomalyDetectionService = require('../services/anomalyDetectionService');

function filterApprovedRows(allRows, actionsTaken) {
  if (!actionsTaken || actionsTaken.length === 0) {
    return allRows;
  }

  const rowAnomalies = new Map();
  for (const action of actionsTaken) {
    if (!rowAnomalies.has(action.rowNumber)) {
      rowAnomalies.set(action.rowNumber, []);
    }
    rowAnomalies.get(action.rowNumber).push(action);
  }

  return allRows.filter((row) => {
    const issues = rowAnomalies.get(row.rowNumber);
    if (!issues || issues.length === 0) return true;
    return issues.every((issue) => issue.actionTaken === 'approved');
  });
}

/**
 * POST /api/import/finalize
 * Body: { groupId, approvedRows, allRows?, actionsTaken?, usdToInrRate? }
 */
async function finalizeImport(req, res, next) {
  try {
    const { groupId, approvedRows, allRows, totalRows, actionsTaken, anomalyCount, usdToInrRate } =
      req.body;
    const userId = req.user.id;

    const sourceRows = allRows || approvedRows;

    if (sourceRows && actionsTaken) {
      const anomalies = await anomalyDetectionService.detectAnomalies(sourceRows, groupId, userId);
      const rejectedRows = new Set(
        actionsTaken.filter((a) => a.actionTaken === 'rejected').map((a) => a.rowNumber)
      );

      for (const row of approvedRows) {
        if (rejectedRows.has(row.rowNumber)) {
          return res.status(400).json({
            success: false,
            message: `Row ${row.rowNumber} was rejected during review and cannot be imported.`,
          });
        }

        const rowIssues = anomalies.filter((a) => a.rowNumber === row.rowNumber);
        const unapproved = rowIssues.filter((issue) => {
          const action = actionsTaken.find(
            (a) => a.rowNumber === issue.rowNumber && a.issueType === issue.issueType
          );
          return !action || (action.actionTaken !== 'approved' && action.actionTaken !== 'skipped');
        });

        if (unapproved.length > 0 && rowIssues.length > 0) {
          const allApproved = rowIssues.every((issue) => {
            const action = actionsTaken.find(
              (a) => a.rowNumber === issue.rowNumber && a.issueType === issue.issueType
            );
            return action?.actionTaken === 'approved';
          });
          if (!allApproved) {
            return res.status(400).json({
              success: false,
              message: `Row ${row.rowNumber} has unresolved anomalies. Approve or reject before importing.`,
            });
          }
        }
      }
    }

    const rowsToImport = approvedRows || filterApprovedRows(sourceRows, actionsTaken);

    const importResult = await databaseImportService.importApprovedRows(
      rowsToImport,
      groupId,
      userId,
      usdToInrRate
    );

    const total = totalRows ?? sourceRows?.length ?? rowsToImport.length;
    const successful = importResult.successfulImports;
    const skipped = Math.max(0, total - successful);

    const report = importReportService.generateReport({
      totalRows: total,
      successfulImports: successful,
      skippedRows: skipped,
      anomalyCount: anomalyCount ?? (actionsTaken ? actionsTaken.length : 0),
      actionsTaken: actionsTaken || [],
      importedDetails: importResult.imported,
      usdToInrRate: usdToInrRate || process.env.USD_TO_INR_RATE || 83,
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
