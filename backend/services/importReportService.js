/**
 * Import report generator — summarizes the final import outcome.
 */
function generateReport({
  totalRows,
  successfulImports,
  skippedRows,
  anomalyCount,
  actionsTaken,
  importedDetails = [],
}) {
  return {
    totalRows,
    successfulImports,
    skippedRows,
    anomalyCount,
    actionsTaken: actionsTaken || [],
    importedDetails,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build actionsTaken entries from frontend review decisions.
 *
 * @param {object[]} anomalies
 * @param {Record<string, string>} decisions — keyed by "rowNumber-issueType"
 */
function buildActionsFromDecisions(anomalies, decisions) {
  if (!anomalies || !decisions) return [];

  return anomalies.map((anomaly) => {
    const key = `${anomaly.rowNumber}-${anomaly.issueType}`;
    const actionTaken = decisions[key] || 'pending';

    return {
      rowNumber: anomaly.rowNumber,
      issueType: anomaly.issueType,
      actionTaken,
    };
  });
}

module.exports = {
  generateReport,
  buildActionsFromDecisions,
};
