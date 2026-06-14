/**
 * Persists import reports, anomalies, and review decisions to the database.
 */
const prisma = require('./prismaClient');

async function saveImportReport({ groupId, userId, report, anomalies, actionsTaken }) {
  const record = await prisma.importReport.create({
    data: {
      groupId: Number(groupId),
      userId: Number(userId),
      totalRows: report.totalRows,
      successfulImports: report.successfulImports,
      skippedRows: report.skippedRows,
      anomalyCount: report.anomalyCount,
      usdToInrRate: report.usdToInrRate ? Number(report.usdToInrRate) : null,
      reportJson: report,
      anomalies: {
        create: (anomalies || []).map((anomaly) => ({
          rowNumber: anomaly.rowNumber,
          issueType: anomaly.issueType,
          severity: anomaly.severity,
          description: anomaly.description,
          suggestedAction: anomaly.suggestedAction,
        })),
      },
      reviews: {
        create: (actionsTaken || []).map((action) => ({
          rowNumber: action.rowNumber,
          issueType: action.issueType,
          actionTaken: action.actionTaken,
        })),
      },
    },
    include: {
      anomalies: true,
      reviews: true,
    },
  });

  return record;
}

async function getImportReportById(id, userId) {
  return prisma.importReport.findFirst({
    where: {
      id: Number(id),
      userId: Number(userId),
    },
    include: {
      anomalies: true,
      reviews: true,
    },
  });
}

module.exports = {
  saveImportReport,
  getImportReportById,
};
