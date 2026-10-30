import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import { Kanban as KanbanIcon, Plus, Filter, Search, User } from 'lucide-react';

export default function Kanban({ onOpenNewTask, onOpenTaskDetails }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      const [tasksRes, projsRes, usersRes] = await Promise.all([
        api.tasks.list(),
        api.projects.list(),
        api.users.list(),
      ]);

      if (tasksRes.success) setTasks(tasksRes.tasks || []);
      if (projsRes.success) setProjects(projsRes.projects || []);
      if (usersRes.success) setUsers(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.tasks.updateStatus(taskId, newStatus);
    } catch (e) {
      loadData();
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesProject =
      selectedProject === 'all' || t.project_id.toString() === selectedProject;
    const matchesAssignee =
      selectedAssignee === 'all'
        ? true
        : selectedAssignee === 'me'
        ? t.assignee_id === user?.id
        : selectedAssignee === 'unassigned'
        ? !t.assignee_id
        : t.assignee_id?.toString() === selectedAssignee;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    return matchesProject && matchesAssignee && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <KanbanIcon className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              Kanban Board
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Drag and drop tasks between workflow columns to update real-time execution progress.
          </p>
        </div>

        <button
          onClick={() => onOpenNewTask()}
          className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search task title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-500 text-[11px] uppercase">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-500 text-[11px] uppercase">Assignee:</span>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
            >
              <option value="all">Everyone</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id.toString()}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">Loading Kanban board...</div>
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={onOpenTaskDetails}
          onStatusChange={handleStatusChange}
          onNewTaskInStatus={(status) => onOpenNewTask(null, status)}
        />
      )}
    </div>
  );
}
