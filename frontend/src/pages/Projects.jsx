import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Users2,
  User,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  MessageSquare
} from 'lucide-react';

export default function Projects({ onNavigate, onOpenNewProject, onOpenProjectChat }) {
  const { isAdmin, isManager } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProjects = async () => {
    try {
      const res = await api.projects.list();
      if (res.success) {
        setProjects(res.projects || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded">Active</span>;
      case 'planning':
        return <span className="bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded">Planning</span>;
      case 'completed':
        return <span className="bg-purple-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded">Completed</span>;
      case 'on_hold':
        return <span className="bg-amber-500 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded">On Hold</span>;
      default:
        return <span className="bg-zinc-200 text-zinc-800 text-[11px] font-semibold px-2.5 py-0.5 rounded capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">Projects</h1>
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            Manage organization initiatives, track deliverables, and view project velocity.
          </p>
        </div>

        {isManager && (
          <button
            onClick={onOpenNewProject}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'active', 'planning', 'completed', 'on_hold'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No projects found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'Try adjusting your search query' : 'Create your first project to organize tasks and teams.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
                    {p.team_name || 'General Team'}
                  </span>
                  {getStatusBadge(p.status)}
                </div>

                <h3
                  onClick={() => onNavigate(`/projects/${p.id}`)}
                  className="text-base font-bold text-slate-900 hover:text-brand-600 cursor-pointer transition-colors leading-snug line-clamp-1"
                >
                  {p.name}
                </h3>

                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Progress</span>
                    <span className="font-bold text-slate-900">
                      {p.progress_percentage}% ({p.completed_tasks}/{p.total_tasks} tasks)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${p.progress_percentage}%` }}
                      className="h-full bg-brand-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* Details Meta */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manager: <strong className="text-slate-700">{p.manager?.name || 'Unassigned'}</strong></span>
                  </div>
                  {(p.start_date || p.end_date) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.start_date || 'Start'} → {p.end_date || 'Ongoing'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenProjectChat && onOpenProjectChat(p.id, p.name)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Project Live Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Chat</span>
                </button>

                <button
                  onClick={() => onNavigate(`/projects/${p.id}`)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>Dashboard & Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
