/**
 * Expense HTTP handlers — thin layer between routes and expenseService.
 */
const expenseService = require('../services/expenseService');

/**
 * POST /api/groups/:groupId/expenses
 */
async function createExpense(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const expense = await expenseService.createExpense(groupId, userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups/:groupId/expenses
 */
async function getExpensesByGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const expenses = await expenseService.getExpensesByGroup(groupId, userId);

    res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully',
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses
 */
async function getAllExpenses(req, res, next) {
  try {
    const userId = req.user.id;

    const expenses = await expenseService.getAllExpenses(userId);

    res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully',
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses/:id
 */
async function getExpenseById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await expenseService.getExpenseById(id, userId);

    res.status(200).json({
      success: true,
      message: 'Expense fetched successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/expenses/:id
 */
async function updateExpense(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await expenseService.updateExpense(id, userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/expenses/:id
 */
async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await expenseService.deleteExpense(id, userId);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createExpense,
  getExpensesByGroup,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
