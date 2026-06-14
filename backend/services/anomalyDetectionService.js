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
  MISSING_AMOUNT: 'MISSING_AMOUNT',
  MISSING_DATE: 'MISSING_DATE',
  MISSING_PAYER: 'MISSING_PAYER',
  ZERO_AMOUNT: 'ZERO_AMOUNT',
  UNKNOWN_SPLIT_TYPE: 'UNKNOWN_SPLIT_TYPE',
  INVALID_EXACT_SPLIT: 'INVALID_EXACT_SPLIT',
  MISSING_RECEIVER: 'MISSING_RECEIVER',
  INCONSISTENT_NAME: 'INCONSISTENT_NAME',
  MISSING_CURRENCY: 'MISSING_CURRENCY',
  AMBIGUOUS_DATE: 'AMBIGUOUS_DATE',
  DECIMAL_PRECISION: 'DECIMAL_PRECISION',
  EQUAL_WITH_SHARES: 'EQUAL_WITH_SHARES',
  MEMBER_LEFT_BEFORE_EXPENSE: 'MEMBER_LEFT_BEFORE_EXPENSE',
  TEMPORARY_PARTICIPANT: 'TEMPORARY_PARTICIPANT',
};

const SETTLEMENT_KEYWORDS = /settlement|settle up|repayment|paid to|paid back|deposit share|transfer|reimbursement/i;

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
    raw: row,
    title: getField(row, 'title', 'description', 'name'),
    amount: amountRaw !== null ? parseFloat(amountRaw) : NaN,
    currency: (getField(row, 'currency') || '').toUpperCase(),
    expenseDate: getField(row, 'expensedate', 'date', 'expense_date'),
    dateRaw: getField(row, 'expensedate', 'date', 'expense_date'),
    paidBy: getField(row, 'paidby', 'paid_by', 'payer'),
    receiver: getField(row, 'receiver', 'paidto', 'paid_to', 'receivername'),
    splitType: splitTypeRaw.toUpperCase(),
    participants: getField(row, 'participants', 'members', 'splitbetween'),
    shares: getField(row, 'shares', 'percentages', 'splitshares', 'split_values'),
    recordType: getField(row, 'type', 'recordtype', 'record_type'),
    name: getField(row, 'name', 'username', 'user_name', 'payername', 'participantname'),
    normalizedName: null,
  };
}

function buildAnomaly(rowNumber, issueType, severity, description, suggestedAction) {
  return { rowNumber, issueType, severity, description, suggestedAction };
}

function normalizeName(value) {
  if (!value) return null;
  const cleaned = String(value).trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function isAmbiguousDate(value) {
  if (!value) return false;
  const match = String(value).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return false;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return first <= 12 && second <= 12;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function detectInconsistentNames(normalizedRows, anomalies) {
  const variants = new Map();

  for (const row of normalizedRows) {
    const sources = [row.paidBy, row.receiver, row.name];
    if (row.participants) {
      sources.push(...row.participants.split(',').map((part) => part.trim()).filter(Boolean));
    }

    for (const source of sources.filter(Boolean)) {
      const normalized = normalizeName(source);
      if (!normalized) continue;

      const key = normalized.toLowerCase();
      if (!variants.has(key)) variants.set(key, new Set());
      variants.get(key).add(source);
    }
  }

  for (const [key, names] of variants.entries()) {
    if (names.size > 1) {
      const canonical = normalizeName(key);
      for (const row of normalizedRows) {
        const rowText = [row.paidBy, row.receiver, row.name, row.participants || ''].join(' ').toLowerCase();
        if (rowText.includes(key)) {
          anomalies.push(
            buildAnomaly(
              row.rowNumber,
              ISSUE_TYPE.INCONSISTENT_NAME,
              SEVERITY.LOW,
              `Name variants detected for "${[...names].join(' / ')}". Normalize to "${canonical}".`,
              `Normalize to ${canonical}`
            )
          );
          break;
        }
      }
    }
  }
}

function detectMissingCurrency(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (!row.currency) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.MISSING_CURRENCY,
          SEVERITY.LOW,
          `Row ${row.rowNumber} has no currency. INR will be assumed.`,
          'Assume INR'
        )
      );
    }
  }
}

function detectAmbiguousDates(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (isAmbiguousDate(row.dateRaw)) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.AMBIGUOUS_DATE,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has an ambiguous date format (${row.dateRaw}).`,
          'Require user confirmation'
        )
      );
    }
  }
}

function detectDecimalPrecision(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (typeof row.amount !== 'number' || Number.isNaN(row.amount)) continue;
    const rounded = roundTo2(row.amount);
    if (Math.abs(rounded - row.amount) > 0.0001) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.DECIMAL_PRECISION,
          SEVERITY.LOW,
          `Row ${row.rowNumber} rounds ${row.amount} to ${rounded.toFixed(2)}.`,
          `Round to ${rounded.toFixed(2)}`
        )
      );
    }
  }
}

function roundTo2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function detectEqualWithShares(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.splitType === 'EQUAL' && row.shares) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.EQUAL_WITH_SHARES,
          SEVERITY.LOW,
          `Row ${row.rowNumber} is EQUAL split but also provides share details. Shares will be ignored.`,
          'Use equal split and ignore shares'
        )
      );
    }
  }
}

function detectTemporaryParticipants(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (!row.participants) continue;
    const participantText = row.participants.toLowerCase();
    if (participantText.includes('friend') || participantText.includes('guest') || participantText.includes('temporary')) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.TEMPORARY_PARTICIPANT,
          SEVERITY.LOW,
          `Row ${row.rowNumber} appears to include a temporary participant.`,
          'Create guest participant'
        )
      );
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
          SEVERITY.MEDIUM,
          `Row ${row.rowNumber} has a negative amount (${row.amount}). Treat as refund if approved.`,
          'Treat as refund or skip this row.'
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
          `Row ${row.rowNumber} is in USD. Balances convert to INR using the approved exchange rate — not 1:1.`,
          'Review the exchange rate and confirm the INR equivalent before approving.'
        )
      );
    }
  }
}

/** 9 — missing or invalid amount. */
function detectMissingAmount(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.recordType === 'settlement') continue;
    if (Number.isNaN(row.amount)) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.MISSING_AMOUNT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has no valid amount.`,
          'Add a positive amount or reject this row.'
        )
      );
    }
  }
}

/** 10 — zero amount. */
function detectZeroAmount(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (!Number.isNaN(row.amount) && row.amount === 0) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.ZERO_AMOUNT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has amount 0.`,
          'Correct the amount or reject this row.'
        )
      );
    }
  }
}

/** 11 — missing expense date. */
function detectMissingDate(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.recordType === 'settlement' || row.recordType === 'user' || row.recordType === 'group') {
      continue;
    }
    if (!row.expenseDate || !parseExpenseDate(row.expenseDate)) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.MISSING_DATE,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has a missing or invalid date.`,
          'Add a valid expense date or reject this row.'
        )
      );
    }
  }
}

/** 12 — missing payer on expense rows. */
function detectMissingPayer(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.recordType === 'settlement' || row.recordType === 'user' || row.recordType === 'group') {
      continue;
    }
    if (!row.paidBy) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.MISSING_PAYER,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has no payer specified.`,
          'Add who paid for this expense or reject the row.'
        )
      );
    }
  }
}

/** 13 — unknown split type. */
function detectUnknownSplitType(normalizedRows, anomalies) {
  const valid = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARE'];
  for (const row of normalizedRows) {
    if (row.recordType === 'settlement' || row.recordType === 'user' || row.recordType === 'group') {
      continue;
    }
    if (row.splitType && !valid.includes(row.splitType)) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.UNKNOWN_SPLIT_TYPE,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} has unknown split type "${row.splitType}".`,
          'Use EQUAL, EXACT, PERCENTAGE, or SHARE.'
        )
      );
    }
  }
}

/** 14 — EXACT split shares must sum to expense amount. */
function detectInvalidExactSplits(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    if (row.splitType !== 'EXACT' || Number.isNaN(row.amount)) continue;
    if (!row.shares) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INVALID_EXACT_SPLIT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} uses EXACT split but has no share amounts.`,
          'Add exact share values that sum to the expense amount.'
        )
      );
      continue;
    }
    const values = row.shares.split(',').map((v) => parseFloat(v.trim()));
    const sum = values.reduce((acc, n) => acc + (Number.isNaN(n) ? 0 : n), 0);
    if (Math.abs(sum - row.amount) > 0.01) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INVALID_EXACT_SPLIT,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} EXACT shares sum to ${sum.toFixed(2)} but amount is ${row.amount}.`,
          'Fix share amounts to match the expense total.'
        )
      );
    }
  }
}

/** 15 — settlement rows need a receiver. */
function detectMissingReceiver(normalizedRows, anomalies) {
  for (const row of normalizedRows) {
    const isSettlement =
      row.recordType === 'settlement' ||
      (row.title && SETTLEMENT_KEYWORDS.test(row.title));
    if (isSettlement && !row.receiver) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.MISSING_RECEIVER,
          SEVERITY.HIGH,
          `Row ${row.rowNumber} is a settlement but has no receiver.`,
          'Add who received the payment or reject the row.'
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
  const participants = row.participants
    ? row.participants.split(',').map((p) => p.trim()).filter(Boolean)
    : [];
  peopleToCheck.push(...participants);

  for (const person of peopleToCheck.filter(Boolean)) {
    const membership = resolveMemberIdentifier(person, members);
    const isParticipant = participants.some(
      (p) => p.toLowerCase() === person.toLowerCase()
    );

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

    if (expenseDate < joinedAt) {
      anomalies.push(
        buildAnomaly(
          row.rowNumber,
          ISSUE_TYPE.INACTIVE_USER,
          SEVERITY.HIGH,
          `Row ${row.rowNumber}: "${person}" had not joined the group on ${row.expenseDate}.`,
          'Adjust the expense date or update join dates.'
        )
      );
      continue;
    }

    if (leftAt && expenseDate > leftAt) {
      if (isParticipant && person.toLowerCase() !== (row.paidBy || '').toLowerCase()) {
        anomalies.push(
          buildAnomaly(
            row.rowNumber,
            ISSUE_TYPE.MEMBER_LEFT_BEFORE_EXPENSE,
            SEVERITY.MEDIUM,
            `Row ${row.rowNumber}: "${person}" left before ${row.expenseDate}. They will be removed from the split.`,
            `Remove ${person} from split`
          )
        );
      } else {
        anomalies.push(
          buildAnomaly(
            row.rowNumber,
            ISSUE_TYPE.INACTIVE_USER,
            SEVERITY.HIGH,
            `Row ${row.rowNumber}: "${person}" was not active in the group on ${row.expenseDate}.`,
            'Adjust the expense date or update the member leave dates.'
          )
        );
      }
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

  detectInconsistentNames(normalizedRows, anomalies);
  detectMissingCurrency(normalizedRows, anomalies);
  detectCsvDuplicates(normalizedRows, anomalies);
  detectMissingAmount(normalizedRows, anomalies);
  detectZeroAmount(normalizedRows, anomalies);
  detectNegativeAmounts(normalizedRows, anomalies);
  detectMissingDate(normalizedRows, anomalies);
  detectAmbiguousDates(normalizedRows, anomalies);
  detectMissingPayer(normalizedRows, anomalies);
  detectMissingReceiver(normalizedRows, anomalies);
  detectUnknownSplitType(normalizedRows, anomalies);
  detectSettlementAsExpense(normalizedRows, anomalies);
  detectInvalidPercentageSplits(normalizedRows, anomalies);
  detectInvalidExactSplits(normalizedRows, anomalies);
  detectMissingParticipants(normalizedRows, anomalies);
  detectUsdCurrency(normalizedRows, anomalies);
  detectDecimalPrecision(normalizedRows, anomalies);
  detectEqualWithShares(normalizedRows, anomalies);
  detectTemporaryParticipants(normalizedRows, anomalies);

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
