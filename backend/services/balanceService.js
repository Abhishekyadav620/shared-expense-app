/**
 * Balance engine — computes balances dynamically from stored expenses and settlements.
 *
 * Formula:
 * balance = Total Paid - Total Share - Settlements Paid + Settlements Received
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

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  return round2(value / 100);
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveOnDate(member, expenseDate) {
  const joinedAt = toDate(member.joinedAt);
  const leftAt = toDate(member.leftAt);

  if (!joinedAt || !expenseDate) {
    return false;
  }

  return joinedAt <= expenseDate && (!leftAt || expenseDate <= leftAt);
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
        { members: { some: { userId } } },
      ],
    },
  });

  if (!group) {
    throw notFoundError('Group not found');
  }

  return group;
}

function ensureMemberEntry(ledger, member) {
  if (!ledger.has(member.userId)) {
    ledger.set(member.userId, {
      userId: member.userId,
      name: member.user.name,
      userName: member.user.name,
      paidCents: 0,
      shareCents: 0,
      settlementsPaidCents: 0,
      settlementsReceivedCents: 0,
    });
  }
}

function buildBalanceRow(entry) {
  const paid = fromCents(entry.paidCents);
  const share = fromCents(entry.shareCents);
  const settlementsPaid = fromCents(entry.settlementsPaidCents);
  const settlementsReceived = fromCents(entry.settlementsReceivedCents);
  const balance = round2(paid - share - settlementsPaid + settlementsReceived);

  return {
    userId: entry.userId,
    name: entry.name,
    userName: entry.userName,
    paid,
    share,
    balance,
    status: balance > 0 ? 'gets_back' : balance < 0 ? 'owes' : 'settled',
  };
}

async function getGroupBalances(groupId, userId, usdToInrRate) {
  await verifyGroupAccess(groupId, userId);

  const numericGroupId = Number(groupId);
  const rate = getUsdToInrRate(usdToInrRate);

  const [members, expenses, settlements] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: numericGroupId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.expense.findMany({
      where: { groupId: numericGroupId },
      include: {
        payer: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
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
  ]);

  const ledger = new Map();

  for (const member of members) {
    ensureMemberEntry(ledger, member);
  }

  for (const expense of expenses) {
    const expenseDate = toDate(expense.expenseDate);

    if (!expenseDate) {
      continue;
    }

    const payerMember = members.find((member) => member.userId === expense.paidBy);

    if (payerMember && isActiveOnDate(payerMember, expenseDate)) {
      ensureMemberEntry(ledger, payerMember);
      ledger.get(expense.paidBy).paidCents += toInrCents(expense.amount, expense.currency, rate);
    }

    for (const participant of expense.participants) {
      const participantMember = members.find((member) => member.userId === participant.userId);

      if (!participantMember || !isActiveOnDate(participantMember, expenseDate)) {
        continue;
      }

      ensureMemberEntry(ledger, participantMember);
      ledger.get(participant.userId).shareCents += toInrCents(
        participant.shareAmount,
        expense.currency,
        rate
      );
    }
  }

  for (const settlement of settlements) {
    const amountCents = toCents(settlement.amount);

    if (!ledger.has(settlement.payerId)) {
      ledger.set(settlement.payerId, {
        userId: settlement.payerId,
        name: settlement.payer.name,
        userName: settlement.payer.name,
        paidCents: 0,
        shareCents: 0,
        settlementsPaidCents: 0,
        settlementsReceivedCents: 0,
      });
    }

    if (!ledger.has(settlement.receiverId)) {
      ledger.set(settlement.receiverId, {
        userId: settlement.receiverId,
        name: settlement.receiver.name,
        userName: settlement.receiver.name,
        paidCents: 0,
        shareCents: 0,
        settlementsPaidCents: 0,
        settlementsReceivedCents: 0,
      });
    }

    ledger.get(settlement.payerId).settlementsPaidCents += amountCents;
    ledger.get(settlement.receiverId).settlementsReceivedCents += amountCents;
  }

  return {
    usdToInrRate: rate,
    baseCurrency: 'INR',
    balances: Array.from(ledger.values())
      .map(buildBalanceRow)
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name)),
  };
}

module.exports = {
  getGroupBalances,
};
