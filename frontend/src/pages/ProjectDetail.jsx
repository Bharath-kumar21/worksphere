import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import {
  FolderKanban,
  Kanban,
  CheckSquare,
  BarChart3,
  Calendar,
  Users2,
  User,
  Plus,
  ArrowLeft,
  MessageSquare,
  Clock,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export default function ProjectDetail({ projectId, onNavigate, onOpenNewTask, onOpenTaskDetails, onOpenProjectChat }) {
  const { user, isAdmin, isManager } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban', 'tasks', 'analytics'

  const loadData = async () => {
    try {
      const [projRes, tasksRes, dashRes] = await Promise.all([
        api.projects.get(projectId),
        api.tasks.list({ project_id: projectId }),
        api.projects.getDashboard(projectId),
      ]);

      if (projRes.success) setProject(projRes.project);
      if (tasksRes.success) setTasks(tasksRes.tasks || []);
      if (dashRes.success) setDashboard(dashRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.tasks.updateStatus(taskId, newStatus);
      // reload dashboard stats in background
      api.projects.getDashboard(projectId).then((res) => {
        if (res.success) setDashboard(res);
      });
    } catch (e) {
      loadData();
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Are you sure you want to delete project '${project.name}'? This will delete all associated tasks.`)) return;
    try {
      const res = await api.projects.delete(projectId);
      if (res.success) {
        onNavigate('/projects');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading project workspace...</div>;
  }

  if (!project) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-semibold text-slate-700">Project not found</p>
        <button
          onClick={() => onNavigate('/projects')}
          className="mt-3 text-xs text-brand-600 font-semibold"
        >
          ← Return to Projects
        </button>
      </div>
    );
  }

  const metrics = dashboard?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Top Navigation & Project Header */}
      <div>
        <button
          onClick={() => onNavigate('/projects')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </button>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md">
                {project.team_name || 'Organization Project'}
              </span>
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">{project.name}</h1>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
              {project.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Manager: <strong>{project.manager?.name || 'Unassigned'}</strong></span>
              </div>
              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Timeline: {project.start_date || 'Start'} → {project.end_date || 'End'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={() => onOpenProjectChat && onOpenProjectChat(project.id, project.name)}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-zinc-700" />
              <span>Project Chat</span>
            </button>

            <button
              onClick={() => onOpenNewTask && onOpenNewTask(project.id)}
              className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleDeleteProject}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Project Mini Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Tasks</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total_tasks || 0}</h3>
          <span className="text-[11px] text-brand-600">{metrics.progress_percentage || 0}% completed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">In Progress</p>
          <h3 className="text-xl font-bold text-blue-600 mt-0.5">{metrics.in_progress || 0}</h3>
          <span className="text-[11px] text-slate-500">Active tasks</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Review Required</p>
          <h3 className="text-xl font-bold text-amber-600 mt-0.5">{metrics.review || 0}</h3>
          <span className="text-[11px] text-slate-500">Pending sign-off</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Overdue</p>
          <h3 className={`text-xl font-bold mt-0.5 ${metrics.overdue_count > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {metrics.overdue_count || 0}
          </h3>
          <span className="text-[11px] text-slate-500">Past target date</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'kanban'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>Interactive Kanban Board</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Task List ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Project Analytics & Workload</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          onTaskClick={onOpenTaskDetails}
          onStatusChange={handleStatusChange}
          onNewTaskInStatus={(status) => onOpenNewTask && onOpenNewTask(project.id, status)}
        />
      ) : activeTab === 'tasks' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Task Title</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                    No tasks yet in this project.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(t.id)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-zinc-900">{t.title}</td>
                    <td className="px-5 py-3.5 text-zinc-600">
                      {t.assignee?.name || <span className="italic text-zinc-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`capitalize font-semibold text-[10px] px-2 py-0.5 rounded ${
                        t.priority === 'urgent' ? 'bg-red-600 text-white' :
                        t.priority === 'high' ? 'bg-amber-500 text-white' :
                        t.priority === 'medium' ? 'bg-blue-600 text-white' :
                        'bg-zinc-200 text-zinc-900'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`capitalize font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                        t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        t.status === 'review' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{t.due_date || 'None'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Analytics View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Team Member Workload in Project
            </h4>
            <div className="space-y-3">
              {(dashboard?.member_workloads || []).map((mw, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                      {mw.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{mw.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {mw.completed} / {mw.total} tasks completed
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-600">
                    {Math.round((mw.completed / (mw.total || 1)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Overdue Tasks Alert
            </h4>
            <div className="space-y-2.5">
              {(dashboard?.overdue_tasks || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No overdue tasks in this project!</p>
              ) : (
                dashboard.overdue_tasks.map((ot) => (
                  <div
                    key={ot.id}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(ot.id)}
                    className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-red-900">{ot.title}</p>
                      <p className="text-[10px] text-red-700">Due: {ot.due_date}</p>
                    </div>
                    <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded">
                      Overdue
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
