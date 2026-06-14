/**
 * Modal to record a settlement payment between two group members.
 */
import { useState, useEffect } from 'react';

function RecordSettlementModal({ isOpen, onClose, onSubmit, loading, initialData, members }) {
  const [payerId, setPayerId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setPayerId(String(initialData.payerId || initialData.fromUserId || ''));
      setReceiverId(String(initialData.receiverId || initialData.toUserId || ''));
      setAmount(String(initialData.amount || ''));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!payerId || !receiverId) {
      setError('Select payer and receiver');
      return;
    }
    if (payerId === receiverId) {
      setError('Payer and receiver must be different');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    onSubmit({
      payerId: Number(payerId),
      receiverId: Number(receiverId),
      amount: parseFloat(amount),
      paymentDate,
    });
  };

  const handleClose = () => {
    setPayerId('');
    setReceiverId('');
    setAmount('');
    setError('');
    onClose();
  };

  const activeMembers = members.filter((m) => !m.leftAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Record Settlement</h2>
        <p className="mt-1 text-sm text-gray-500">Log a payment between group members</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="payer" className="mb-1.5 block text-sm font-medium text-gray-700">
              Paid by (debtor)
            </label>
            <select
              id="payer"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600"
            >
              <option value="">Select payer</option>
              {activeMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="receiver" className="mb-1.5 block text-sm font-medium text-gray-700">
              Paid to (creditor)
            </label>
            <select
              id="receiver"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600"
            >
              <option value="">Select receiver</option>
              {activeMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

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
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="paymentDate" className="mb-1.5 block text-sm font-medium text-gray-700">
              Payment date
            </label>
            <input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordSettlementModal;
