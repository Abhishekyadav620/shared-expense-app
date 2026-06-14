/**
 * Balance traceability — Rohan's requirement: show which expenses/settlements
 * make up each member's balance.
 */
const prisma = require('./prismaClient');
const { toInrCents, getUsdToInrRate } = require('./currencyService');

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

function fromCents(cents) {
  return round2(cents / 100);
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveOnDate(member, expenseDate) {
  const joinedAt = toDate(member.joinedAt);
  const leftAt = toDate(member.leftAt);
  if (!joinedAt || !expenseDate) return false;
  return joinedAt <= expenseDate && (!leftAt || expenseDate <= leftAt);
}

async function verifyGroupAccess(groupId, userId) {
  const id = Number(groupId);
  if (Number.isNaN(id)) throw validationError('Invalid group ID');

  const group = await prisma.group.findFirst({
    where: {
      id,
      OR: [{ createdBy: userId }, { members: { some: { userId } } }],
    },
  });

  if (!group) throw notFoundError('Group not found');
  return group;
}

/**
 * GET breakdown for one member — every line that affects their balance.
 */
async function getMemberBalanceBreakdown(groupId, memberUserId, userId, usdToInrRate) {
  await verifyGroupAccess(groupId, userId);

  const numericGroupId = Number(groupId);
  const targetUserId = Number(memberUserId);
  const rate = getUsdToInrRate(usdToInrRate);

  const [members, expenses, settlements, user] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: numericGroupId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.expense.findMany({
      where: { groupId: numericGroupId },
      include: {
        payer: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { expenseDate: 'asc' },
    }),
    prisma.settlement.findMany({
      where: { groupId: numericGroupId },
      include: {
        payer: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } }),
  ]);

  if (!user) throw notFoundError('User not found');

  const lines = [];
  let runningCents = 0;

  let totalPaidCents = 0;
  let totalShareCents = 0;

  for (const expense of expenses) {
    const expenseDate = toDate(expense.expenseDate);
    if (!expenseDate) continue;

    const amountInrCents = toInrCents(expense.amount, expense.currency, rate);

    if (expense.paidBy === targetUserId) {
      const payerMember = members.find((m) => m.userId === expense.paidBy);
      if (payerMember && isActiveOnDate(payerMember, expenseDate)) {
        runningCents += amountInrCents;
        totalPaidCents += amountInrCents;
        lines.push({
          type: 'expense_paid',
          expenseId: expense.id,
          title: expense.title,
          date: expense.expenseDate,
          originalAmount: parseFloat(expense.amount),
          originalCurrency: expense.currency,
          amountInr: fromCents(amountInrCents),
          effect: fromCents(amountInrCents),
          description: `You paid for "${expense.title}"`,
          runningBalance: fromCents(runningCents),
        });
      }
    }

    const participant = expense.participants.find((p) => p.userId === targetUserId);
    if (participant) {
      const participantMember = members.find((m) => m.userId === targetUserId);
      if (participantMember && isActiveOnDate(participantMember, expenseDate)) {
        const shareInrCents = toInrCents(participant.shareAmount, expense.currency, rate);
        runningCents -= shareInrCents;
        totalShareCents += shareInrCents;
        lines.push({
          type: 'expense_share',
          expenseId: expense.id,
          title: expense.title,
          date: expense.expenseDate,
          originalAmount: parseFloat(participant.shareAmount),
          originalCurrency: expense.currency,
          amountInr: fromCents(shareInrCents),
          effect: fromCents(-shareInrCents),
          description: `Your share of "${expense.title}" (paid by ${expense.payer.name})`,
          runningBalance: fromCents(runningCents),
        });
      }
    }
  }

  for (const settlement of settlements) {
    const amountInrCents = toInrCents(settlement.amount, 'INR', rate);

    if (settlement.payerId === targetUserId) {
      runningCents -= amountInrCents;
      lines.push({
        type: 'settlement_paid',
        settlementId: settlement.id,
        title: `Payment to ${settlement.receiver.name}`,
        date: settlement.paymentDate,
        amountInr: fromCents(amountInrCents),
        effect: fromCents(-amountInrCents),
        description: `You paid ${settlement.receiver.name}`,
        runningBalance: fromCents(runningCents),
      });
    }

    if (settlement.receiverId === targetUserId) {
      runningCents += amountInrCents;
      lines.push({
        type: 'settlement_received',
        settlementId: settlement.id,
        title: `Payment from ${settlement.payer.name}`,
        date: settlement.paymentDate,
        amountInr: fromCents(amountInrCents),
        effect: fromCents(amountInrCents),
        description: `You received payment from ${settlement.payer.name}`,
        runningBalance: fromCents(runningCents),
      });
    }
  }

  return {
    userId: targetUserId,
    name: user.name,
    usdToInrRate: rate,
    baseCurrency: 'INR',
    netBalance: fromCents(runningCents),
    summary: {
      paid: fromCents(totalPaidCents),
      share: fromCents(totalShareCents),
      balance: fromCents(runningCents),
    },
    lines,
  };
}

module.exports = {
  getMemberBalanceBreakdown,
};
