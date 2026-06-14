/**
 * Debt simplification — Min Cash Flow algorithm.
 *
 * Takes net balances (from the balance engine) and produces the smallest
 * set of payments that clears everyone's account.
 */
const prisma = require('./prismaClient');
const balanceService = require('./balanceService');

/** Round to 2 decimal places — avoids floating-point drift in money math. */
function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Min Cash Flow — pure function, no database access.
 *
 * @param {Array<{ userId: number, userName: string, balance: number }>} balances
 * @returns {Array<{ fromUser: object, toUser: object, amount: number }>}
 */
function minCashFlow(balances) {
  // Creditors: positive balance → should receive money (sorted largest first)
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  // Debtors: negative balance → owe money (store remaining as positive amount)
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, remaining: Math.abs(b.balance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const transactions = [];
  let creditorIdx = 0;
  let debtorIdx = 0;

  // Greedy matching: pair largest creditor with largest debtor until both lists are exhausted
  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const amount = round2(
      Math.min(creditors[creditorIdx].remaining, debtors[debtorIdx].remaining)
    );

    if (amount > 0) {
      transactions.push({
        fromUser: {
          userId: debtors[debtorIdx].userId,
          userName: debtors[debtorIdx].userName,
        },
        toUser: {
          userId: creditors[creditorIdx].userId,
          userName: creditors[creditorIdx].userName,
        },
        amount,
      });
    }

    // Reduce both sides by the settled amount
    creditors[creditorIdx].remaining = round2(
      creditors[creditorIdx].remaining - amount
    );
    debtors[debtorIdx].remaining = round2(debtors[debtorIdx].remaining - amount);

    // Move to next person once their remaining balance hits zero
    if (creditors[creditorIdx].remaining < 0.01) creditorIdx += 1;
    if (debtors[debtorIdx].remaining < 0.01) debtorIdx += 1;
  }

  return transactions;
}

/**
 * Count raw expense-level debts (before netting) — used to show how many
 * transactions simplification saved vs paying each expense share directly.
 */
async function countRawExpenseDebts(groupId) {
  const expenses = await prisma.expense.findMany({
    where: { groupId: Number(groupId) },
    include: { participants: true },
  });

  let count = 0;

  for (const expense of expenses) {
    for (const participant of expense.participants) {
      // Each non-payer participant owes the payer their share → one raw transaction
      if (participant.userId !== expense.paidBy) {
        count += 1;
      }
    }
  }

  return count;
}

/**
 * Fetch group balances, run Min Cash Flow, return simplified payment plan.
 */
async function getSimplifiedBalances(groupId, userId, usdToInrRate) {
  const { balances } = await balanceService.getGroupBalances(groupId, userId, usdToInrRate);
  const transactions = minCashFlow(balances);
  const originalTransactionCount = await countRawExpenseDebts(groupId);
  const transactionsSaved = Math.max(0, originalTransactionCount - transactions.length);

  return {
    transactions,
    transactionCount: transactions.length,
    originalTransactionCount,
    transactionsSaved,
    balances,
  };
}

module.exports = {
  minCashFlow,
  getSimplifiedBalances,
};
