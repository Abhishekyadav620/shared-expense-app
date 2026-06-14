/**
 * Create expense page — form with all split types.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getGroupById } from '../services/groupService';
import { getMembers } from '../services/memberService';
import { createExpense } from '../services/expenseService';
import { useAuth } from '../context/AuthContext';

const SPLIT_TYPES = [
  { value: 'EQUAL', label: 'Equal Split' },
  { value: 'EXACT', label: 'Exact Amount' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'SHARE', label: 'Share Based' },
];

function CreateExpensePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [activeMembers, setActiveMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paidBy, setPaidBy] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('EQUAL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [shareValues, setShareValues] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [groupRes, membersRes] = await Promise.all([
          getGroupById(groupId),
          getMembers(groupId),
        ]);
        setGroup(groupRes.data);
        const active = membersRes.data.filter((m) => !m.leftAt);
        setActiveMembers(active);
        const ids = active.map((m) => m.userId);
        setSelectedIds(ids);
        if (active.some((m) => m.userId === user?.id)) {
          setPaidBy(String(user.id));
        } else if (active.length > 0) {
          setPaidBy(String(active[0].userId));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, user?.id]);

  const toggleParticipant = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleShareChange = (userId, value) => {
    setShareValues((prev) => ({ ...prev, [userId]: value }));
  };

  const shareHint = {
    EXACT: 'Enter exact amount per person (must sum to total)',
    PERCENTAGE: 'Enter percentage per person (must sum to 100)',
    SHARE: 'Enter share units e.g. 2, 1, 1',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError('Title is required');
    if (!amount || parseFloat(amount) <= 0) return setError('Valid amount is required');
    if (!paidBy) return setError('Select who paid');
    if (selectedIds.length === 0) return setError('Select at least one participant');

    const participants = selectedIds.map((userId) => {
      if (splitType === 'EQUAL') return { userId: Number(userId) };
      return {
        userId: Number(userId),
        shareAmount: parseFloat(shareValues[userId] || 0),
      };
    });

    setSubmitting(true);
    try {
      const response = await createExpense(groupId, {
        title: title.trim(),
        amount: parseFloat(amount),
        currency,
        paidBy: Number(paidBy),
        expenseDate,
        splitType,
        participants,
      });
      navigate(`/expenses/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/groups/${groupId}`}
          className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Group
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900">Add Expense</h1>
            <p className="mt-1 text-sm text-gray-500">
              {group?.name} — record a shared expense
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner, Groceries, Rent"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="paidBy" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Paid By
                  </label>
                  <select
                    id="paidBy"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                  >
                    {activeMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="expenseDate" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    id="expenseDate"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="splitType" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Split Type
                </label>
                <select
                  id="splitType"
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                >
                  {SPLIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Participants</p>
                {splitType !== 'EQUAL' && (
                  <p className="mb-3 text-xs text-gray-500">{shareHint[splitType]}</p>
                )}
                <div className="space-y-2 rounded-lg border border-slate-200 p-4">
                  {activeMembers.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.userId)}
                        onChange={() => toggleParticipant(m.userId)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span className="flex-1 text-sm text-gray-900">{m.user.name}</span>
                      {splitType !== 'EQUAL' && selectedIds.includes(m.userId) && (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={splitType === 'PERCENTAGE' ? '%' : '0'}
                          value={shareValues[m.userId] || ''}
                          onChange={(e) => handleShareChange(m.userId, e.target.value)}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-indigo-600"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create Expense'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default CreateExpensePage;
