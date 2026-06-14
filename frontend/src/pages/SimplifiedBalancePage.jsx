/**
 * Simplified balance page — Splitwise-style "Settle Up" view.
 * Shows minimum transactions needed to clear group debts.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SettlementCard from '../components/SettlementCard';
import EmptyState from '../components/EmptyState';
import { getGroupById } from '../services/groupService';
import { getSimplifiedBalances } from '../services/debtService';
import { useAuth } from '../context/AuthContext';

function SimplifiedBalancePage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [transactionsSaved, setTransactionsSaved] = useState(0);
  const [originalTransactionCount, setOriginalTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [groupRes, debtRes] = await Promise.all([
        getGroupById(id),
        getSimplifiedBalances(id),
      ]);

      setGroup(groupRes.data);
      setTransactions(debtRes.transactions);
      setTransactionCount(debtRes.transactionCount);
      setTransactionsSaved(debtRes.transactionsSaved);
      setOriginalTransactionCount(debtRes.originalTransactionCount);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load simplified balances');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            to={`/groups/${id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to group
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading settle up plan...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
        ) : (
          <>
            <header className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Settle Up</h1>
              {group && <p className="mt-1 text-gray-500">{group.name}</p>}
              <p className="mt-2 text-sm text-gray-600">
                Minimum payments to clear all balances in this group
              </p>
            </header>

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-green-100 bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-600">{transactionCount}</p>
                <p className="mt-1 text-sm text-gray-500">Payments needed</p>
              </div>

              <div className="rounded-xl border border-green-100 bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-600">{transactionsSaved}</p>
                <p className="mt-1 text-sm text-gray-500">Transactions saved</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-700">{originalTransactionCount}</p>
                <p className="mt-1 text-sm text-gray-500">Raw expense debts</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                title="All settled up!"
                description="No outstanding balances — everyone is even."
              />
            ) : (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Suggested payments</h2>
                {transactions.map((transaction, index) => (
                  <SettlementCard
                    key={`${transaction.fromUser.userId}-${transaction.toUser.userId}-${index}`}
                    transaction={transaction}
                    currentUserId={user?.id}
                  />
                ))}
              </section>
            )}

            <div className="mt-8 text-center">
              <Link
                to={`/groups/${id}/balances`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View detailed balances →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default SimplifiedBalancePage;
