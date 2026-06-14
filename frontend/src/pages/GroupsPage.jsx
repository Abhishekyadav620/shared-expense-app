/**
 * Groups list page — fetches all groups and displays them in a responsive card grid.
 * View / Edit / Delete actions per group; Create Group button top-right.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import GroupCard from '../components/GroupCard';
import { getAllGroups, updateGroup, deleteGroup } from '../services/groupService';

function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllGroups();
      setGroups(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id) => {
    navigate(`/groups/${id}`);
  };

  const handleEdit = async (group) => {
    const newName = window.prompt('Enter new group name:', group.name);
    if (!newName || newName.trim() === group.name) return;

    setActionLoading(group.id);
    try {
      const response = await updateGroup(group.id, newName.trim());
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? response.data : g))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;

    setActionLoading(group.id);
    try {
      await deleteGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header row — title left, Create Group right */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your shared expense groups
            </p>
          </div>

          <Link
            to="/groups/create"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + Create Group
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">No groups yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first group to start tracking expenses
            </p>
            <Link
              to="/groups/create"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create Group
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                disabled={actionLoading === group.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default GroupsPage;
