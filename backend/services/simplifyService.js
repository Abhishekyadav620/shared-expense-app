/**
 * Debt simplification — reduces group debts to the minimum number of payments.
 *
 * Uses a greedy algorithm:
 * 1. Start from net balances (creditors vs debtors)
 * 2. Match the largest debtor with the largest creditor
 * 3. Settle the smaller of the two amounts
 * 4. Repeat until all balances are cleared
 */
const balanceService = require('./balanceService');

function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Pure function — takes balance array and returns minimum transactions.
 * Exported separately so it can be tested without hitting the database.
 */
function simplifyBalances(balances) {
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, remaining: Math.abs(b.balance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const amount = round2(Math.min(creditors[i].remaining, debtors[j].remaining));

    if (amount > 0) {
      transactions.push({
        fromUserId: debtors[j].userId,
        fromUserName: debtors[j].userName,
        toUserId: creditors[i].userId,
        toUserName: creditors[i].userName,
        amount,
      });
    }

    creditors[i].remaining = round2(creditors[i].remaining - amount);
    debtors[j].remaining = round2(debtors[j].remaining - amount);

    if (creditors[i].remaining < 0.01) i += 1;
    if (debtors[j].remaining < 0.01) j += 1;
  }

  return transactions;
}

/**
 * Fetch group balances and return simplified payment plan.
 */
async function getSimplifiedDebts(groupId, userId, usdToInrRate) {
  const { balances } = await balanceService.getGroupBalances(groupId, userId, usdToInrRate);
  const simplified = simplifyBalances(balances);

  return {
    simplified,
    transactionCount: simplified.length,
    balances,
  };
}

module.exports = {
  simplifyBalances,
  getSimplifiedDebts,
};
