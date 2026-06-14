/**
 * Balance HTTP handler — returns group balance summary and simplified debts.
 */
const balanceService = require('../services/balanceService');
const simplifyService = require('../services/simplifyService');

/**
 * GET /api/groups/:groupId/balances
 */
async function getGroupBalances(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const balances = await balanceService.getGroupBalances(groupId, userId);

    res.status(200).json({
      success: true,
      balances,
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

    const { simplified, transactionCount, balances } =
      await simplifyService.getSimplifiedDebts(groupId, userId);

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
  getSimplifiedDebts,
};
