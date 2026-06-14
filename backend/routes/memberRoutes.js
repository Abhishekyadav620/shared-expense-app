/**
 * Member routes — nested under /api/groups/:groupId/members
 * JWT protection inherited from groupRoutes.
 *
 * GET    /api/groups/:groupId/members
 * POST   /api/groups/:groupId/members
 * PUT    /api/groups/:groupId/members/:id/leave
 * PUT    /api/groups/:groupId/members/:id/edit-leave
 * PUT    /api/groups/:groupId/members/:id/reactivate
 * PATCH  /api/groups/:groupId/members/:memberId/remove       (legacy)
 * PATCH  /api/groups/:groupId/members/:memberId/join-date    (legacy)
 * PATCH  /api/groups/:groupId/members/:memberId/leave-date   (legacy)
 */
const express = require('express');
const memberController = require('../controllers/memberController');

const router = express.Router({ mergeParams: true });

router.get('/', memberController.getMembers);
router.post('/', memberController.addMember);

// New leave-management routes (PUT + PATCH for compatibility)
router.put('/:id/leave', memberController.markMemberLeft);
router.put('/:id/edit-leave', memberController.editLeaveDate);
router.put('/:id/reactivate', memberController.reactivateMember);

router.patch('/:memberId/leave', memberController.markMemberLeft);
router.patch('/:memberId/edit-leave', memberController.editLeaveDate);
router.patch('/:memberId/reactivate', memberController.reactivateMember);

// Legacy PATCH routes (backward compatible)
router.patch('/:memberId/remove', memberController.removeMember);
router.patch('/:memberId/join-date', memberController.updateJoinDate);
router.patch('/:memberId/leave-date', memberController.updateLeaveDate);

module.exports = router;
