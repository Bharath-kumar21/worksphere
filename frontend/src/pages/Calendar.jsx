import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  AlertCircle,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';

export default function Calendar({ onOpenTaskDetails }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'month', 'week', 'day'
  const [viewMode, setViewMode] = useState('month');

  // Currently selected date for calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const loadData = async () => {
    try {
      const [calRes, projsRes] = await Promise.all([
        api.calendar.getMyDeadlines(),
        api.projects.myProjects ? api.projects.myProjects() : api.projects.list(),
      ]);

      if (calRes.success) {
        setTasks(calRes.deadlines || []);
      }
      if (projsRes.success) {
        setProjects(projsRes.projects || []);
      }
    } catch (e) {
      console.error('Failed to load calendar data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesProject =
      projectFilter === 'all' || (t.project_id && t.project_id.toString() === projectFilter);
    return matchesStatus && matchesProject;
  });

  // Calendar date calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Priority color styling
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white border-red-600 hover:bg-red-700';
      case 'high':
        return 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600';
      case 'medium':
        return 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
      default:
        return 'bg-zinc-200 text-zinc-900 border-zinc-300 hover:bg-zinc-300';
    }
  };

  // Helper to format Date to YYYY-MM-DD
  const formatDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayKey = formatDateKey(new Date());

  // Render Month View Grid
  const renderMonthView = () => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Map tasks by due_date
    const tasksByDate = {};
    filteredTasks.forEach((t) => {
      if (t.due_date) {
        if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = [];
        tasksByDate[t.due_date].push(t);
      }
    });

    const cells = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      cells.push({
        dayNum: dNum,
        isCurrentMonth: false,
        dateKey: null,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateKey = formatDateKey(d);
      cells.push({
        dayNum: day,
        isCurrentMonth: true,
        dateKey,
        isToday: dateKey === todayKey,
        dayTasks: tasksByDate[dateKey] || [],
      });
    }

    // Next month filler days to complete rows (up to multiple of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push({
          dayNum: i,
          isCurrentMonth: false,
          dateKey: null,
        });
      }
    }

    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-100 text-zinc-600 text-xs font-semibold text-center py-2.5">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y divide-zinc-200">
          {cells.map((cell, idx) => (
            <div
              key={`cell-${idx}`}
              className={`p-2 flex flex-col justify-between overflow-hidden transition-colors ${
                !cell.isCurrentMonth
                  ? 'bg-zinc-100 text-zinc-400'
                  : cell.isToday
                  ? 'bg-zinc-100'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    cell.isToday
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : cell.isCurrentMonth
                      ? 'text-zinc-800'
                      : 'text-zinc-400'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {cell.dayTasks?.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    {cell.dayTasks.length} task{cell.dayTasks.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Tasks list inside day */}
              <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px] pr-0.5">
                {cell.dayTasks?.map((task) => (
                  <button
                    key={`cal-task-${task.id}`}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task.id)}
                    className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-medium truncate flex items-center justify-between gap-1 shadow-xs transition-all ${getPriorityStyle(
                      task.priority
                    )}`}
                    title={`${task.title} - ${task.status}`}
                  >
                    <span className="truncate">{task.title}</span>
                    {task.is_overdue && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateKey = formatDateKey(d);
      days.push({
        date: d,
        dateKey,
        isToday: dateKey === todayKey,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dayNum: d.getDate(),
        tasks: filteredTasks.filter((t) => t.due_date === dateKey),
      });
    }

    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-zinc-200 min-h-[480px]">
          {days.map((day) => (
            <div
              key={day.dateKey}
              className={`p-3 flex flex-col ${day.isToday ? 'bg-zinc-100' : 'bg-white'}`}
            >
              <div className="text-center pb-3 border-b border-zinc-200">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase">{day.dayName}</p>
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mt-1 ${
                    day.isToday ? 'bg-zinc-900 text-white' : 'text-zinc-800'
                  }`}
                >
                  {day.dayNum}
                </div>
              </div>

              <div className="mt-3 space-y-2 flex-1 overflow-y-auto">
                {day.tasks.map((task) => (
                  <div
                    key={`wk-${task.id}`}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-xs transition-transform hover:-translate-y-0.5 ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {task.priority}
                      </span>
                      <span className="text-[10px] capitalize font-medium opacity-80">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 line-clamp-2">{task.title}</p>
                    {task.project_name && (
                      <p className="text-[10px] text-slate-500 mt-1 truncate">
                        {task.project_name}
                      </p>
                    )}
                  </div>
                ))}
                {day.tasks.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-6">No deadlines</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const selectedDateKey = formatDateKey(currentDate);
    const dayTasks = filteredTasks.filter((t) => t.due_date === selectedDateKey);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {currentDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} scheduled for deadline
            </p>
          </div>
          {selectedDateKey === todayKey && (
            <span className="px-2.5 py-1 bg-brand-50 text-brand-700 font-semibold text-xs rounded-full border border-brand-200">
              Today
            </span>
          )}
        </div>

        {dayTasks.length > 0 ? (
          <div className="space-y-3">
            {dayTasks.map((task) => (
              <div
                key={`day-${task.id}`}
                onClick={() => onOpenTaskDetails && onOpenTaskDetails(task.id)}
                className="p-4 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        task.priority === 'urgent'
                          ? 'bg-red-600 text-white'
                          : task.priority === 'high'
                          ? 'bg-amber-500 text-white'
                          : task.priority === 'medium'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-200 text-zinc-900'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium capitalize">
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-zinc-900 hover:underline">
                    View Task →
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-600">No tasks due on this date</p>
            <p className="text-xs text-zinc-400 mt-0.5">Enjoy your day or plan ahead!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              Deadlines Calendar
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Track upcoming task commitments, deliverables, and milestone dates.
          </p>
        </div>

        {/* View Switcher: Month, Week, Day */}
        <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 p-1 rounded-xl self-start sm:self-auto">
          {['month', 'week', 'day'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            Today
          </button>
          <h2 className="text-base font-bold text-slate-900 ml-2">
            {monthNames[month]} {year}
          </h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="to_do">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Done</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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

      {/* Main View Area */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400">Loading deadline calendar...</div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}
    </div>
  );
}
