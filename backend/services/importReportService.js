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
  reportRows = [],
  summary = {},
  policyLog = [],
  usdToInrRate,
}) {
  return {
    totalRows,
    successfulImports,
    skippedRows,
    anomalyCount,
    actionsTaken: actionsTaken || [],
    importedDetails,
    reportRows,
    policyLog,
    summary: {
      totalRows,
      importedRows: successfulImports,
      warnings: summary.warnings || 0,
      duplicates: summary.duplicates || 0,
      refunds: summary.refunds || 0,
      settlements: summary.settlements || 0,
      currencyConversions: summary.currencyConversions || 0,
      rowsRequiringReview: summary.rowsRequiringReview || 0,
    },
    usdToInrRate: usdToInrRate || null,
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
