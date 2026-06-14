/**
 * Debt simplification routes — nested under /api/groups/:groupId/simplified-balances
 *
 * GET /api/groups/:groupId/simplified-balances
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const debtController = require('../controllers/debtController');

const router = express.Router({ mergeParams: true });

// Every route below requires a valid JWT
router.use(authMiddleware);

router.get('/', debtController.getSimplifiedBalances);

module.exports = router;
