import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  Plus,
  FolderKanban,
  User,
  Trash2,
  UserPlus,
  BarChart3,
  CheckCircle2
} from 'lucide-react';

export default function Teams({ onOpenNewTeam, onNavigate }) {
  const { user, isAdmin, isManager } = useAuth();
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamDashboard, setSelectedTeamDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [addingMemberTeamId, setAddingMemberTeamId] = useState(null);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

  const loadData = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        api.teams.list(),
        api.users.list(),
      ]);
      if (teamsRes.success) setTeams(teamsRes.teams || []);
      if (usersRes.success) setAllUsers(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const viewTeamDashboard = async (teamId) => {
    setLoadingDashboard(true);
    try {
      const res = await api.teams.getDashboard(teamId);
      if (res.success) {
        setSelectedTeamDashboard(res);
      }
    } catch (e) {
      alert('Failed to load team dashboard metrics');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleAddMember = async (teamId) => {
    if (!selectedUserIdToAdd) return;
    try {
      const res = await api.teams.addMember(teamId, {
        user_id: parseInt(selectedUserIdToAdd),
        role_in_team: 'member',
      });
      if (res.success) {
        setAddingMemberTeamId(null);
        setSelectedUserIdToAdd('');
        loadData();
        if (selectedTeamDashboard?.team?.id === teamId) {
          viewTeamDashboard(teamId);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!confirm('Remove member from this team?')) return;
    try {
      const res = await api.teams.removeMember(teamId, userId);
      if (res.success) {
        loadData();
        if (selectedTeamDashboard?.team?.id === teamId) {
          viewTeamDashboard(teamId);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Delete this team?')) return;
    try {
      const res = await api.teams.delete(teamId);
      if (res.success) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        if (selectedTeamDashboard?.team?.id === teamId) {
          setSelectedTeamDashboard(null);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to delete team');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">Teams</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Organize departments, squads, and track member productivity and capacity.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenNewTeam}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No teams created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create departments or functional squads to group members and projects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {t.member_count} Members
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTeam(t.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {t.description || 'No description provided.'}
                </p>

                {/* Team Members List */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700">Members</span>
                    {isManager && (
                      <button
                        onClick={() => setAddingMemberTeamId(t.id)}
                        className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>

                  {addingMemberTeamId === t.id && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex gap-2">
                      <select
                        value={selectedUserIdToAdd}
                        onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                        className="flex-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="">Select User...</option>
                        {allUsers
                          .filter((u) => !t.members?.some((m) => m.user_id === u.id))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role.replace('_', ' ')})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAddMember(t.id)}
                        className="px-2.5 py-1 bg-brand-600 text-white text-xs font-semibold rounded-lg"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAddingMemberTeamId(null)}
                        className="px-2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {t.members?.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {m.user?.name ? m.user.name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">{m.user?.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 capitalize">({m.role_in_team})</span>
                          </div>
                        </div>

                        {isManager && (
                          <button
                            onClick={() => handleRemoveMember(t.id, m.user_id)}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                            title="Remove from team"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button: Team Dashboard */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => viewTeamDashboard(t.id)}
                  className="w-full py-2 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>View Team Dashboard & Workload</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Dashboard Modal / Drawer */}
      {selectedTeamDashboard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-zinc-900" />
                <h3 className="text-base font-bold text-zinc-900 font-heading">
                  Team Dashboard: {selectedTeamDashboard.team?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTeamDashboard(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Metrics Header */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Members</p>
                  <h4 className="text-lg font-bold text-zinc-900">{selectedTeamDashboard.total_members}</h4>
                </div>
                <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Projects</p>
                  <h4 className="text-lg font-bold text-zinc-900">{selectedTeamDashboard.total_projects}</h4>
                </div>
                <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Tasks Assigned</p>
                  <h4 className="text-lg font-bold text-zinc-900">{selectedTeamDashboard.total_tasks}</h4>
                </div>
                <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Completion</p>
                  <h4 className="text-lg font-bold text-zinc-900">{selectedTeamDashboard.overall_progress}%</h4>
                </div>
              </div>

              {/* Member Workload Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Member Workload Distribution
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Member</th>
                        <th className="px-4 py-2.5">Assigned</th>
                        <th className="px-4 py-2.5">In Progress</th>
                        <th className="px-4 py-2.5">Completed</th>
                        <th className="px-4 py-2.5">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTeamDashboard.member_workload?.map((m) => (
                        <tr key={m.user_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{m.name}</td>
                          <td className="px-4 py-2.5">{m.assigned_tasks}</td>
                          <td className="px-4 py-2.5 text-blue-600 font-semibold">{m.in_progress_tasks}</td>
                          <td className="px-4 py-2.5 text-emerald-600 font-semibold">{m.completed_tasks}</td>
                          <td className="px-4 py-2.5 font-bold text-brand-600">{m.completion_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
