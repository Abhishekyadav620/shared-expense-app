/**
 * Settlement HTTP handlers.
 */
const settlementService = require('../services/settlementService');

/**
 * POST /api/settlements
 * Body: { groupId, payerId, receiverId, amount, paymentDate }
 */
async function createSettlement(req, res, next) {
  try {
    const userId = req.user.id;
    const { groupId, payerId, receiverId, amount, paymentDate } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'groupId is required',
      });
    }

    const settlement = await settlementService.createSettlement(groupId, userId, {
      payerId,
      receiverId,
      amount,
      paymentDate,
    });

    res.status(201).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups/:groupId/settlements
 */
async function getGroupSettlements(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const settlements = await settlementService.getGroupSettlements(groupId, userId);

    res.status(200).json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/settlements/:id
 */
async function deleteSettlement(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await settlementService.deleteSettlement(id, userId);

    res.status(200).json({
      success: true,
      data: [],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSettlement,
  getGroupSettlements,
  deleteSettlement,
};
