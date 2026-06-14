/**
 * Balance HTTP handler — returns group balance summary and simplified debts.
 */
const balanceService = require('../services/balanceService');
const balanceBreakdownService = require('../services/balanceBreakdownService');
const simplifyService = require('../services/simplifyService');

/**
 * GET /api/groups/:groupId/balances
 */
async function getGroupBalances(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const usdToInrRate = req.query.usdToInrRate;

    const result = await balanceService.getGroupBalances(groupId, userId, usdToInrRate);

    res.status(200).json({
      success: true,
      usdToInrRate: result.usdToInrRate,
      baseCurrency: result.baseCurrency,
      balances: result.balances,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups/:groupId/balances/:userId/breakdown
 */
async function getMemberBalanceBreakdown(req, res, next) {
  try {
    const { groupId, userId: memberUserId } = req.params;
    const userId = req.user.id;
    const usdToInrRate = req.query.usdToInrRate;

    const breakdown = await balanceBreakdownService.getMemberBalanceBreakdown(
      groupId,
      memberUserId,
      userId,
      usdToInrRate
    );

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups/:groupId/balances/simplified
 */
async function getSimplifiedDebts(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const usdToInrRate = req.query.usdToInrRate;

    const { simplified, transactionCount, balances } =
      await simplifyService.getSimplifiedDebts(groupId, userId, usdToInrRate);

    res.status(200).json({
      success: true,
      simplified,
      transactionCount,
      balances,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGroupBalances,
  getMemberBalanceBreakdown,
  getSimplifiedDebts,
};
