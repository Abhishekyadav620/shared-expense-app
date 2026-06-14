/**
 * Group business logic — CRUD operations for shared expense groups.
 * Controllers pass req.user.id; this layer validates, authorizes, and queries Prisma.
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

function forbiddenError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

/** Fields returned whenever we include the group creator */
const creatorSelect = { id: true, name: true, email: true };

/** Count active members and expenses for list/detail views */
const countSelect = {
  _count: {
    select: {
      members: { where: { leftAt: null } },
      expenses: true,
    },
  },
};

/**
 * User can access a group if they created it or are an active member (leftAt is null).
 */
function accessFilter(userId) {
  return {
    OR: [
      { createdBy: userId },
      { members: { some: { userId, leftAt: null } } },
    ],
  };
}

/**
 * Create a new group and automatically add the creator as the first active member.
 */
async function createGroup({ name, createdBy }) {
  if (!name || !name.trim()) {
    throw validationError('Group name is required');
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      createdBy,
      // Creator becomes the first member — needed for member counts later
      members: {
        create: { userId: createdBy },
      },
    },
    include: {
      creator: { select: creatorSelect },
      ...countSelect,
    },
  });

  return group;
}

/**
 * Return all groups the logged-in user created or actively belongs to.
 */
async function getAllGroups(userId) {
  const groups = await prisma.group.findMany({
    where: accessFilter(userId),
    include: {
      creator: { select: creatorSelect },
      ...countSelect,
    },
    orderBy: { createdAt: 'desc' },
  });

  return groups;
}

/**
 * Fetch a single group by ID — only if the user has access.
 */
async function getGroupById(groupId, userId) {
  const id = Number(groupId);
  if (Number.isNaN(id)) {
    throw validationError('Invalid group ID');
  }

  const group = await prisma.group.findFirst({
    where: { id, ...accessFilter(userId) },
    include: {
      creator: { select: creatorSelect },
      ...countSelect,
    },
  });

  if (!group) {
    throw notFoundError('Group not found');
  }

  return group;
}

/**
 * Update group name — only the creator is allowed.
 */
async function updateGroup(groupId, userId, { name }) {
  const id = Number(groupId);
  if (Number.isNaN(id)) {
    throw validationError('Invalid group ID');
  }
  if (!name || !name.trim()) {
    throw validationError('Group name is required');
  }

  const existing = await prisma.group.findUnique({ where: { id } });

  if (!existing) {
    throw notFoundError('Group not found');
  }
  if (existing.createdBy !== userId) {
    throw forbiddenError('Only the group creator can update this group');
  }

  const group = await prisma.group.update({
    where: { id },
    data: { name: name.trim() },
    include: {
      creator: { select: creatorSelect },
      ...countSelect,
    },
  });

  return group;
}

/**
 * Delete a group — only the creator is allowed.
 * Prisma cascade deletes related members and expenses.
 */
async function deleteGroup(groupId, userId) {
  const id = Number(groupId);
  if (Number.isNaN(id)) {
    throw validationError('Invalid group ID');
  }

  const existing = await prisma.group.findUnique({ where: { id } });

  if (!existing) {
    throw notFoundError('Group not found');
  }
  if (existing.createdBy !== userId) {
    throw forbiddenError('Only the group creator can delete this group');
  }

  await prisma.group.delete({ where: { id } });

  return { id };
}

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
};
