/**
 * Group details page — group overview + member management.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MemberList from '../components/MemberList';
import AddMemberModal from '../components/AddMemberModal';
import ExpenseCard from '../components/ExpenseCard';
import EmptyState from '../components/EmptyState';
import { getGroupById } from '../services/groupService';
import {
  getMembers,
  addMember,
  removeMember,
  updateJoinDate,
  updateLeaveDate,
} from '../services/memberService';
import { getExpensesByGroup, deleteExpense } from '../services/expenseService';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toInputDate(dateString) {
  return new Date(dateString).toISOString().split('T')[0];
}

function GroupDetailsPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [expenseDeleteLoading, setExpenseDeleteLoading] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const response = await getGroupById(id);
      setGroup(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group');
    }
  }, [id]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const response = await getMembers(id);
      setMembers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const response = await getExpensesByGroup(id);
      setExpenses(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setExpensesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      await Promise.all([fetchGroup(), fetchMembers(), fetchExpenses()]);
      setLoading(false);
    };
    load();
  }, [fetchGroup, fetchMembers, fetchExpenses]);

  const refreshAll = async () => {
    await Promise.all([fetchGroup(), fetchMembers(), fetchExpenses()]);
  };

  const handleAddMember = async ({ email, joinedAt }) => {
    setAddLoading(true);
    try {
      await addMember(id, email, joinedAt);
      setShowAddModal(false);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (member) => {
    const leaveDate = window.prompt(
      'Leave date (YYYY-MM-DD) or leave blank for today:',
      toInputDate(new Date())
    );
    if (leaveDate === null) return;

    setActionLoading(member.id);
    try {
      await removeMember(id, member.id, leaveDate || undefined);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateJoinDate = async (member) => {
    const newDate = window.prompt(
      'New join date (YYYY-MM-DD):',
      toInputDate(member.joinedAt)
    );
    if (!newDate) return;

    setActionLoading(member.id);
    try {
      await updateJoinDate(id, member.id, newDate);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update join date');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateLeaveDate = async (member) => {
    const newDate = window.prompt(
      'New leave date (YYYY-MM-DD):',
      member.leftAt ? toInputDate(member.leftAt) : toInputDate(new Date())
    );
    if (!newDate) return;

    setActionLoading(member.id);
    try {
      await updateLeaveDate(id, member.id, newDate);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update leave date');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete "${expense.title}"?`)) return;
    setExpenseDeleteLoading(expense.id);
    try {
      await deleteExpense(expense.id);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setExpenseDeleteLoading(null);
    }
  };

  const activeCount = members.filter((m) => !m.leftAt).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/groups"
          className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Groups
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : error && !group ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-500">{error}</p>
            <Link
              to="/groups"
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Return to Groups
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{group.name}</h1>
                  <p className="mt-1 text-sm text-gray-500">Group overview and member management</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    + Add Member
                  </button>
                  <Link
                    to={`/groups/${id}/expenses/create`}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    + Add Expense
                  </Link>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-100 p-4">
                  <dt className="text-sm font-medium text-gray-500">Creator</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {group.creator?.name || 'Unknown'}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {formatDate(group.createdAt)}
                  </dd>
                </div>
                <div className="rounded-lg bg-indigo-50 p-4">
                  <dt className="text-sm font-medium text-gray-500">Active Members</dt>
                  <dd className="mt-1 text-base font-semibold text-indigo-600">{activeCount}</dd>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <dt className="text-sm font-medium text-gray-500">Expenses</dt>
                  <dd className="mt-1 text-base font-semibold text-green-500">
                    {group._count?.expenses ?? 0}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {members.length} total · {activeCount} active
                    </p>
                  </div>
                </div>

                <MemberList
                  members={members}
                  onRemove={handleRemove}
                  onUpdateJoinDate={handleUpdateJoinDate}
                  onUpdateLeaveDate={handleUpdateLeaveDate}
                  actionLoading={actionLoading}
                  loading={membersLoading}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
                    <p className="mt-1 text-sm text-gray-500">{expenses.length} total</p>
                  </div>
                  <Link
                    to={`/groups/${id}/expenses/create`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Expense
                  </Link>
                </div>

                {expensesLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                  </div>
                ) : expenses.length === 0 ? (
                  <EmptyState
                    title="No expenses yet"
                    description="Add the first expense for this group"
                    actionLabel="Add Expense"
                    actionTo={`/groups/${id}/expenses/create`}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {expenses.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        showGroup={false}
                        onDelete={handleDeleteExpense}
                        disabled={expenseDeleteLoading === expense.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        loading={addLoading}
      />
    </div>
  );
}

export default GroupDetailsPage;
