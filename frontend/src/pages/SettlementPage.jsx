/**
 * Settlement page — Splitwise-style payment history and recording.
 */
import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import SettlementHistoryCard from '../components/SettlementHistoryCard';
import RecordSettlementModal from '../components/RecordSettlementModal';
import { getAllGroups } from '../services/groupService';
import { getMembers } from '../services/memberService';
import {
  getGroupSettlements,
  createSettlement,
  deleteSettlement,
} from '../services/settlementService';
import { useAuth } from '../context/AuthContext';

function SettlementPage() {
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllGroups();
      const groupList = response.data || [];
      setGroups(groupList);
      if (groupList.length > 0) {
        setSelectedGroupId(String(groupList[0].id));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettlements = useCallback(async (groupId) => {
    if (!groupId) return;
    setSettlementsLoading(true);
    setError('');
    try {
      const [membersRes, settlementsRes] = await Promise.all([
        getMembers(groupId),
        getGroupSettlements(groupId),
      ]);
      setMembers(membersRes.data);
      setSettlements(settlementsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settlements');
    } finally {
      setSettlementsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      loadSettlements(selectedGroupId);
    }
  }, [selectedGroupId, loadSettlements]);

  const handleCreate = async (formData) => {
    setSubmitLoading(true);
    try {
      await createSettlement({
        groupId: Number(selectedGroupId),
        ...formData,
      });
      setShowModal(false);
      await loadSettlements(selectedGroupId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (settlement) => {
    if (!window.confirm('Delete this settlement record?')) return;
    setDeleteLoading(settlement.id);
    try {
      await deleteSettlement(settlement.id);
      await loadSettlements(selectedGroupId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete settlement');
    } finally {
      setDeleteLoading(null);
    }
  };

  const selectedGroup = groups.find((g) => String(g.id) === selectedGroupId);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record and review payments between group members
          </p>
        </header>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            description="Create a group first to record settlements."
            actionLabel="Go to Groups"
            actionTo="/groups"
          />
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="group" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Group
                </label>
                <select
                  id="group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:max-w-xs"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={!selectedGroupId}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
              >
                + Add Settlement
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Settlement history</h2>
                  {selectedGroup && (
                    <p className="mt-1 text-sm text-gray-500">{selectedGroup.name}</p>
                  )}
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                  {settlements.length} payment{settlements.length !== 1 ? 's' : ''}
                </span>
              </div>

              {settlementsLoading ? (
                <p className="py-10 text-center text-sm text-gray-500">Loading settlements...</p>
              ) : settlements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-green-200 py-12 text-center">
                  <p className="text-sm font-medium text-gray-900">No settlements yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Record a payment when someone settles up with another member
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settlements.map((settlement) => (
                    <SettlementHistoryCard
                      key={settlement.id}
                      settlement={settlement}
                      onDelete={handleDelete}
                      disabled={deleteLoading === settlement.id}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <RecordSettlementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        loading={submitLoading}
        members={members}
      />
    </div>
  );
}

export default SettlementPage;
