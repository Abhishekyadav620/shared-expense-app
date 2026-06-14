/**
 * Settlement routes — JWT protected.
 *
 * Top-level (mounted at /api/settlements in app.js):
 *   POST   /api/settlements
 *   DELETE /api/settlements/:id
 *
 * Group-scoped (mounted at /api/groups/:groupId/settlements in groupRoutes.js):
 *   GET    /api/groups/:groupId/settlements
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const settlementController = require('../controllers/settlementController');

const router = express.Router();
router.use(authMiddleware);
router.post('/', settlementController.createSettlement);
router.delete('/:id', settlementController.deleteSettlement);

const groupRouter = express.Router({ mergeParams: true });
groupRouter.use(authMiddleware);
groupRouter.get('/', settlementController.getGroupSettlements);

module.exports = { router, groupRouter };
