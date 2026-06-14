/**
 * Balance engine — calculates who owes whom within a group.
 *
 * For each expense:
 *   - Payer's "paid"   += expense.amount
 *   - Each participant's "owed" += their shareAmount
 *
 * balance = paid - owed
 *   Positive → person should receive money
 *   Negative → person owes money
 */
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

function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Verify the requesting user can access this group.
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
 * Calculate net balance for every user involved in the group's expenses.
 */
async function getGroupBalances(groupId, userId) {
  await verifyGroupAccess(groupId, userId);

  const expenses = await prisma.expense.findMany({
    where: { groupId: Number(groupId) },
    include: {
      payer: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  // Accumulate paid and owed per userId
  const ledger = new Map();

  const ensureUser = (id, name) => {
    if (!ledger.has(id)) {
      ledger.set(id, { userId: id, userName: name, paid: 0, owed: 0 });
    }
  };

  for (const expense of expenses) {
    const amount = parseFloat(expense.amount);

    // Payer fronted the full bill
    ensureUser(expense.paidBy, expense.payer.name);
    ledger.get(expense.paidBy).paid += amount;

    // Each participant owes their share
    for (const participant of expense.participants) {
      ensureUser(participant.userId, participant.user.name);
      ledger.get(participant.userId).owed += parseFloat(participant.shareAmount);
    }
  }

  // Apply recorded settlements — payer paid receiver, adjusting net balances
  const settlements = await prisma.settlement.findMany({
    where: { groupId: Number(groupId) },
    include: {
      payer: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
  });

  for (const settlement of settlements) {
    const amount = parseFloat(settlement.amount);
    ensureUser(settlement.payerId, settlement.payer.name);
    ensureUser(settlement.receiverId, settlement.receiver.name);
    // Payer settled debt → balance improves; receiver got paid → balance decreases
    ledger.get(settlement.payerId).paid += amount;
    ledger.get(settlement.receiverId).owed += amount;
  }

  // Convert to balance array: paid - owed
  const balances = Array.from(ledger.values()).map((entry) => ({
    userId: entry.userId,
    userName: entry.userName,
    balance: round2(entry.paid - entry.owed),
  }));

  // Creditors (positive) first, then debtors (negative)
  balances.sort((a, b) => b.balance - a.balance);

  return balances;
}

module.exports = {
  getGroupBalances,
};
