import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Calendar,
  Plus,
  Search,
  List,
  LayoutGrid,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Circle,
  CheckCircle,
  AlertCircle,
  Layers,
  ArrowRight,
  UserPlus
} from 'lucide-react';

export default function Dashboard({ onNavigate, onOpenNewTask, onOpenTaskDetails, onOpenNewProject, onOpenNewUser }) {
  const { user, isManager, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Clean, uncluttered List view is default for maximum clarity
  const [viewMode, setViewMode] = useState('list'); // 'list' (default) or 'board'

  // Filter states
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'to_do', 'in_progress', 'review', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Drag-and-drop state for board mode
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const fetchDashboard = async () => {
    try {
      const [res, myTasksRes, projsRes] = await Promise.all([
        api.dashboard.getOverview(),
        api.tasks.list({ assignee_id: user?.role === 'team_member' ? 'me' : undefined }),
        api.projects.myProjects ? api.projects.myProjects() : api.projects.list(),
      ]);

      if (res.success) setData(res);
      if (myTasksRes.success) setTasks(myTasksRes.tasks || []);
      if (projsRes.success) setProjects(projsRes.projects || []);
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentDateFormatted = () => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRelativeDeadline = (dueDate, status) => {
    if (!dueDate) return { label: 'No date', isOverdue: false, isToday: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const days = Math.abs(diffDays);
      return {
        label: `${days}d overdue`,
        isOverdue: status !== 'completed',
        isToday: false,
      };
    } else if (diffDays === 0) {
      return { label: 'Today', isOverdue: false, isToday: true };
    } else if (diffDays === 1) {
      return { label: 'Tomorrow', isOverdue: false, isToday: false };
    } else {
      return { label: `In ${diffDays}d`, isOverdue: false, isToday: false };
    }
  };

  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.tasks.updateStatus(taskId, newStatus);
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        fetchDashboard();
      }
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const toggleTaskCompletion = async (task, e) => {
    e.stopPropagation();
    const nextStatus = task.status === 'completed' ? 'to_do' : 'completed';
    await handleQuickStatusChange(task.id, nextStatus);
  };

  // Drag and Drop handlers for board mode
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e, columnStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr);
    setDraggedTaskId(null);

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== columnStatus) {
      await handleQuickStatusChange(taskId, columnStatus);
    }
  };

  // Metrics calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const memberTasks =
    user?.role === 'team_member' ? tasks : tasks.filter((t) => t.assignee_id === user?.id);

  const countTotal = memberTasks.length;
  const countToDo = memberTasks.filter((t) => t.status === 'to_do').length;
  const countInProgress = memberTasks.filter((t) => t.status === 'in_progress').length;
  const countReview = memberTasks.filter((t) => t.status === 'review').length;
  const countCompleted = memberTasks.filter((t) => t.status === 'completed').length;
  const countDueThisWeek = memberTasks.filter((t) => {
    if (!t.due_date || t.status === 'completed') return false;
    const d = new Date(t.due_date);
    return d >= startOfWeek && d <= endOfWeek;
  }).length;
  const countOverdue = memberTasks.filter((t) => {
    return t.due_date && t.due_date < todayStr && t.status !== 'completed';
  }).length;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (user?.role === 'team_member' && task.assignee_id !== user.id) return false;

    // Status Tab filter
    if (statusTab !== 'all' && task.status !== statusTab) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description && task.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedProject !== 'all' && task.project_id.toString() !== selectedProject) return false;
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;

    return true;
  });

  // Solid Priority Badges
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-600 text-white">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500 text-white">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white">
            Medium
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
            Low
          </span>
        );
    }
  };

  const memberStats = data?.member_stats || {};
  const upcomingDeadlines = memberStats.upcoming_deadlines || [];
  const myProjectsList = memberStats.projects || projects.slice(0, 4);

  // Solid 4 Kanban Columns Configuration
  const COLUMNS = [
    {
      id: 'to_do',
      title: 'To Do',
      colorDot: 'bg-zinc-500',
      badgeBg: 'bg-zinc-200 text-zinc-900 border border-zinc-300',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      colorDot: 'bg-blue-600',
      badgeBg: 'bg-blue-600 text-white',
    },
    {
      id: 'review',
      title: 'Review',
      colorDot: 'bg-amber-500',
      badgeBg: 'bg-amber-500 text-white',
    },
    {
      id: 'completed',
      title: 'Done',
      colorDot: 'bg-emerald-600',
      badgeBg: 'bg-emerald-600 text-white',
    },
  ];

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-500 text-sm font-medium">
        Loading WorkSphere workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Welcoming Header (Solid Card) */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-500 font-medium">
              {getCurrentDateFormatted()}
            </span>
            {memberStats.team_name && (
              <span className="text-xs text-zinc-600 font-medium">
                • {memberStats.team_name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
            {getGreeting()}, {user?.name}! 👋
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            {countInProgress > 0
              ? `You have ${countInProgress} task${countInProgress > 1 ? 's' : ''} in progress. Everything is on track.`
              : `You're all caught up for today! Have a great workday.`}
          </p>
        </div>

        {/* Solid Primary Action Button */}
        <div className="flex items-center gap-3">
          {isAdmin && onOpenNewUser && (
            <button
              onClick={() => onOpenNewUser()}
              className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
              title="Add a new employee / user to the organization"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}

          {isManager && onOpenNewTask && (
            <button
              onClick={() => onOpenNewTask()}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
          {isManager && onOpenNewProject && (
            <button
              onClick={() => onOpenNewProject()}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4 text-zinc-600" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Solid Metric Cards (Click to filter!) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Tasks */}
        <button
          onClick={() => setStatusTab('all')}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusTab === 'all'
              ? 'bg-white border-zinc-900 ring-2 ring-zinc-900 shadow-sm'
              : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">My Tasks</span>
            <CheckSquare className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2 font-heading">{countTotal}</p>
          <span className="text-xs text-zinc-500 mt-0.5 block">Total assigned</span>
        </button>

        {/* In Progress */}
        <button
          onClick={() => setStatusTab('in_progress')}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusTab === 'in_progress'
              ? 'bg-white border-blue-600 ring-2 ring-blue-600 shadow-sm'
              : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">In Progress</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2 font-heading">{countInProgress}</p>
          <span className="text-xs text-zinc-500 mt-0.5 block">Active deliverables</span>
        </button>

        {/* Due This Week */}
        <button
          onClick={() => setStatusTab('all')}
          className="text-left p-4 rounded-xl border bg-white border-zinc-200 hover:border-zinc-300 shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Due This Week</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2 font-heading">{countDueThisWeek}</p>
          <span className="text-xs text-zinc-500 mt-0.5 block">Upcoming deadlines</span>
        </button>

        {/* Completed or Overdue */}
        <button
          onClick={() => setStatusTab(countOverdue > 0 ? 'all' : 'completed')}
          className={`text-left p-4 rounded-xl border transition-all ${
            countOverdue > 0
              ? 'bg-red-50 border-red-300 text-red-900'
              : statusTab === 'completed'
              ? 'bg-white border-emerald-600 ring-2 ring-emerald-600 shadow-sm'
              : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold ${
                countOverdue > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {countOverdue > 0 ? 'Overdue Tasks' : 'Completed'}
            </span>
            {countOverdue > 0 ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 font-heading ${
              countOverdue > 0 ? 'text-red-700' : 'text-zinc-900'
            }`}
          >
            {countOverdue > 0 ? countOverdue : countCompleted}
          </p>
          <span
            className={`text-xs mt-0.5 block ${
              countOverdue > 0 ? 'text-red-700 font-semibold' : 'text-zinc-500'
            }`}
          >
            {countOverdue > 0 ? 'Needs attention' : 'Finished work'}
          </span>
        </button>
      </div>

      {/* 3. Primary Workspace: Tasks */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Workspace Toolbar Header */}
        <div className="p-5 border-b border-zinc-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Solid Status Filter Tabs */}
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

          {/* Search, Filter & View Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder-zinc-400"
              />
            </div>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle: List vs Board */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-300 shrink-0">
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                title="Board View"
                className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'board'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4A. List View (Default - Solid, Clean, Readable) */}
        {viewMode === 'list' && (
          <div className="divide-y divide-zinc-200">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const rel = getRelativeDeadline(task.due_date, task.status);
                const isDone = task.status === 'completed';

                return (
                  <div
                    key={`list-task-${task.id}`}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task.id)}
                    className="p-4 hover:bg-zinc-50 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Checkbox toggle button */}
                      <button
                        onClick={(e) => toggleTaskCompletion(task, e)}
                        title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
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
                            {task.title}
                          </span>

                          {task.project_name && (
                            <span className="text-[11px] font-semibold bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded">
                              {task.project_name}
                            </span>
                          )}

                          {getPriorityBadge(task.priority)}
                        </div>

                        {task.description && (
                          <p className="text-xs text-zinc-600 line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Metadata & Solid Status */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Deadline label */}
                      <div className="text-right hidden sm:block">
                        <span
                          className={`text-xs font-semibold block ${
                            rel.isOverdue
                              ? 'text-red-700 font-bold'
                              : rel.isToday
                              ? 'text-amber-700 font-bold'
                              : 'text-zinc-700'
                          }`}
                        >
                          {rel.label}
                        </span>
                        {task.due_date && (
                          <span className="text-[10px] text-zinc-500 block">{task.due_date}</span>
                        )}
                      </div>

                      {/* Status select dropdown */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task.id, e.target.value)}
                          className={`text-xs font-semibold rounded-md px-2.5 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-900 ${
                            task.status === 'completed'
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : task.status === 'in_progress'
                              ? 'bg-blue-600 text-white border-blue-700'
                              : task.status === 'review'
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

                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center text-zinc-400">
                <CheckCircle2 className="w-10 h-10 text-zinc-300 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-zinc-700">No tasks found</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {searchQuery ? 'Try clearing your search filters' : 'You are completely caught up!'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4B. Board View (Optional Solid Toggle) */}
        {viewMode === 'board' && (
          <div className="p-5 bg-zinc-100">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);
                const isOver = dragOverColumn === col.id;

                return (
                  <div
                    key={`board-col-${col.id}`}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`bg-zinc-200 rounded-xl p-3 border transition-colors flex flex-col min-h-[460px] ${
                      isOver ? 'border-zinc-900 ring-2 ring-zinc-900 bg-zinc-300' : 'border-zinc-300'
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.colorDot}`} />
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-heading">
                          {col.title}
                        </h3>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${col.badgeBg}`}>
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {colTasks.length > 0 ? (
                        colTasks.map((task) => {
                          const rel = getRelativeDeadline(task.due_date, task.status);

                          return (
                            <div
                              key={`board-task-${task.id}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onClick={() => onOpenTaskDetails && onOpenTaskDetails(task.id)}
                              className={`bg-white p-3.5 rounded-lg border border-zinc-200 shadow-sm hover:border-zinc-400 cursor-grab active:cursor-grabbing transition-all space-y-2 ${
                                draggedTaskId === task.id ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-semibold bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded truncate max-w-[140px]">
                                  {task.project_name || 'General'}
                                </span>
                                {getPriorityBadge(task.priority)}
                              </div>

                              <h4 className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-snug">
                                {task.title}
                              </h4>

                              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                                <span
                                  className={`font-semibold ${
                                    rel.isOverdue
                                      ? 'text-red-700'
                                      : rel.isToday
                                      ? 'text-amber-700'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {rel.label}
                                </span>

                                <div className="flex items-center gap-2">
                                  {task.comment_count > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <MessageSquare className="w-3 h-3 text-zinc-500" />
                                      {task.comment_count}
                                    </span>
                                  )}
                                  {task.attachment_count > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Paperclip className="w-3 h-3 text-zinc-500" />
                                      {task.attachment_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-32 border-2 border-dashed border-zinc-300 rounded-lg flex items-center justify-center text-xs text-zinc-500 font-medium">
                          Drop tasks here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Solid Bottom Overview: Deadlines & Active Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-900" />
              <h3 className="text-xs font-bold text-zinc-900 font-heading uppercase tracking-wider">
                Upcoming Deadlines
              </h3>
            </div>
            <button
              onClick={() => onNavigate('/calendar')}
              className="text-xs font-semibold text-zinc-900 hover:text-black flex items-center gap-1"
            >
              <span>Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.slice(0, 4).map((t) => (
                <div
                  key={`deadline-${t.id}`}
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails(t.id)}
                  className="p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{t.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{t.project_name || 'Project'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-semibold block ${
                        t.is_overdue
                          ? 'text-red-700 font-bold'
                          : t.relative_deadline === 'Today'
                          ? 'text-amber-700 font-bold'
                          : 'text-zinc-700'
                      }`}
                    >
                      {t.relative_deadline}
                    </span>
                    <span className="text-[10px] text-zinc-500">{t.due_date}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">No upcoming deadlines</p>
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-zinc-900" />
              <h3 className="text-xs font-bold text-zinc-900 font-heading uppercase tracking-wider">
                Active Projects
              </h3>
            </div>
            <button
              onClick={() => onNavigate('/projects')}
              className="text-xs font-semibold text-zinc-900 hover:text-black flex items-center gap-1"
            >
              <span>All Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {myProjectsList.length > 0 ? (
              myProjectsList.slice(0, 4).map((p) => {
                const progress = p.progress_percentage || 0;

                return (
                  <div
                    key={`proj-${p.id}`}
                    onClick={() => onNavigate(`/projects/${p.id}`)}
                    className="p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-zinc-900 truncate">{p.name}</h4>
                      <span className="text-xs font-bold text-zinc-900">{progress}%</span>
                    </div>

                    <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${progress}%` }}
                        className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {p.completed_tasks || p.my_completed_tasks_count || 0}/
                        {p.total_tasks || p.my_tasks_count || 0} completed
                      </span>
                      <span className="capitalize font-medium">{p.status}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">No projects assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
