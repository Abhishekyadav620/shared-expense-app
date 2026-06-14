/**
 * Final import service — applies review decisions, imports approved rows, and builds the report.
 * Every anomaly policy is enforced here; nothing is silently modified.
 */
const anomalyService = require('./anomalyService');
const databaseImportService = require('./databaseImportService');
const importReportService = require('./importReportService');
const importPersistenceService = require('./importPersistenceService');
const prisma = require('./prismaClient');

function validationError(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  return error;
}

function actionKey(rowNumber, issueType) {
  return `${rowNumber}-${issueType}`;
}

function buildActionMap(actionsTaken) {
  const map = new Map();
  for (const action of actionsTaken || []) {
    map.set(actionKey(action.rowNumber, action.issueType), action.actionTaken);
  }
  return map;
}

function titleCaseName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseDateParts(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) return null;
  return { first: Number(match[1]), second: Number(match[2]), year: Number(match[3]) };
}

function resolveAmbiguousDate(value, action) {
  const parts = parseDateParts(value);
  if (!parts) return value;
  if (action === 'april_5') {
    return `${parts.year}-${String(parts.first).padStart(2, '0')}-${String(parts.second).padStart(2, '0')}`;
  }
  if (action === 'may_4') {
    return `${parts.year}-${String(parts.second).padStart(2, '0')}-${String(parts.first).padStart(2, '0')}`;
  }
  return value;
}

function normalizeNamesOnRow(row) {
  const updated = { ...row };
  if (updated.paidBy) updated.paidBy = titleCaseName(updated.paidBy);
  if (updated.payer) updated.payer = titleCaseName(updated.payer);
  if (updated.receiver) updated.receiver = titleCaseName(updated.receiver);
  if (updated.participants) {
    updated.participants = updated.participants
      .split(',')
      .map((p) => titleCaseName(p.trim()))
      .join(',');
  }
  return updated;
}

function addCurrencyMetadata(row, usdToInrRate) {
  const currency = (row.currency || 'INR').toUpperCase();
  const amount = Number(row.amount);
  if (currency === 'USD') {
    const rate = Number(usdToInrRate || 83);
    const convertedAmount = Math.round(amount * rate * 100) / 100;
    return {
      ...row,
      currency: 'USD',
      originalAmount: amount,
      originalCurrency: 'USD',
      exchangeRate: rate,
      convertedAmount,
    };
  }
  return {
    ...row,
    currency: currency || 'INR',
    originalAmount: amount,
    originalCurrency: currency || 'INR',
    exchangeRate: null,
    convertedAmount: amount,
  };
}

function roundAmount(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

function parseParticipantList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,|]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function isReviewableAction(action) {
  return [
    'approved',
    'kept_first',
    'kept_second',
    'merged',
    'april_5',
    'may_4',
    'skip_row',
    'converted',
    'stored',
    'ignored',
    'remove_inactive',
  ].includes(action);
}

function getRowAction(anomaly, actionMap) {
  return actionMap.get(actionKey(anomaly.rowNumber, anomaly.issueType));
}

function buildSkipSet(rows, anomalies, actionMap) {
  const skipRows = new Set();

  for (const anomaly of anomalies) {
    const action = getRowAction(anomaly, actionMap);

    if (action === 'skip_row') {
      skipRows.add(anomaly.rowNumber);
    }

    if (['DUPLICATE_EXPENSE', 'EXACT_DUPLICATE', 'CONFLICTING_DUPLICATE'].includes(anomaly.issueType)) {
      if (action === 'kept_first' && anomaly.relatedRowNumber) {
        skipRows.add(anomaly.rowNumber);
      }
      if (action === 'kept_second' && anomaly.relatedRowNumber) {
        skipRows.add(anomaly.relatedRowNumber);
      }
      if (action === 'merged' && anomaly.relatedRowNumber) {
        skipRows.add(anomaly.rowNumber);
      }
    }
  }

  for (const row of rows) {
    const rowAnomalies = anomalies.filter((a) => a.rowNumber === row.rowNumber);
    const hasSkip = rowAnomalies.some((a) => getRowAction(a, actionMap) === 'skip_row');
    if (hasSkip) skipRows.add(row.rowNumber);

    const blockingTypes = [
      'MISSING_PAYER',
      'MISSING_AMOUNT',
      'MISSING_DATE',
      'MISSING_RECEIVER',
      'UNKNOWN_SPLIT_TYPE',
      'INVALID_EXACT_SPLIT',
      'INVALID_PERCENTAGE_SPLIT',
      'ZERO_AMOUNT',
    ];

    for (const type of blockingTypes) {
      const issue = rowAnomalies.find((a) => a.issueType === type);
      if (issue) {
        const action = getRowAction(issue, actionMap);
        if (!action || action === 'pending' || action === 'skip_row') {
          skipRows.add(row.rowNumber);
        }
      }
    }

    const ambiguous = rowAnomalies.find((a) => a.issueType === 'AMBIGUOUS_DATE');
    if (ambiguous) {
      const action = getRowAction(ambiguous, actionMap);
      if (!action || action === 'pending' || action === 'skip_row') {
        skipRows.add(row.rowNumber);
      }
    }

    const duplicate = rowAnomalies.find((a) =>
      ['DUPLICATE_EXPENSE', 'EXACT_DUPLICATE', 'CONFLICTING_DUPLICATE'].includes(a.issueType)
    );
    if (duplicate?.needsReview) {
      const action = getRowAction(duplicate, actionMap);
      if (!isReviewableAction(action)) {
        skipRows.add(row.rowNumber);
      }
    }
  }

  return skipRows;
}

async function removeInactiveParticipants(row, groupId, removedNames) {
  if (!row.participants || !groupId) return row;

  const members = await prisma.groupMember.findMany({
    where: { groupId: Number(groupId) },
    include: { user: { select: { name: true, email: true } } },
  });

  const expenseDate = row.expenseDate ? new Date(row.expenseDate) : null;
  if (!expenseDate || Number.isNaN(expenseDate.getTime())) return row;

  const participants = parseParticipantList(row.participants);
  const kept = [];

  for (const name of participants) {
    const membership = members.find(
      (m) =>
        m.user.name.toLowerCase() === name.toLowerCase() ||
        m.user.email.toLowerCase() === name.toLowerCase()
    );

    if (!membership) {
      kept.push(name);
      continue;
    }

    const joinedAt = new Date(membership.joinedAt);
    const leftAt = membership.leftAt ? new Date(membership.leftAt) : null;
    const inactive = expenseDate < joinedAt || (leftAt && expenseDate > leftAt);

    if (inactive) {
      removedNames.push(name);
    } else {
      kept.push(name);
    }
  }

  return { ...row, participants: kept.join(',') };
}

function describeActionTaken(rowAnomalies, actionMap) {
  return rowAnomalies
    .map((anomaly) => {
      const action = getRowAction(anomaly, actionMap) || 'auto';
      switch (anomaly.issueType) {
        case 'SETTLEMENT_AS_EXPENSE':
          return action === 'stored' ? 'Moved to Settlement Table' : action;
        case 'USD_CURRENCY':
          return action === 'approved' || action === 'converted' ? 'Converted to INR (logged)' : action;
        case 'NEGATIVE_AMOUNT':
          return action === 'approved' ? 'Stored as Refund' : action;
        case 'NAME_NORMALIZED':
        case 'INCONSISTENT_NAME':
          return action === 'approved' ? 'Name Normalized' : action;
        case 'AMBIGUOUS_DATE':
          return action === 'april_5' ? 'Date set to Apr 5' : action === 'may_4' ? 'Date set to May 4' : action;
        case 'MEMBER_LEFT_BEFORE_EXPENSE':
        case 'INACTIVE_USER':
          return action === 'approved' || action === 'remove_inactive'
            ? 'Removed inactive member from split'
            : action;
        case 'DUPLICATE_EXPENSE':
          return action === 'pending' ? 'Awaiting User Review' : action;
        default:
          return action;
      }
    })
    .join(' | ');
}

async function prepareRowsForImport(rows, anomalies, actionsTaken, usdToInrRate, groupId) {
  const actionMap = buildActionMap(actionsTaken);
  const skipRows = buildSkipSet(rows, anomalies, actionMap);
  const anomalyMap = new Map();

  for (const anomaly of anomalies) {
    if (!anomalyMap.has(anomaly.rowNumber)) anomalyMap.set(anomaly.rowNumber, []);
    anomalyMap.get(anomaly.rowNumber).push(anomaly);
  }

  const preparedRows = [];
  const reportRows = [];
  const policyLog = [];

  for (const rawRow of rows) {
    const rowAnomalies = anomalyMap.get(rawRow.rowNumber) || [];
    const description = rawRow.title || rawRow.description || rawRow.name || `Row ${rawRow.rowNumber}`;
    const removedNames = [];

    if (skipRows.has(rawRow.rowNumber)) {
      reportRows.push({
        rowNumber: rawRow.rowNumber,
        description,
        problemType: rowAnomalies.map((a) => a.issueType).join(', ') || 'SKIPPED',
        severity: rowAnomalies.some((a) => a.severity === 'HIGH') ? 'HIGH' : 'INFO',
        actionTaken: describeActionTaken(rowAnomalies, actionMap) || 'Skipped',
        needsReview: false,
        status: 'Skipped',
      });
      policyLog.push({ rowNumber: rawRow.rowNumber, action: 'skip_row', reason: 'Policy or user decision' });
      continue;
    }

    let row = { ...rawRow };

    const ambiguous = rowAnomalies.find((a) => a.issueType === 'AMBIGUOUS_DATE');
    if (ambiguous) {
      const action = getRowAction(ambiguous, actionMap);
      row.expenseDate = resolveAmbiguousDate(row.expenseDate || row.date, action);
      policyLog.push({ rowNumber: row.rowNumber, action: 'date_resolved', value: row.expenseDate });
    }

    if (
      rowAnomalies.some((a) =>
        ['NAME_NORMALIZED', 'INCONSISTENT_NAME'].includes(a.issueType) &&
        ['approved', 'auto'].includes(getRowAction(a, actionMap) || 'auto')
      )
    ) {
      row = normalizeNamesOnRow(row);
      policyLog.push({ rowNumber: row.rowNumber, action: 'name_normalized' });
    }

    if (
      rowAnomalies.some(
        (a) =>
          ['MEMBER_LEFT_BEFORE_EXPENSE', 'INACTIVE_USER'].includes(a.issueType) &&
          (getRowAction(a, actionMap) === 'skip_row'
            ? false
            : ['approved', 'remove_inactive', 'auto', undefined].includes(
                getRowAction(a, actionMap) || 'auto'
              ))
      )
    ) {
      row = await removeInactiveParticipants(row, groupId, removedNames);
      if (removedNames.length > 0) {
        policyLog.push({
          rowNumber: row.rowNumber,
          action: 'remove_inactive',
          removed: removedNames,
        });
      }
    }

    const settlementIssue = rowAnomalies.find((a) => a.issueType === 'SETTLEMENT_AS_EXPENSE');
    if (settlementIssue && getRowAction(settlementIssue, actionMap) === 'stored') {
      row.forceSettlement = true;
      row.recordType = 'settlement';
      policyLog.push({ rowNumber: row.rowNumber, action: 'moved_to_settlement' });
    }

    if (!row.currency || !String(row.currency).trim()) {
      row.currency = 'INR';
      policyLog.push({ rowNumber: row.rowNumber, action: 'assume_inr' });
    }

    row = addCurrencyMetadata(row, usdToInrRate);
    row.amount = roundAmount(row.amount);

    if (rowAnomalies.some((a) => a.issueType === 'DECIMAL_PRECISION')) {
      policyLog.push({ rowNumber: row.rowNumber, action: 'rounded', value: row.amount });
    }

    if (rowAnomalies.some((a) => a.issueType === 'NEGATIVE_AMOUNT')) {
      row.isRefund = true;
      row.amount = Math.abs(row.amount);
      policyLog.push({ rowNumber: row.rowNumber, action: 'stored_refund' });
    }

    if (rowAnomalies.some((a) => a.issueType === 'TEMPORARY_PARTICIPANT')) {
      row.isGuestParticipant = true;
      policyLog.push({ rowNumber: row.rowNumber, action: 'guest_participant' });
    }

    if (rowAnomalies.some((a) => a.issueType === 'EQUAL_WITH_SHARES')) {
      row.shares = null;
      policyLog.push({ rowNumber: row.rowNumber, action: 'equal_split_ignored_shares' });
    }

    if (rowAnomalies.some((a) => a.issueType === 'USD_CURRENCY')) {
      policyLog.push({
        rowNumber: row.rowNumber,
        action: 'currency_conversion_logged',
        originalAmount: row.originalAmount,
        exchangeRate: row.exchangeRate,
        convertedAmount: row.convertedAmount,
      });
    }

    const needsReview = rowAnomalies.some((a) => {
      if (!a.needsReview) return false;
      const action = getRowAction(a, actionMap);
      return !isReviewableAction(action);
    });

    reportRows.push({
      rowNumber: row.rowNumber,
      description,
      problemType: rowAnomalies.map((a) => a.issueType).join(', ') || 'NONE',
      severity: rowAnomalies.some((a) => a.severity === 'HIGH')
        ? 'HIGH'
        : rowAnomalies.some((a) => a.severity === 'MEDIUM')
          ? 'MEDIUM'
          : rowAnomalies.some((a) => a.severity === 'LOW')
            ? 'LOW'
            : 'INFO',
      actionTaken: describeActionTaken(rowAnomalies, actionMap) || 'Imported',
      needsReview,
      status: needsReview ? 'Needs Review' : 'Imported',
    });

    preparedRows.push(row);
  }

  return { preparedRows, reportRows, policyLog };
}

function buildSummary(reportRows, policyLog) {
  return {
    warnings: reportRows.filter((r) => r.severity === 'LOW' || r.severity === 'MEDIUM').length,
    duplicates: reportRows.filter((r) => r.problemType.includes('DUPLICATE')).length,
    refunds: policyLog.filter((p) => p.action === 'stored_refund').length,
    settlements: policyLog.filter((p) => p.action === 'moved_to_settlement').length,
    currencyConversions: policyLog.filter((p) => p.action === 'currency_conversion_logged').length,
    rowsRequiringReview: reportRows.filter((r) => r.needsReview).length,
  };
}

async function finalizeImport({
  groupId,
  userId,
  allRows,
  approvedRows,
  actionsTaken,
  totalRows,
  anomalyCount,
  usdToInrRate,
}) {
  if (!groupId) throw validationError('groupId is required');

  const sourceRows = Array.isArray(allRows) && allRows.length > 0 ? allRows : approvedRows;
  if (!Array.isArray(sourceRows) || sourceRows.length === 0) {
    throw validationError('approvedRows or allRows are required');
  }

  const rate = usdToInrRate || process.env.USD_TO_INR_RATE || 83;
  const anomalies = await anomalyService.detectAnomalies(sourceRows, groupId, userId);
  const { preparedRows, reportRows, policyLog } = await prepareRowsForImport(
    sourceRows,
    anomalies,
    actionsTaken || [],
    rate,
    groupId
  );

  const importResult = await databaseImportService.importApprovedRows(
    preparedRows,
    groupId,
    userId,
    rate
  );

  const summary = buildSummary(reportRows, policyLog);

  const report = importReportService.generateReport({
    totalRows: totalRows ?? sourceRows.length,
    successfulImports: importResult.successfulImports,
    skippedRows: Math.max(0, (totalRows ?? sourceRows.length) - importResult.successfulImports),
    anomalyCount: anomalyCount ?? anomalies.length,
    actionsTaken: actionsTaken || [],
    importedDetails: importResult.imported,
    reportRows,
    summary,
    policyLog,
    usdToInrRate: rate,
  });

  const saved = await importPersistenceService.saveImportReport({
    groupId,
    userId,
    report,
    anomalies,
    actionsTaken: actionsTaken || [],
  });

  return { report: { ...report, importReportId: saved.id } };
}

module.exports = {
  finalizeImport,
  prepareRowsForImport,
};
