/**
 * Balance routes — nested under /api/groups/:groupId/balances
 * JWT protection inherited from groupRoutes.
 *
 * GET /api/groups/:groupId/balances
 */
const express = require('express');
const balanceController = require('../controllers/balanceController');

const router = express.Router({ mergeParams: true });

// /simplified must be registered before / to avoid being treated as a param
router.get('/simplified', balanceController.getSimplifiedDebts);
router.get('/:userId/breakdown', balanceController.getMemberBalanceBreakdown);
router.get('/', balanceController.getGroupBalances);

module.exports = router;
