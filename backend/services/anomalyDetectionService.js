/**
 * Anomaly detection — inspects parsed CSV rows and flags issues for user review.
 * Does NOT modify row data or write to the database.
 */
const prisma = require('./prismaClient');

const SEVERITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

const ISSUE_TYPE = {
  EXACT_DUPLICATE: 'EXACT_DUPLICATE',
  CONFLICTING_DUPLICATE: 'CONFLICTING_DUPLICATE',
  NEGATIVE_AMOUNT: 'NEGATIVE_AMOUNT',
  INACTIVE_USER: 'INACTIVE_USER',
  SETTLEMENT_AS_EXPENSE: 'SETTLEMENT_AS_EXPENSE',
  INVALID_PERCENTAGE_SPLIT: 'INVALID_PERCENTAGE_SPLIT',
  MISSING_PARTICIPANTS: 'MISSING_PARTICIPANTS',
  USD_CURRENCY: 'USD_CURRENCY',
};

const SETTLEMENT_KEYWORDS = /settlement|settle up|repayment|paid to|transfer|reimbursement/i;

function validationError(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  return error;
}

function notFoundError(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

/** Find a CSV column value by flexible header name matching. */
function getField(row, ...candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find(
      (key) => key.toLowerCase().replace(/[\s_-]/g, '') === candidate.toLowerCase().replace(/[\s_-]/g, '')
    );
    if (match !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
      return String(row[match]).trim();
    }
  }
  return null;
}

/** Normalize a raw CSV row into a consistent internal shape — read-only, no mutation. */
function normalizeRow(row) {
  const amountRaw = getField(row, 'amount', 'total', 'cost');
  const splitTypeRaw = getField(row, 'splittype', 'split_type', 'split') || 'EQUAL';

  return {
    rowNumber: row.rowNumber,
    title: getField(row, 'title', 'description', 'name'),
    amount: amountRaw !== null ? parseFloat(amountRaw) : NaN,
    currency: (getField(row, 'currency') || 'INR').toUpperCase(),
    expenseDate: getField(row, 'expensedate', 'date', 'expense_date'),
    paidBy: getField(row, 'paidby', 'paid_by', 'payer'),
    splitType: splitTypeRaw.toUpperCase(),
    participants: getField(row, 'participants', 'members', 'splitbetween'),
    shares: getField(row, 'shares', 'percentages', 'splitshares', 'split_values'),
    recordType: getField(row, 'type', 'recordtype', 'record_type'),
  };
}

function buildAnomaly(rowNumber, issueType, severity, description, suggestedAction) {
  return { rowNumber, issueType, severity, description, suggestedAction };
}

function exactFingerprint(row) {
  return [
    (row.title || '').toLowerCase(),
    Number.isNaN(row.amount) ? '' : row.amount.toFixed(2),
    row.expenseDate || '',
    (row.paidBy || '').toLowerCase(),
  ].join('|');
}

function conflictFingerprint(row) {
  return [
    (row.title || '').toLowerCase(),
    row.expenseDate || '',
    (row.paidBy || '').toLowerCase(),
  ].join('|');
}

/** 1 & 2 — duplicate detection within the CSV itself. */
function detectCsvDuplicates(normalizedRows, anomalies) {
  const exactMap = new Map();
  const conflictMap = new Map();

  for (const row of normalizedRows) {
    const exactKey = exactFingerprint(row);
    const conflictKey = conflictFingerprint(row);

    if (exactMap.has(exactKey)) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.EXACT_DUPLICATE,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} is an exact duplicate of row ${exactMap.get(exactKey)} (same title, amount, date, payer).`,
          'Reject this row or confirm it is intentional before importing.'
        )
      );
    } else {
      exactMap.set(exactKey, row.rowNumber);
    }

    if (conflictMap.has(conflictKey)) {
      const otherRow = conflictMap.get(conflictKey);
      if (otherRow.amount !== row.amount) {
        anomalies.push(
          buildAnomaly(
            row.rowNumber,
            ISSUE_TYPE.CONFLICTING_DUPLICATE,
            SEVERITY.HIGH,
            `Row ${row.rowNumber} conflicts with row ${otherRow.rowNumber}: same title, date, and payer but different amounts (₹${otherRow.amount} vs ₹${row.amount}).`,
            'Review both rows and keep only the correct amount.'
          )
        );
      }
    } else {
      conflictMap.set(conflictKey, row);
    }
  }
}

/** 3 — negative amounts. */
function detectNegativeAmounts(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (!Number.isNaN(row.amount) && row.amount < 0) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.NEGATIVE_AMOUNT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has a negative amount (${row.amount}). Expenses must be positive values.`,
          'Correct the amount in the CSV or reject this row.'
        )
      );
    }
  }
}

/** 5 — settlement-like rows recorded as expenses. */
function detectSettlementAsExpense(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    const looksLikeSettlement =
      (row.recordType && row.recordType.toLowerCase() === 'settlement') ||
      (row.title && SETTLEMENT_KEYWORDS.test(row.title)) ||
      (row.splitType && row.splitType === 'SETTLEMENT');

    if (looksLikeSettlement) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.SETTLEMENT_AS_EXPENSE,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} appears to be a settlement/payment, not a shared expense.`,
          'Record this as a settlement instead of an expense, or reject the row.'
        )
      );
    }
  }
}

/** 6 — percentage splits must sum to 100. */
function detectInvalidPercentageSplits(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.splitType !== 'PERCENTAGE') continue;

    if (!row.shares) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INVALID_PERCENTAGE_SPLIT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} uses PERCENTAGE split but has no share values.`,
          'Add percentage values that sum to 100, or change the split type.'
        )
      );
      continue;
    }

    const values = row.shares.split(',').map((v) => parseFloat(v.trim()));
    const sum = values.reduce((acc, n) => acc + (Number.isNaN(n) ? 0 : n), 0);

    if (values.some(Number.isNaN) || Math.abs(sum - 100) > 0.01) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INVALID_PERCENTAGE_SPLIT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has invalid percentage split (sum = ${sum.toFixed(2)}%, expected 100%).`,
          'Fix the percentage values so they total 100%.'
        )
      );
    }
  }
}

/** 7 — participants required for non-trivial split types. */
function detectMissingParticipants(normalizedRows, anomalies) {
  const requiresParticipants = ['EXACT', 'PERCENTAGE', 'SHARE'];

  for (const row of normalizedRows) {
    if (requiresParticipants.includes(row.splitType) && !row.participants) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.MISSING_PARTICIPANTS,
          SEVERITY.MEDIUM,
          `Row ${row.rowNumber} uses ${row.splitType} split but lists no participants.`,
          'Add participant emails/names or switch to EQUAL split.'
        )
      );
    }
  }
}

/** 8 — USD rows flagged for manual review (currency conversion not auto-applied). */
function detectUsdCurrency(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.currency === 'USD') {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.USD_CURRENCY,
          SEVERITY.LOW,
          `Row ${row.rowNumber} is in USD. Currency conversion is not applied automatically.`,
          'Review the exchange rate and confirm the INR equivalent before approving.'
        )
      );
    }
  }
}

async function verifyGroupAccess(groupId, userId) {
  const id = Number(groupId);
  if (Number.isNaN(id)) {
    throw validationError('Invalid group ID');
  }

  const group = await prisma.group.findFirst({
    where: {
      id,
      OR: [
        { createdBy: userId },
        { members: { some: { userId, leftAt: null } } },
      ],
    },
  });

  if (!group) {
    throw notFoundError('Group not found');
  }

  return group;
}

function parseExpenseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveMemberIdentifier(identifier, members) {
  if (!identifier) return null;
  const needle = identifier.toLowerCase();
  return members.find(
    (m) =>
      m.user.email.toLowerCase() === needle ||
      m.user.name.toLowerCase() === needle
  );
}

/** 4 — payer or participant was not an active group member on the expense date. */
function detectInactiveUsersForRow(row, members, anomalies) {
  const expenseDate = parseExpenseDate(row.expenseDate);
  if (!expenseDate) return;

  const peopleToCheck = [row.paidBy];
  if (row.participants) {
    peopleToCheck.push(...row.participants.split(',').map((p) => p.trim()));
  }

  for (const person of peopleToCheck.filter(Boolean)) {
    const membership = resolveMemberIdentifier(person, members);

    if (!membership) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INACTIVE_USER,
          SEVERITY.HIGH,
          `Row ${row.rowNumber}: "${person}" is not a member of the selected group.`,
          'Add the user to the group or correct the payer/participant name.'
        )
      );
      continue;
    }

    const joinedAt = new Date(membership.joinedAt);
    const leftAt = membership.leftAt ? new Date(membership.leftAt) : null;

    if (expenseDate < joinedAt || (leftAt && expenseDate > leftAt)) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INACTIVE_USER,
          SEVERITY.HIGH,
          `Row ${row.rowNumber}: "${person}" was not active in the group on ${row.expenseDate}.`,
          'Adjust the expense date or update the member join/leave dates.'
        )
      );
    }
  }
}

/** Cross-check CSV rows against existing settlements in the group. */
function detectMatchingSettlements(row, settlements, anomalies) {
  if (Number.isNaN(row.amount) || !row.paidBy) return;

  for (const settlement of settlements) {
    const payerMatch =
      settlement.payer.email.toLowerCase() === row.paidBy.toLowerCase() ||
      settlement.payer.name.toLowerCase() === row.paidBy.toLowerCase();

    const amountMatch = Math.abs(parseFloat(settlement.amount) - row.amount) < 0.01;
    const dateMatch =
      row.expenseDate &&
      new Date(settlement.paymentDate).toDateString() ===
        parseExpenseDate(row.expenseDate)?.toDateString();

    if (payerMatch && amountMatch && (dateMatch || SETTLEMENT_KEYWORDS.test(row.title || ''))) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.SETTLEMENT_AS_EXPENSE,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} matches an existing settlement (₹${row.amount}) already recorded in this group.`,
          'Reject this row — it should not be imported as an expense.'
        )
      );
    }
  }
}

/** Cross-check against existing expenses in the group for exact duplicates. */
function detectExistingExpenseDuplicates(row, expenses, anomalies) {
  if (!row.title || Number.isNaN(row.amount) || !row.expenseDate) return;

  for (const expense of expenses) {
    const sameTitle = expense.title.toLowerCase() === row.title.toLowerCase();
    const sameAmount = Math.abs(parseFloat(expense.amount) - row.amount) < 0.01;
    const sameDate =
      new Date(expense.expenseDate).toDateString() ===
      parseExpenseDate(row.expenseDate)?.toDateString();
    const samePayer =
      expense.payer.email.toLowerCase() === (row.paidBy || '').toLowerCase() ||
      expense.payer.name.toLowerCase() === (row.paidBy || '').toLowerCase();

    if (sameTitle && sameAmount && sameDate && samePayer) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.EXACT_DUPLICATE,
          SEVERITY.MEDIUM,
          `Row ${row.rowNumber} duplicates an expense already stored in the group ("${expense.title}").`,
          'Skip or reject this row to avoid double-counting.'
        )
      );
    }
  }
}

/**
 * Main entry — inspect all rows and return anomalies without modifying data.
 *
 * @param {object[]} rows — parsed CSV rows (with rowNumber)
 * @param {number|null} groupId — optional group for membership/settlement checks
 * @param {number} userId — requesting user
 */
async function detectAnomalies(rows, groupId, userId) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw validationError('rows array is required');
  }

  const normalizedRows = rows.map(normalizeRow);
  const anomalies = [];

  detectCsvDuplicates(normalizedRows, anomalies);
  detectNegativeAmounts(normalizedRows, anomalies);
  detectSettlementAsExpense(normalizedRows, anomalies);
  detectInvalidPercentageSplits(normalizedRows, anomalies);
  detectMissingParticipants(normalizedRows, anomalies);
  detectUsdCurrency(normalizedRows, anomalies);

  if (groupId) {
    await verifyGroupAccess(groupId, userId);

    const [members, settlements, expenses] = await Promise.all([
      prisma.groupMember.findMany({
        where: { groupId: Number(groupId) },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.settlement.findMany({
        where: { groupId: Number(groupId) },
        include: {
          payer: { select: { name: true, email: true } },
          receiver: { select: { name: true, email: true } },
        },
      }),
      prisma.expense.findMany({
        where: { groupId: Number(groupId) },
        include: { payer: { select: { name: true, email: true } } },
      }),
    ]);

    for (const row of normalizedRows) {
      detectInactiveUsersForRow(row, members, anomalies);
      detectMatchingSettlements(row, settlements, anomalies);
      detectExistingExpenseDuplicates(row, expenses, anomalies);
    }
  }

  anomalies.sort((a, b) => a.rowNumber - b.rowNumber || a.issueType.localeCompare(b.issueType));

  return anomalies;
}

module.exports = {
  detectAnomalies,
  ISSUE_TYPE,
  SEVERITY,
};
