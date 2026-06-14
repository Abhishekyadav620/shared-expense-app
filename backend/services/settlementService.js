/**
 * Settlement business logic — record and list payments between group members.
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

const settlementInclude = {
  payer: { select: userSelect },
  receiver: { select: userSelect },
};

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

async function verifyGroupMember(groupId, memberUserId) {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: Number(groupId), userId: Number(memberUserId) },
  });

  if (!membership) {
    throw validationError('Both users must be members of this group');
  }
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return date;
}

/**
 * Record a payment from payer to receiver within a group.
 */
async function createSettlement(groupId, userId, { payerId, receiverId, amount, paymentDate }) {
  await verifyGroupAccess(groupId, userId);

  const payer = Number(payerId);
  const receiver = Number(receiverId);
  const parsedAmount = parseFloat(amount);

  if (!payer || !receiver) {
    throw validationError('Payer and receiver are required');
  }
  if (payer === receiver) {
    throw validationError('Payer and receiver must be different users');
  }
  if (!parsedAmount || parsedAmount <= 0) {
    throw validationError('Amount must be greater than 0');
  }

  await verifyGroupMember(groupId, payer);
  await verifyGroupMember(groupId, receiver);

  const settlement = await prisma.settlement.create({
    data: {
      groupId: Number(groupId),
      payerId: payer,
      receiverId: receiver,
      amount: new Prisma.Decimal(parsedAmount),
      paymentDate: paymentDate ? parseDate(paymentDate, 'payment date') : new Date(),
    },
    include: settlementInclude,
  });

  return settlement;
}

/**
 * List all settlements recorded in a group.
 */
async function getSettlementsByGroup(groupId, userId) {
  await verifyGroupAccess(groupId, userId);

  return prisma.settlement.findMany({
    where: { groupId: Number(groupId) },
    include: settlementInclude,
    orderBy: { paymentDate: 'desc' },
  });
}

/**
 * Delete a settlement record.
 */
async function deleteSettlement(groupId, settlementId, userId) {
  await verifyGroupAccess(groupId, userId);

  const id = Number(settlementId);
  if (Number.isNaN(id)) {
    throw validationError('Invalid settlement ID');
  }

  const settlement = await prisma.settlement.findFirst({
    where: { id, groupId: Number(groupId) },
  });

  if (!settlement) {
    throw notFoundError('Settlement not found');
  }

  await prisma.settlement.delete({ where: { id } });

  return { id };
}

module.exports = {
  createSettlement,
  getSettlementsByGroup,
  deleteSettlement,
};
