/**
 * Expense business logic — CRUD with split calculations.
 * Supports EQUAL, EXACT, PERCENTAGE, and SHARE split types.
 */
const { Prisma } = require('@prisma/client');
const prisma = require('./prismaClient');

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

const userSelect = { id: true, name: true, email: true };

const expenseInclude = {
  payer: { select: userSelect },
  group: { select: { id: true, name: true } },
  participants: {
    include: { user: { select: userSelect } },
  },
};

function round2(num) {
  return Math.round(num * 100) / 100;
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return date;
}

/**
 * User can access a group if they created it or are an active member.
 */
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

/**
 * Verify all participant userIds are active members of the group.
 */
async function verifyActiveParticipants(groupId, participantUserIds) {
  const activeMembers = await prisma.groupMember.findMany({
    where: { groupId: Number(groupId), leftAt: null, userId: { in: participantUserIds } },
    select: { userId: true },
  });

  if (activeMembers.length !== participantUserIds.length) {
    throw validationError('All participants must be active members of the group');
  }
}

/**
 * Calculate each participant's shareAmount based on splitType.
 * For EQUAL, shareAmount in input is ignored.
 * For EXACT/PERCENTAGE/SHARE, shareAmount carries the split value.
 */
function calculateShares(amount, splitType, participants) {
  const total = parseFloat(amount);

  if (!participants || participants.length === 0) {
    throw validationError('At least one participant is required');
  }

  let shares;

  switch (splitType) {
    case 'EQUAL': {
      const perPerson = round2(total / participants.length);
      shares = participants.map((p, index) => ({
        userId: p.userId,
        shareAmount:
          index === participants.length - 1
            ? round2(total - perPerson * (participants.length - 1))
            : perPerson,
      }));
      break;
    }

    case 'EXACT': {
      const sum = participants.reduce((s, p) => s + parseFloat(p.shareAmount), 0);
      if (Math.abs(sum - total) > 0.01) {
        throw validationError('Exact shares must sum to the expense amount');
      }
      shares = participants.map((p) => ({
        userId: p.userId,
        shareAmount: round2(parseFloat(p.shareAmount)),
      }));
      break;
    }

    case 'PERCENTAGE': {
      const sum = participants.reduce((s, p) => s + parseFloat(p.shareAmount), 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw validationError('Percentages must sum to 100');
      }
      shares = participants.map((p, index) => ({
        userId: p.userId,
        shareAmount:
          index === participants.length - 1
            ? round2(
                total -
                  participants
                    .slice(0, -1)
                    .reduce(
                      (s, part) => s + round2(total * (parseFloat(part.shareAmount) / 100)),
                      0
                    )
              )
            : round2(total * (parseFloat(p.shareAmount) / 100)),
      }));
      break;
    }

    case 'SHARE': {
      const totalUnits = participants.reduce((s, p) => s + parseFloat(p.shareAmount), 0);
      if (totalUnits <= 0) {
        throw validationError('Total share units must be greater than 0');
      }
      shares = participants.map((p, index) => ({
        userId: p.userId,
        shareAmount:
          index === participants.length - 1
            ? round2(
                total -
                  participants
                    .slice(0, -1)
                    .reduce(
                      (s, part) =>
                        s + round2(total * (parseFloat(part.shareAmount) / totalUnits)),
                      0
                    )
              )
            : round2(total * (parseFloat(p.shareAmount) / totalUnits)),
      }));
      break;
    }

    default:
      throw validationError('Invalid split type');
  }

  return shares;
}

function validateExpenseInput({ title, amount, currency, paidBy, expenseDate, splitType, participants }) {
  if (!title || !title.trim()) {
    throw validationError('Title is required');
  }
  if (!amount || parseFloat(amount) <= 0) {
    throw validationError('Amount must be greater than 0');
  }
  if (!currency || !['INR', 'USD'].includes(currency)) {
    throw validationError('Currency must be INR or USD');
  }
  if (!paidBy) {
    throw validationError('Paid by is required');
  }
  if (!expenseDate) {
    throw validationError('Expense date is required');
  }
  if (!splitType || !['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARE'].includes(splitType)) {
    throw validationError('Invalid split type');
  }
  if (!participants || participants.length === 0) {
    throw validationError('At least one participant is required');
  }
}

/**
 * Create expense with participants in a transaction.
 */
async function createExpense(groupId, userId, data) {
  await verifyGroupAccess(groupId, userId);
  validateExpenseInput(data);

  const participantUserIds = data.participants.map((p) => Number(p.userId));
  await verifyActiveParticipants(groupId, participantUserIds);

  const paidById = Number(data.paidBy);
  if (!participantUserIds.includes(paidById)) {
    await verifyActiveParticipants(groupId, [paidById]);
  }

  const shares = calculateShares(data.amount, data.splitType, data.participants);

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        groupId: Number(groupId),
        title: data.title.trim(),
        amount: new Prisma.Decimal(data.amount),
        currency: data.currency,
        paidBy: paidById,
        expenseDate: parseDate(data.expenseDate, 'expense date'),
        splitType: data.splitType,
      },
    });

    await tx.expenseParticipant.createMany({
      data: shares.map((s) => ({
        expenseId: created.id,
        userId: s.userId,
        shareAmount: new Prisma.Decimal(s.shareAmount),
      })),
    });

    return tx.expense.findUnique({
      where: { id: created.id },
      include: expenseInclude,
    });
  });

  return expense;
}

/**
 * List expenses for a specific group.
 */
async function getExpensesByGroup(groupId, userId) {
  await verifyGroupAccess(groupId, userId);

  return prisma.expense.findMany({
    where: { groupId: Number(groupId) },
    include: expenseInclude,
    orderBy: { expenseDate: 'desc' },
  });
}

/**
 * List all expenses across groups the user can access.
 */
async function getAllExpenses(userId) {
  return prisma.expense.findMany({
    where: {
      group: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId, leftAt: null } } },
        ],
      },
    },
    include: expenseInclude,
    orderBy: { expenseDate: 'desc' },
  });
}

/**
 * Get a single expense — only if user has access to its group.
 */
async function getExpenseById(expenseId, userId) {
  const id = Number(expenseId);
  if (Number.isNaN(id)) {
    throw validationError('Invalid expense ID');
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id,
      group: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId, leftAt: null } } },
        ],
      },
    },
    include: expenseInclude,
  });

  if (!expense) {
    throw notFoundError('Expense not found');
  }

  return expense;
}

/**
 * Update expense — replaces participants entirely.
 */
async function updateExpense(expenseId, userId, data) {
  const existing = await getExpenseById(expenseId, userId);

  validateExpenseInput(data);

  const participantUserIds = data.participants.map((p) => Number(p.userId));
  await verifyActiveParticipants(existing.groupId, participantUserIds);

  const paidById = Number(data.paidBy);
  const shares = calculateShares(data.amount, data.splitType, data.participants);

  const expense = await prisma.$transaction(async (tx) => {
    await tx.expenseParticipant.deleteMany({ where: { expenseId: existing.id } });

    await tx.expense.update({
      where: { id: existing.id },
      data: {
        title: data.title.trim(),
        amount: new Prisma.Decimal(data.amount),
        currency: data.currency,
        paidBy: paidById,
        expenseDate: parseDate(data.expenseDate, 'expense date'),
        splitType: data.splitType,
      },
    });

    await tx.expenseParticipant.createMany({
      data: shares.map((s) => ({
        expenseId: existing.id,
        userId: s.userId,
        shareAmount: new Prisma.Decimal(s.shareAmount),
      })),
    });

    return tx.expense.findUnique({
      where: { id: existing.id },
      include: expenseInclude,
    });
  });

  return expense;
}

/**
 * Delete expense — cascade deletes participants.
 */
async function deleteExpense(expenseId, userId) {
  const existing = await getExpenseById(expenseId, userId);

  await prisma.expense.delete({ where: { id: existing.id } });

  return { id: existing.id };
}

module.exports = {
  createExpense,
  getExpensesByGroup,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
