/**
 * Settlement routes — nested under /api/groups/:groupId/settlements
 *
 * POST   /api/groups/:groupId/settlements
 * GET    /api/groups/:groupId/settlements
 * DELETE /api/groups/:groupId/settlements/:id
 */
const express = require('express');
const settlementController = require('../controllers/settlementController');

const router = express.Router({ mergeParams: true });

router.post('/', settlementController.createSettlement);
router.get('/', settlementController.getSettlements);
router.delete('/:id', settlementController.deleteSettlement);

module.exports = router;
