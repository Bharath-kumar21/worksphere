import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  MessageSquare,
  Paperclip,
  Trash2,
  Clock,
  AlertCircle,
  Circle,
  CheckCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export default function Tasks({ onOpenNewTask, onOpenTaskDetails }) {
  const { user, isAdmin, isManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'to_do', 'in_progress', 'review', 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const loadData = async () => {
    try {
      const [tasksRes, projsRes, usersRes] = await Promise.all([
        api.tasks.list({ assignee_id: user?.role === 'team_member' ? 'me' : undefined }),
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

  const handleStatusChange = async (taskId, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.tasks.updateStatus(taskId, newStatus);
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const toggleTaskCompletion = async (t, e) => {
    if (e) e.stopPropagation();
    const nextStatus = t.status === 'completed' ? 'to_do' : 'completed';
    await handleStatusChange(t.id, nextStatus, e);
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await api.tasks.delete(taskId);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusTab === 'all' || t.status === statusTab;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesProject = projectFilter === 'all' || t.project_id.toString() === projectFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const countTotal = tasks.length;
  const countToDo = tasks.filter((t) => t.status === 'to_do').length;
  const countInProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const countReview = tasks.filter((t) => t.status === 'review').length;
  const countCompleted = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Solid Header */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              My Tasks
            </h1>
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            Manage your assignments, priorities, and deadlines in one clear workspace.
          </p>
        </div>

        {isManager && onOpenNewTask && (
          <button
            onClick={() => onOpenNewTask()}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Status Tabs & Filters Bar */}
        <div className="p-5 border-b border-zinc-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Solid Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                statusTab === 'all'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <span>All Tasks</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  statusTab === 'all' ? 'bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-800'
                }`}
              >
                {countTotal}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('to_do')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                statusTab === 'to_do'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <span>To Do</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  statusTab === 'to_do' ? 'bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-800'
                }`}
              >
                {countToDo}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('in_progress')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                statusTab === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <span>In Progress</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  statusTab === 'in_progress' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900'
                }`}
              >
                {countInProgress}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('review')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                statusTab === 'review'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <span>Review</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  statusTab === 'review' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {countReview}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                statusTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <span>Done</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  statusTab === 'completed' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {countCompleted}
              </span>
            </button>
          </div>

          {/* Search & Project Filter */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder-zinc-400"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Solid Task Rows List */}
        {loading ? (
          <div className="py-24 text-center text-zinc-500 text-sm font-medium">
            Loading tasks...
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {filteredTasks.length === 0 ? (
              <div className="py-20 text-center text-zinc-400">
                <CheckCircle2 className="w-10 h-10 text-zinc-300 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-zinc-700">No tasks match your filters</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Try adjusting your search criteria or create a new task.
                </p>
              </div>
            ) : (
              filteredTasks.map((t) => {
                const overdue = isOverdue(t.due_date, t.status);
                const isDone = t.status === 'completed';

                return (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetails(t.id)}
                    className="p-4 hover:bg-zinc-50 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Checkbox toggle */}
                      <button
                        onClick={(e) => toggleTaskCompletion(t, e)}
                        title={isDone ? 'Mark incomplete' : 'Mark complete'}
                        className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 hover:text-zinc-900" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold transition-colors ${
                              isDone
                                ? 'line-through text-zinc-400'
                                : 'text-zinc-900 group-hover:text-blue-600'
                            }`}
                          >
                            {t.title}
                          </span>

                          {t.project_name && (
                            <span className="text-[11px] font-semibold bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded">
                              {t.project_name}
                            </span>
                          )}

                          <span
                            className={`capitalize font-semibold text-[10px] px-2 py-0.5 rounded ${
                              t.priority === 'urgent'
                                ? 'bg-red-600 text-white'
                                : t.priority === 'high'
                                ? 'bg-amber-500 text-white'
                                : t.priority === 'medium'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-200 text-zinc-800'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-zinc-600 line-clamp-1 mt-0.5">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-1.5 text-[11px] text-zinc-500">
                          {t.assignee && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-800 text-[9px] font-bold flex items-center justify-center">
                                {t.assignee.name.charAt(0)}
                              </span>
                              <span>{t.assignee.name}</span>
                            </span>
                          )}

                          {t.comment_count > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-zinc-400" /> {t.comment_count}
                            </span>
                          )}

                          {t.attachment_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-zinc-400" /> {t.attachment_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right solid status and actions */}
                    <div className="flex items-center gap-3.5 shrink-0">
                      {t.due_date && (
                        <div className="text-right hidden sm:block">
                          <span
                            className={`flex items-center gap-1 text-xs font-semibold ${
                              overdue
                                ? 'text-red-700 font-bold'
                                : isDone
                                ? 'text-zinc-400'
                                : 'text-zinc-700'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {t.due_date}
                            {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                          </span>
                        </div>
                      )}

                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value, e)}
                          className={`text-xs font-semibold rounded-md px-2.5 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-900 ${
                            t.status === 'completed'
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : t.status === 'in_progress'
                              ? 'bg-blue-600 text-white border-blue-700'
                              : t.status === 'review'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-zinc-200 text-zinc-900 border-zinc-300'
                          }`}
                        >
                          <option value="to_do">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Done</option>
                        </select>
                      </div>

                      {(isManager || isAdmin) && (
                        <button
                          onClick={(e) => handleDeleteTask(t.id, e)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
