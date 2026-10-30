import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  History,
  Search,
  FolderKanban,
  User,
  Filter,
  CheckCircle2,
  FileText,
  MessageSquare,
  Paperclip,
  Activity as ActivityIcon
} from 'lucide-react';

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  const loadActivities = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProject) params.project_id = selectedProject;
      if (selectedUser) params.user_id = selectedUser;

      const [actRes, projsRes, usersRes] = await Promise.all([
        api.activity.list(params),
        api.projects.list(),
        api.users.list(),
      ]);

      if (actRes.success) setActivities(actRes.activities || []);
      if (projsRes.success) setProjects(projsRes.projects || []);
      if (usersRes.success) setUsers(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [selectedProject, selectedUser]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'created_task':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'updated_task_status':
        return <ActivityIcon className="w-4 h-4 text-blue-600" />;
      case 'added_comment':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'uploaded_attachment':
        return <Paperclip className="w-4 h-4 text-amber-600" />;
      case 'created_project':
        return <FolderKanban className="w-4 h-4 text-indigo-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              Activity History
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Complete audit trail of all project updates, status transitions, and user actions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 uppercase text-[10px]">Filter by Project:</span>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 uppercase text-[10px]">Filter by Member:</span>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Members</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">Loading audit logs...</div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No activity recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Actions such as task creation, status updates, and comments will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {activities.map((a) => (
              <div key={a.id} className="relative flex items-start gap-3">
                <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-white border-2 border-zinc-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                </div>

                <div className="flex-1 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-white border border-zinc-200">
                        {getActionIcon(a.action)}
                      </div>
                      <span className="text-xs font-bold text-zinc-900">{a.user_name}</span>
                      <span className="text-[10px] text-zinc-700 uppercase font-semibold bg-zinc-200 px-1.5 py-0.5 rounded">
                        {a.action.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-400">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {a.details}
                  </p>

                  {(a.project_name || a.task_title) && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                      {a.project_name && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                          Project: {a.project_name}
                        </span>
                      )}
                      {a.task_title && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                          Task: {a.task_title}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
