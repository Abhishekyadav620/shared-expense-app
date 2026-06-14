/**
 * Member business logic — add, remove (soft), and update membership dates.
 * Members are never deleted; leaving sets leftAt instead.
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

const userSelect = { id: true, name: true, email: true };

const memberInclude = {
  user: { select: userSelect },
};

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
 * Fetch a membership row and ensure it belongs to the given group.
 */
async function findMemberInGroup(groupId, memberId) {
  const gId = Number(groupId);
  const mId = Number(memberId);
  if (Number.isNaN(gId) || Number.isNaN(mId)) {
    throw validationError('Invalid ID');
  }

  const member = await prisma.groupMember.findFirst({
    where: { id: mId, groupId: gId },
    include: memberInclude,
  });

  if (!member) {
    throw notFoundError('Member not found');
  }

  return member;
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return date;
}

/** Normalize to UTC midnight for date-only storage (avoids timezone shift in DB). */
function toDateOnly(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return d;
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parse YYYY-MM-DD (or ISO string) as a date-only UTC value. */
function parseDateOnly(value, fieldName) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) {
      throw validationError(`Invalid ${fieldName}`);
    }
    return date;
  }
  return toDateOnly(parseDate(value, fieldName));
}

/**
 * List all members for a group — active and former — with user details.
 */
async function getMembers(groupId, userId) {
  await verifyGroupAccess(groupId, userId);

  const members = await prisma.groupMember.findMany({
    where: { groupId: Number(groupId) },
    include: memberInclude,
    orderBy: [{ leftAt: 'asc' }, { joinedAt: 'desc' }],
  });

  return members;
}

/**
 * Add a member by email. Reactivates if they previously left (clears leftAt).
 */
async function addMember(groupId, userId, { email, joinedAt }) {
  await verifyGroupAccess(groupId, userId);

  if (!email || !email.trim()) {
    throw validationError('Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!targetUser) {
    throw validationError('No registered user found with this email');
  }

  const joinDate = joinedAt ? parseDate(joinedAt, 'join date') : new Date();

  const existing = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: Number(groupId),
        userId: targetUser.id,
      },
    },
  });

  if (existing && !existing.leftAt) {
    throw validationError('User is already an active member of this group');
  }

  if (existing) {
    // Rejoin — update existing row, never create duplicate
    return prisma.groupMember.update({
      where: { id: existing.id },
      data: { joinedAt: joinDate, leftAt: null },
      include: memberInclude,
    });
  }

  return prisma.groupMember.create({
    data: {
      groupId: Number(groupId),
      userId: targetUser.id,
      joinedAt: joinDate,
    },
    include: memberInclude,
  });
}

/**
 * Mark member as left — sets leftAt (soft delete). Row is never deleted.
 */
async function markMemberLeft(groupId, memberId, userId, { leaveDate }) {
  await verifyGroupAccess(groupId, userId);
  const member = await findMemberInGroup(groupId, memberId);

  if (member.leftAt) {
    throw validationError('Member has already left this group');
  }

  if (!leaveDate) {
    throw validationError('Leave date is required');
  }

  const parsedLeaveDate = parseDateOnly(leaveDate, 'leave date');
  const joinedDateOnly = toDateOnly(member.joinedAt);

  if (parsedLeaveDate < joinedDateOnly) {
    throw validationError('Leave date cannot be before join date');
  }

  return prisma.groupMember.update({
    where: { id: member.id },
    data: { leftAt: parsedLeaveDate },
    include: memberInclude,
  });
}

/**
 * Edit an existing leave date (historical correction for inactive members).
 */
async function editLeaveDate(groupId, memberId, userId, { leaveDate }) {
  await verifyGroupAccess(groupId, userId);
  const member = await findMemberInGroup(groupId, memberId);

  if (!member.leftAt) {
    throw validationError('Member is still active — use Mark Left instead');
  }

  if (!leaveDate) {
    throw validationError('Leave date is required');
  }

  const parsedLeaveDate = parseDateOnly(leaveDate, 'leave date');
  const joinedDateOnly = toDateOnly(member.joinedAt);

  if (parsedLeaveDate < joinedDateOnly) {
    throw validationError('Leave date cannot be before join date');
  }

  return prisma.groupMember.update({
    where: { id: member.id },
    data: { leftAt: parsedLeaveDate },
    include: memberInclude,
  });
}

/**
 * Reactivate a former member — clears leftAt so they are active again.
 */
async function reactivateMember(groupId, memberId, userId) {
  await verifyGroupAccess(groupId, userId);
  const member = await findMemberInGroup(groupId, memberId);

  if (!member.leftAt) {
    throw validationError('Member is already active');
  }

  return prisma.groupMember.update({
    where: { id: member.id },
    data: { leftAt: null },
    include: memberInclude,
  });
}

/**
 * Remove member — sets leftAt (soft leave). Does not delete the row.
 * @deprecated Use markMemberLeft — kept for backward compatibility.
 */
async function removeMember(groupId, memberId, userId, { leftAt }) {
  return markMemberLeft(groupId, memberId, userId, {
    leaveDate: leftAt || new Date().toISOString().split('T')[0],
  });
}

/**
 * Update when a member joined the group.
 */
async function updateJoinDate(groupId, memberId, userId, { joinedAt }) {
  await verifyGroupAccess(groupId, userId);
  const member = await findMemberInGroup(groupId, memberId);

  if (!joinedAt) {
    throw validationError('Join date is required');
  }

  const newJoinDate = parseDate(joinedAt, 'join date');

  if (member.leftAt && toDateOnly(newJoinDate) > toDateOnly(member.leftAt)) {
    throw validationError('Join date cannot be after leave date');
  }

  return prisma.groupMember.update({
    where: { id: member.id },
    data: { joinedAt: newJoinDate },
    include: memberInclude,
  });
}

/**
 * Update when a member left the group (historical correction).
 * @deprecated Use editLeaveDate — kept for backward compatibility.
 */
async function updateLeaveDate(groupId, memberId, userId, { leftAt }) {
  return editLeaveDate(groupId, memberId, userId, { leaveDate: leftAt });
}

module.exports = {
  getMembers,
  addMember,
  removeMember,
  markMemberLeft,
  editLeaveDate,
  reactivateMember,
  updateJoinDate,
  updateLeaveDate,
};
