/**
 * Group route definitions — all endpoints require JWT authentication.
 * Mounted in app.js at /api/groups → full paths:
 *   POST   /api/groups
 *   GET    /api/groups
 *   GET    /api/groups/:id
 *   PUT    /api/groups/:id
 *   DELETE /api/groups/:id
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const groupController = require('../controllers/groupController');
const memberRoutes = require('./memberRoutes');
const { groupExpenseRouter } = require('./expenseRoutes');
const balanceRoutes = require('./balanceRoutes');
const debtRoutes = require('./debtRoutes');
const settlementRoutes = require('./settlementRoutes');

const router = express.Router();

// Every group route requires a valid JWT — runs before any handler below
router.use(authMiddleware);

router.post('/', groupController.createGroup);
router.get('/', groupController.getAllGroups);

// Member routes must be registered before /:id to avoid route conflicts
router.use('/:groupId/members', memberRoutes);
router.use('/:groupId/expenses', groupExpenseRouter);
router.use('/:groupId/balances', balanceRoutes);
router.use('/:groupId/simplified-balances', debtRoutes);
router.use('/:groupId/settlements', settlementRoutes);

router.get('/:id', groupController.getGroupById);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

module.exports = router;
