/**
 * Database import — inserts approved CSV rows using Prisma transactions.
 * Only approved rows are inserted; rejected rows are never passed here.
 */
const { Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = require('./prismaClient');

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

function round2(num) {
  return Math.round(num * 100) / 100;
}

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

function normalizeRow(row) {
  const amountRaw = getField(row, 'amount', 'total', 'cost');
  const splitTypeRaw = getField(row, 'splittype', 'split_type', 'split') || 'EQUAL';

  return {
    rowNumber: row.rowNumber,
    title: getField(row, 'title', 'description', 'name'),
    amount: amountRaw !== null ? parseFloat(amountRaw) : NaN,
    currency: (getField(row, 'currency') || 'INR').toUpperCase(),
    expenseDate: getField(row, 'expensedate', 'date', 'expense_date', 'paymentdate'),
    paidBy: getField(row, 'paidby', 'paid_by', 'payer'),
    receiver: getField(row, 'receiver', 'paidto', 'paid_to', 'receivername'),
    splitType: splitTypeRaw.toUpperCase(),
    participants: getField(row, 'participants', 'members', 'splitbetween'),
    shares: getField(row, 'shares', 'percentages', 'splitshares', 'split_values'),
    recordType: (getField(row, 'type', 'recordtype', 'record_type') || 'expense').toLowerCase(),
    groupName: getField(row, 'groupname', 'group_name', 'group'),
    userName: getField(row, 'username', 'user_name', 'name'),
    userEmail: getField(row, 'useremail', 'user_email', 'email'),
    password: getField(row, 'password'),
  };
}

function parseDate(value, fieldName) {
  if (!value) throw validationError(`${fieldName} is required`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw validationError(`Invalid ${fieldName}`);
  return date;
}

function parseParticipantList(value) {
  if (!value) return [];
  return value.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
}

function calculateShares(amount, splitType, participants) {
  const total = parseFloat(amount);

  switch (splitType) {
    case 'EQUAL': {
      const perPerson = round2(total / participants.length);
      return participants.map((p, index) => ({
        userId: p.userId,
        shareAmount:
          index === participants.length - 1
            ? round2(total - perPerson * (participants.length - 1))
            : perPerson,
      }));
    }
    case 'EXACT':
      return participants.map((p) => ({
        userId: p.userId,
        shareAmount: round2(parseFloat(p.shareAmount)),
      }));
    case 'PERCENTAGE':
      return participants.map((p, index) => ({
        userId: p.userId,
        shareAmount:
          index === participants.length - 1
            ? round2(
                total -
                  participants
                    .slice(0, -1)
                    .reduce(
                      (sum, part) => sum + round2(total * (parseFloat(part.shareAmount) / 100)),
                      0
                    )
              )
            : round2(total * (parseFloat(p.shareAmount) / 100)),
      }));
    case 'SHARE': {
      const totalUnits = participants.reduce((sum, p) => sum + parseFloat(p.shareAmount), 0);
      return participants.map((p, index) => ({
        userId: p.userId,
        shareAmount:
          index === participants.length - 1
            ? round2(
                total -
                  participants
                    .slice(0, -1)
                    .reduce(
                      (sum, part) => sum + round2(total * (parseFloat(part.shareAmount) / totalUnits)),
                      0
                    )
              )
            : round2(total * (parseFloat(p.shareAmount) / totalUnits)),
      }));
    }
    default:
      throw validationError('Invalid split type');
  }
}

async function verifyGroupAccess(tx, groupId, userId) {
  const group = await tx.group.findFirst({
    where: {
      id: Number(groupId),
      OR: [
        { createdBy: userId },
        { members: { some: { userId, leftAt: null } } },
      ],
    },
  });

  if (!group) {
    throw notFoundError('Group not found or access denied');
  }

  return group;
}

/** Resolve a user by email or name — must exist or be creatable via user row. */
async function resolveUser(tx, identifier, cache) {
  if (!identifier) throw validationError('User identifier is required');

  const key = identifier.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const user = await tx.user.findFirst({
    where: {
      OR: [{ email: key }, { name: identifier }],
    },
  });

  if (!user) {
    throw validationError(`User "${identifier}" not found. Add the user before importing.`);
  }

  cache.set(key, user);
  cache.set(user.email.toLowerCase(), user);
  cache.set(user.name.toLowerCase(), user);
  return user;
}

async function ensureGroupMember(tx, groupId, userId) {
  const existing = await tx.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!existing) {
    await tx.groupMember.create({
      data: { groupId, userId },
    });
  }
  // Do NOT silently reactivate left members — Sam/Meera requirement
}

function isSettlementRow(row) {
  return (
    row.recordType === 'settlement' ||
    (row.title && SETTLEMENT_KEYWORDS.test(row.title))
  );
}

async function importGroupRow(tx, row, userId, groupCache) {
  const name = row.groupName || row.title;
  if (!name) throw validationError(`Row ${row.rowNumber}: group name is required`);

  const group = await tx.group.create({
    data: { name, createdBy: userId },
  });

  await tx.groupMember.create({
    data: { groupId: group.id, userId },
  });

  groupCache.set(name.toLowerCase(), group);
  return { type: 'group', id: group.id, rowNumber: row.rowNumber };
}

async function importUserRow(tx, row, groupId, userId, userCache) {
  const name = row.userName || row.title;
  const email = row.userEmail;

  if (!name || !email) {
    throw validationError(`Row ${row.rowNumber}: user name and email are required`);
  }

  let user = await tx.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    const plainPassword = row.password || `Import@${Date.now()}`;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    user = await tx.user.create({
      data: { name, email: email.toLowerCase(), password: hashedPassword },
    });
  }

  userCache.set(email.toLowerCase(), user);
  userCache.set(name.toLowerCase(), user);

  if (groupId) {
    await ensureGroupMember(tx, groupId, user.id);
  }

  return { type: 'user', id: user.id, rowNumber: row.rowNumber };
}

async function importSettlementRow(tx, row, groupId, userCache) {
  const payer = await resolveUser(tx, row.paidBy, userCache);
  const receiver = await resolveUser(tx, row.receiver, userCache);

  if (Number.isNaN(row.amount) || row.amount <= 0) {
    throw validationError(`Row ${row.rowNumber}: invalid settlement amount`);
  }

  await ensureGroupMember(tx, groupId, payer.id);
  await ensureGroupMember(tx, groupId, receiver.id);

  const settlement = await tx.settlement.create({
    data: {
      groupId,
      payerId: payer.id,
      receiverId: receiver.id,
      amount: new Prisma.Decimal(row.amount),
      paymentDate: parseDate(row.expenseDate, 'payment date'),
    },
  });

  return { type: 'settlement', id: settlement.id, rowNumber: row.rowNumber };
}

async function importExpenseRow(tx, row, groupId, userCache) {
  if (!row.title) throw validationError(`Row ${row.rowNumber}: expense title is required`);
  if (Number.isNaN(row.amount) || row.amount <= 0) {
    throw validationError(`Row ${row.rowNumber}: amount must be positive`);
  }
  if (!['INR', 'USD'].includes(row.currency)) {
    throw validationError(`Row ${row.rowNumber}: currency must be INR or USD`);
  }

  const payer = await resolveUser(tx, row.paidBy, userCache);
  await ensureGroupMember(tx, groupId, payer.id);

  const participantNames = parseParticipantList(row.participants);
  const shareValues = row.shares ? row.shares.split(',').map((v) => v.trim()) : [];

  const participantUsers = participantNames.length > 0
    ? await Promise.all(participantNames.map((name) => resolveUser(tx, name, userCache)))
    : [payer];

  for (const participant of participantUsers) {
    await ensureGroupMember(tx, groupId, participant.id);
  }

  const splitParticipants = participantUsers.map((user, index) => ({
    userId: user.id,
    shareAmount: shareValues[index] || (row.splitType === 'EQUAL' ? 0 : shareValues[0] || 0),
  }));

  const shares = calculateShares(row.amount, row.splitType, splitParticipants);

  const expense = await tx.expense.create({
    data: {
      groupId,
      title: row.title,
      amount: new Prisma.Decimal(row.amount),
      currency: row.currency,
      paidBy: payer.id,
      expenseDate: parseDate(row.expenseDate, 'expense date'),
      splitType: row.splitType,
      participants: {
        create: shares.map((share) => ({
          userId: share.userId,
          shareAmount: new Prisma.Decimal(share.shareAmount),
        })),
      },
    },
  });

  return { type: 'expense', id: expense.id, rowNumber: row.rowNumber, currency: row.currency };
}

/**
 * Import approved rows inside a single Prisma transaction.
 *
 * @param {object[]} approvedRows
 * @param {number} groupId — target group for expense/settlement rows
 * @param {number} userId — requesting user
 */
async function importApprovedRows(approvedRows, groupId, userId, usdToInrRate) {
  if (!Array.isArray(approvedRows) || approvedRows.length === 0) {
    throw validationError('approvedRows array is required');
  }
  if (!groupId) {
    throw validationError('groupId is required');
  }

  const results = await prisma.$transaction(async (tx) => {
    await verifyGroupAccess(tx, groupId, userId);

    const userCache = new Map();
    const groupCache = new Map();
    const imported = [];

    for (const rawRow of approvedRows) {
      const row = normalizeRow(rawRow);
      let result;

      if (row.recordType === 'group') {
        result = await importGroupRow(tx, row, userId, groupCache);
      } else if (row.recordType === 'user') {
        result = await importUserRow(tx, row, Number(groupId), userId, userCache);
      } else if (isSettlementRow(row)) {
        result = await importSettlementRow(tx, row, Number(groupId), userCache);
      } else {
        result = await importExpenseRow(tx, row, Number(groupId), userCache);
      }

      imported.push(result);
    }

    return imported;
  });

  return {
    successfulImports: results.length,
    imported: results,
  };
}

module.exports = {
  importApprovedRows,
};
