/**
 * Settlement HTTP handlers.
 */
const settlementService = require('../services/settlementService');

/**
 * POST /api/groups/:groupId/settlements
 */
async function createSettlement(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const settlement = await settlementService.createSettlement(groupId, userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups/:groupId/settlements
 */
async function getSettlements(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const settlements = await settlementService.getSettlementsByGroup(groupId, userId);

    res.status(200).json({
      success: true,
      message: 'Settlements fetched successfully',
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/groups/:groupId/settlements/:id
 */
async function deleteSettlement(req, res, next) {
  try {
    const { groupId, id } = req.params;
    const userId = req.user.id;

    await settlementService.deleteSettlement(groupId, id, userId);

    res.status(200).json({
      success: true,
      message: 'Settlement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSettlement,
  getSettlements,
  deleteSettlement,
};
