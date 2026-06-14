/**
 * Expense API calls.
 */
import api from './api';

export async function getAllExpenses() {
  const response = await api.get('/expenses');
  return response.data;
}

export async function getExpensesByGroup(groupId) {
  const response = await api.get(`/groups/${groupId}/expenses`);
  return response.data;
}

export async function getExpenseById(id) {
  const response = await api.get(`/expenses/${id}`);
  return response.data;
}

export async function createExpense(groupId, data) {
  const response = await api.post(`/groups/${groupId}/expenses`, data);
  return response.data;
}

export async function updateExpense(id, data) {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data;
}

export async function deleteExpense(id) {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
}
