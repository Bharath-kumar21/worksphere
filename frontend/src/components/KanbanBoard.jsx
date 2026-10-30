import React, { useState } from 'react';
import {
  MessageSquare,
  Paperclip,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';

const COLUMNS = [
  { id: 'to_do', title: 'To Do', colorDot: 'bg-zinc-500', countBg: 'bg-zinc-200 text-zinc-900 border border-zinc-300' },
  { id: 'in_progress', title: 'In Progress', colorDot: 'bg-blue-600', countBg: 'bg-blue-600 text-white' },
  { id: 'review', title: 'Review', colorDot: 'bg-amber-500', countBg: 'bg-amber-500 text-white' },
  { id: 'completed', title: 'Completed', colorDot: 'bg-emerald-600', countBg: 'bg-emerald-600 text-white' },
];

export default function KanbanBoard({ tasks, onTaskClick, onStatusChange, onNewTaskInStatus }) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded">Urgent</span>;
      case 'high':
        return <span className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded">High</span>;
      case 'medium':
        return <span className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded">Medium</span>;
      default:
        return <span className="bg-zinc-200 text-zinc-800 text-[10px] font-semibold px-2 py-0.5 rounded">Low</span>;
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(parseInt(taskId), columnId);
    }
    setDraggedTaskId(null);
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-6">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="bg-zinc-100 rounded-2xl p-3.5 border border-zinc-200 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.colorDot}`} />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-heading">{col.title}</h4>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.countBg}`}>
                  {colTasks.length}
                </span>
              </div>
              {onNewTaskInStatus && (
                <button
                  onClick={() => onNewTaskInStatus(col.id)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  title={`Add task in ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Task Cards Column */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {colTasks.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                  Drop tasks here
                </div>
              ) : (
                colTasks.map((task) => {
                  const overdue = isOverdue(task.due_date, task.status);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onTaskClick(task.id)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-400 cursor-grab active:cursor-grabbing transition-all space-y-2.5"
                    >
                      {/* Project Tag & Priority */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[140px]">
                          {task.project_name || 'Project'}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Title */}
                      <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {task.title}
                      </h5>

                      {/* Description preview */}
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Footer: Due date, counts, and assignee */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-400">
                          {task.due_date && (
                            <span
                              className={`flex items-center gap-1 text-[10px] font-medium ${
                                overdue ? 'text-red-600 font-bold' : 'text-slate-500'
                              }`}
                              title={overdue ? 'Overdue deadline!' : 'Due date'}
                            >
                              <Calendar className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}

                          {task.comment_count > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px]" title="Comments">
                              <MessageSquare className="w-3 h-3" />
                              {task.comment_count}
                            </span>
                          )}

                          {task.attachment_count > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px]" title="Attachments">
                              <Paperclip className="w-3 h-3" />
                              {task.attachment_count}
                            </span>
                          )}
                        </div>

                        {/* Assignee Avatar */}
                        <div>
                          {task.assignee ? (
                            task.assignee.avatar_url ? (
                              <img
                                src={task.assignee.avatar_url}
                                alt={task.assignee.name}
                                title={task.assignee.name}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <div
                                title={task.assignee.name}
                                className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center ring-1 ring-brand-300"
                              >
                                {task.assignee.name.charAt(0).toUpperCase()}
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
