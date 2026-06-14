/**
 * Member HTTP handlers — thin layer between routes and memberService.
 */
const memberService = require('../services/memberService');

/**
 * GET /api/groups/:groupId/members
 */
async function getMembers(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const members = await memberService.getMembers(groupId, userId);

    res.status(200).json({
      success: true,
      message: 'Members fetched successfully',
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/groups/:groupId/members
 * Body: { email, joinedAt? }
 */
async function addMember(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { email, joinedAt } = req.body;

    const member = await memberService.addMember(groupId, userId, { email, joinedAt });

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/groups/:groupId/members/:memberId/remove
 * Body: { leftAt? }
 */
async function removeMember(req, res, next) {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;
    const { leftAt } = req.body;

    const member = await memberService.removeMember(groupId, memberId, userId, { leftAt });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/groups/:groupId/members/:memberId/join-date
 * Body: { joinedAt }
 */
async function updateJoinDate(req, res, next) {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;
    const { joinedAt } = req.body;

    const member = await memberService.updateJoinDate(groupId, memberId, userId, { joinedAt });

    res.status(200).json({
      success: true,
      message: 'Join date updated successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/groups/:groupId/members/:memberId/leave-date
 * Body: { leftAt }
 */
async function updateLeaveDate(req, res, next) {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;
    const { leftAt } = req.body;

    const member = await memberService.updateLeaveDate(groupId, memberId, userId, { leftAt });

    res.status(200).json({
      success: true,
      message: 'Leave date updated successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve member id from route params (:id or :memberId).
 */
function getMemberId(req) {
  return req.params.id || req.params.memberId;
}

/**
 * PUT/PATCH /api/groups/:groupId/members/:id/leave
 * Body: { leaveDate } or { leftAt } (legacy)
 */
async function markMemberLeft(req, res, next) {
  try {
    const { groupId } = req.params;
    const memberId = getMemberId(req);
    const userId = req.user.id;
    const leaveDate = req.body.leaveDate || req.body.leftAt;

    const member = await memberService.markMemberLeft(groupId, memberId, userId, { leaveDate });

    res.status(200).json({
      success: true,
      message: 'Member marked as left',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT/PATCH /api/groups/:groupId/members/:id/edit-leave
 * Body: { leaveDate } or { leftAt } (legacy)
 */
async function editLeaveDate(req, res, next) {
  try {
    const { groupId } = req.params;
    const memberId = getMemberId(req);
    const userId = req.user.id;
    const leaveDate = req.body.leaveDate || req.body.leftAt;

    const member = await memberService.editLeaveDate(groupId, memberId, userId, { leaveDate });

    res.status(200).json({
      success: true,
      message: 'Leave date updated successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT/PATCH /api/groups/:groupId/members/:id/reactivate
 */
async function reactivateMember(req, res, next) {
  try {
    const { groupId } = req.params;
    const memberId = getMemberId(req);
    const userId = req.user.id;

    const member = await memberService.reactivateMember(groupId, memberId, userId);

    res.status(200).json({
      success: true,
      message: 'Member reactivated successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
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
