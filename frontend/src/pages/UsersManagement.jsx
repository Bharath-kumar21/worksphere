import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  UserCog,
  UserPlus,
  Shield,
  Briefcase,
  Users,
  Search,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function UsersManagement({ onOpenNewUser }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.users.list();
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (targetUser, newRole) => {
    try {
      const res = await api.users.update(targetUser.id, { role: newRole });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.users.update(targetUser.id, { status: newStatus });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (targetUserId) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return;
    try {
      const res = await api.users.delete(targetUserId);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      }
    } catch (err) {
      alert(err.message || 'Failed to remove user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              User & Role Management
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Administer organization members, assign permissions, and control access levels.
          </p>
        </div>

        <button
          onClick={onOpenNewUser}
          className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite / Add User</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'admin', 'project_manager', 'team_member'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-xl capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-24 text-center text-zinc-400 text-sm">Loading users...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold text-[10px] uppercase">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Assigned Tasks</th>
                <th className="px-5 py-3">System Role</th>
                <th className="px-5 py-3">Account Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-zinc-900">{u.name}</p>
                        <p className="text-[10px] text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-zinc-800">
                      {u.assigned_tasks_count || 0} tasks
                    </span>
                    <span className="text-[10px] text-emerald-600 ml-1.5 font-medium">
                      ({u.completed_tasks_count || 0} completed)
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-60 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="team_member">Team Member</option>
                    </select>
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.id === currentUser?.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-60 ${
                        u.status === 'active'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {u.status === 'active' ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Inactive
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
