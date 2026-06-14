/**
 * View Balances page — Splitwise-style balance summary driven by stored data.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getGroupById } from '../services/groupService';
import { getMembers } from '../services/memberService';
import { getExpensesByGroup } from '../services/expenseService';
import { getGroupBalances, getMemberBalanceBreakdown } from '../services/balanceService';
import BalanceBreakdownModal from '../components/BalanceBreakdownModal';

function formatAmount(value) {
  return Math.abs(Number(value || 0)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function buildSettlementSuggestions(balances) {
  const creditors = balances
    .filter((entry) => entry.balance > 0.01)
    .map((entry) => ({ ...entry, remaining: entry.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balances
    .filter((entry) => entry.balance < -0.01)
    .map((entry) => ({ ...entry, remaining: Math.abs(entry.balance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const suggestions = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const amount = Math.min(creditors[creditorIndex].remaining, debtors[debtorIndex].remaining);

    if (amount > 0) {
      suggestions.push({
        fromUserId: debtors[debtorIndex].userId,
        fromUserName: debtors[debtorIndex].name || debtors[debtorIndex].userName,
        toUserId: creditors[creditorIndex].userId,
        toUserName: creditors[creditorIndex].name || creditors[creditorIndex].userName,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditors[creditorIndex].remaining = Math.round((creditors[creditorIndex].remaining - amount) * 100) / 100;
    debtors[debtorIndex].remaining = Math.round((debtors[debtorIndex].remaining - amount) * 100) / 100;

    if (creditors[creditorIndex].remaining < 0.01) creditorIndex += 1;
    if (debtors[debtorIndex].remaining < 0.01) debtorIndex += 1;
  }

  return suggestions;
}

function BalancePage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [usdToInrRate, setUsdToInrRate] = useState(83);
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [breakdownMember, setBreakdownMember] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [groupRes, membersRes, expensesRes, balancesRes] = await Promise.all([
        getGroupById(id),
        getMembers(id),
        getExpensesByGroup(id),
        getGroupBalances(id, usdToInrRate),
      ]);

      setGroup(groupRes.data);
      setMembers(membersRes.data || []);
      setExpenses(expensesRes.data || []);
      setBalances(Array.isArray(balancesRes.balances) ? balancesRes.balances : balancesRes.data || []);
      setBaseCurrency(balancesRes.baseCurrency || 'INR');
      if (balancesRes.usdToInrRate) {
        setUsdToInrRate(balancesRes.usdToInrRate);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load balances');
    } finally {
      setLoading(false);
    }
  }, [id, usdToInrRate]);

  const openBreakdown = async (entry) => {
    setBreakdownMember(entry);
    setBreakdownLoading(true);
    setBreakdown(null);

    try {
      const result = await getMemberBalanceBreakdown(id, entry.userId, usdToInrRate);
      setBreakdown(result.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load breakdown');
      setBreakdownMember(null);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const closeBreakdown = () => {
    setBreakdownMember(null);
    setBreakdown(null);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const settlementSuggestions = useMemo(() => buildSettlementSuggestions(balances), [balances]);

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalReceivable = balances
      .filter((entry) => entry.balance > 0)
      .reduce((sum, entry) => sum + Number(entry.balance || 0), 0);
    const totalPayable = balances
      .filter((entry) => entry.balance < 0)
      .reduce((sum, entry) => sum + Math.abs(Number(entry.balance || 0)), 0);

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      numberOfMembers: members.length,
      numberOfSettlementsNeeded: settlementSuggestions.length,
      totalReceivable: Math.round(totalReceivable * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
    };
  }, [balances, expenses, members.length, settlementSuggestions.length]);

  const sortedBalances = useMemo(
    () => [...balances].sort((a, b) => b.balance - a.balance || (a.name || a.userName || '').localeCompare(b.name || b.userName || '')),
    [balances]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/groups/${id}`}
          className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Group
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">View Balances</p>
                  <h1 className="mt-1 text-3xl font-semibold text-slate-900">View Balances</h1>
                  <p className="mt-2 text-sm text-slate-500">{group?.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    All amounts shown in {baseCurrency}
                    {usdToInrRate ? ` (USD converted at ₹${usdToInrRate}/$)` : ''}
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <label className="text-sm text-slate-600">
                    USD → INR rate
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={usdToInrRate}
                      onChange={(e) => setUsdToInrRate(Number(e.target.value) || 83)}
                      className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-600"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
                  <p className="text-sm font-medium text-emerald-700">Total Receivable</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-800">₹{formatAmount(summary.totalReceivable)}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-100">
                  <p className="text-sm font-medium text-rose-700">Total Payable</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-800">₹{formatAmount(summary.totalPayable)}</p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Balance Summary</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    All values are computed from stored expenses and settlements.
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {summary.numberOfSettlementsNeeded} settlement
                  {summary.numberOfSettlementsNeeded === 1 ? '' : 's'} needed
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-500">Total Expenses</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">₹{formatAmount(summary.totalExpenses)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-500">Number of Members</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.numberOfMembers}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-500">Number of Settlements Needed</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.numberOfSettlementsNeeded}</p>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
                <h2 className="text-lg font-semibold text-slate-900">Member Balances</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Members are sorted by descending balance so the largest creditors appear first.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Member Name</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Paid</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Share</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Net Balance</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedBalances.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-14 text-center text-sm text-slate-500">
                          Add expenses to see balances.
                        </td>
                      </tr>
                    ) : (
                      sortedBalances.map((entry) => {
                        const name = entry.name || entry.userName;
                        const statusLabel =
                          entry.balance > 0
                            ? `Gets back ₹${formatAmount(entry.balance)}`
                            : entry.balance < 0
                              ? `Owes ₹${formatAmount(entry.balance)}`
                              : 'Settled';

                        const rowClass =
                          entry.balance > 0
                            ? 'bg-emerald-50/50'
                            : entry.balance < 0
                              ? 'bg-rose-50/50'
                              : 'bg-slate-50/70';

                        const statusClass =
                          entry.balance > 0
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                            : entry.balance < 0
                              ? 'bg-rose-50 text-rose-700 ring-rose-100'
                              : 'bg-slate-100 text-slate-600 ring-slate-200';

                        return (
                          <tr key={entry.userId} className={rowClass}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                                  {getInitials(name)}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{name}</p>
                                  <p className="text-xs text-slate-500">Member ID #{entry.userId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">₹{formatAmount(entry.paid)}</td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">₹{formatAmount(entry.share)}</td>
                            <td className={`px-6 py-4 text-right text-sm font-semibold ${entry.balance > 0 ? 'text-emerald-700' : entry.balance < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                              {entry.balance > 0 && '+'}
                              {entry.balance < 0 && '−'}₹{formatAmount(entry.balance)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => openBreakdown(entry)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                View breakdown
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Settlement Suggestions</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Minimum transactions required to settle the group.
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {settlementSuggestions.length} suggestion{settlementSuggestions.length === 1 ? '' : 's'}
                </p>
              </div>

              {settlementSuggestions.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Everyone is settled up</p>
                  <p className="mt-1 text-sm text-slate-500">No transactions are needed.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {settlementSuggestions.map((item, index) => (
                    <div
                      key={`${item.fromUserId}-${item.toUserId}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.fromUserName} owes {item.toUserName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Recommended settlement</p>
                      </div>
                      <div className="text-lg font-semibold text-rose-600">₹{formatAmount(item.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {(breakdownMember || breakdownLoading) && (
        breakdownLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="rounded-xl bg-white px-8 py-6 shadow-xl">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          </div>
        ) : (
          <BalanceBreakdownModal
            memberName={breakdownMember?.name || breakdownMember?.userName}
            breakdown={breakdown}
            usdToInrRate={usdToInrRate}
            onClose={closeBreakdown}
          />
        )
      )}
    </div>
  );
}

export default BalancePage;
