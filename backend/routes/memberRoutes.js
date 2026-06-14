/**
 * Member routes — nested under /api/groups/:groupId/members
 * All routes require JWT (inherited from groupRoutes).
 *
 * GET    /api/groups/:groupId/members
 * POST   /api/groups/:groupId/members
 * PATCH  /api/groups/:groupId/members/:memberId/remove
 * PATCH  /api/groups/:groupId/members/:memberId/join-date
 * PATCH  /api/groups/:groupId/members/:memberId/leave-date
 */
const express = require('express');
const memberController = require('../controllers/memberController');

// mergeParams gives access to :groupId from the parent router
const router = express.Router({ mergeParams: true });

router.get('/', memberController.getMembers);
router.post('/', memberController.addMember);
router.patch('/:memberId/remove', memberController.removeMember);
router.patch('/:memberId/join-date', memberController.updateJoinDate);
router.patch('/:memberId/leave-date', memberController.updateLeaveDate);

module.exports = router;
