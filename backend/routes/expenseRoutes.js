/**
 * Expense routes — group-scoped (nested) and global expense operations.
 *
 * Group-scoped (mounted at /api/groups/:groupId/expenses):
 *   GET  /api/groups/:groupId/expenses
 *   POST /api/groups/:groupId/expenses
 *
 * Global (mounted at /api/expenses):
 *   GET    /api/expenses
 *   GET    /api/expenses/:id
 *   PUT    /api/expenses/:id
 *   DELETE /api/expenses/:id
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const expenseController = require('../controllers/expenseController');

const groupExpenseRouter = express.Router({ mergeParams: true });
groupExpenseRouter.get('/', expenseController.getExpensesByGroup);
groupExpenseRouter.post('/', expenseController.createExpense);

const router = express.Router();
router.use(authMiddleware);
router.get('/', expenseController.getAllExpenses);
router.get('/:id', expenseController.getExpenseById);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = { groupExpenseRouter, router };
