/**
 * Debt simplification HTTP handler.
 */
const debtSimplificationService = require('../services/debtSimplificationService');

/**
 * GET /api/groups/:groupId/simplified-balances
 *
 * Returns minimum transactions needed to settle the group.
 */
async function getSimplifiedBalances(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const {
      transactions,
      transactionCount,
      originalTransactionCount,
      transactionsSaved,
      balances,
    } = await debtSimplificationService.getSimplifiedBalances(groupId, userId);

    res.status(200).json({
      success: true,
      transactions,
      transactionCount,
      originalTransactionCount,
      transactionsSaved,
      balances,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSimplifiedBalances,
};
