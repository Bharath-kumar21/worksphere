import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Calendar,
  Clock,
  User,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Trash2,
  Download,
  Send,
  Upload,
  CheckCircle2,
  FolderKanban
} from 'lucide-react';

export default function TaskModal({ taskId, isOpen, onClose, onTaskUpdated, projects = [], users = [] }) {
  const { user, isManager, isAdmin } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('to_do');
  const [dueDate, setDueDate] = useState('');

  // Comments State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Active Tab: 'details', 'comments', 'attachments'
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    } else if (isOpen && !taskId) {
      // Creating a new task
      resetForm();
    }
  }, [isOpen, taskId]);

  const resetForm = () => {
    setTask(null);
    setTitle('');
    setDescription('');
    setProjectId(projects[0]?.id || '');
    setAssigneeId('');
    setPriority('medium');
    setStatus('to_do');
    setDueDate('');
    setComments([]);
    setAttachments([]);
    setActiveTab('details');
  };

  const loadTaskDetails = async () => {
    setLoading(true);
    try {
      const res = await api.tasks.get(taskId);
      if (res.success && res.task) {
        const t = res.task;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description || '');
        setProjectId(t.project_id);
        setAssigneeId(t.assignee_id || '');
        setPriority(t.priority);
        setStatus(t.status);
        setDueDate(t.due_date || '');
        setComments(t.comments || []);
        setAttachments(t.attachments || []);
      }
    } catch (e) {
      console.error('Failed to load task', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      let res;
      if (!isManager && taskId) {
        // Team member updates status
        res = await api.tasks.updateStatus(taskId, status);
      } else if (taskId) {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          project_id: projectId,
          assignee_id: assigneeId ? parseInt(assigneeId) : null,
          priority,
          status,
          due_date: dueDate || null,
        };
        res = await api.tasks.update(taskId, payload);
      } else {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          project_id: projectId,
          assignee_id: assigneeId ? parseInt(assigneeId) : null,
          priority,
          status,
          due_date: dueDate || null,
        };
        res = await api.tasks.create(payload);
      }

      if (res.success) {
        if (onTaskUpdated) onTaskUpdated(res.task);
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Error saving task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;

    setSubmittingComment(true);
    try {
      const res = await api.comments.create(taskId, newComment.trim());
      if (res.success) {
        setComments((prev) => [...prev, res.comment]);
        setNewComment('');
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    setUploadingFile(true);
    try {
      const res = await api.attachments.upload(taskId, file);
      if (res.success) {
        setAttachments((prev) => [res.attachment, ...prev]);
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      const res = await api.attachments.delete(attachmentId);
      if (res.success) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete attachment');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900"></span>
            <h3 className="text-base font-bold text-zinc-900 font-heading">
              {taskId ? 'Edit Task' : 'Create New Task'}
            </h3>
            {taskId && (
              <span className="text-xs text-zinc-400 font-mono">#{taskId}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation for existing task */}
        {taskId && (
          <div className="flex border-b border-slate-100 px-6 bg-white gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Task Details
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {comments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'attachments'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {attachments.length}
              </span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Loading task details...
            </div>
          ) : activeTab === 'details' ? (
            <form id="task-form" onSubmit={handleSave} className="space-y-4">
              {!isManager && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>
                    You are logged in as a <strong>Team Member</strong>. You can update this task's <strong>status</strong>, post comments, and attach deliverables. Task assignment, priority, and deadlines are managed by your <strong>Project Manager</strong>.
                  </span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isManager}
                  placeholder="e.g. Design responsive customer checkout flow"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  disabled={!isManager}
                  placeholder="Detailed criteria, links, or expectations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
              </div>

              {/* Grid 1: Project & Assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project *
                  </label>
                  <select
                    required
                    disabled={!isManager}
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignee {isManager ? '' : '(Assigned by Manager)'}
                  </label>
                  <select
                    disabled={!isManager}
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid 2: Priority, Status & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority {isManager ? '' : '(Set by Manager)'}
                  </label>
                  <select
                    disabled={!isManager}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Status * (Team Member Editable)
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border-2 border-brand-500 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold text-slate-900"
                  >
                    <option value="to_do">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date {isManager ? '' : '(Set by Manager)'}
                  </label>
                  <input
                    type="date"
                    disabled={!isManager}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </form>
          ) : activeTab === 'comments' ? (
            /* Comments Section */
            <div className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No comments yet. Start the conversation below!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.user?.name ? c.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">
                            {c.user?.name || 'User'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                          {c.comment}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Write a comment or ask for updates..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            /* Attachments Section */
            <div className="space-y-4">
              {/* File Upload Box */}
              <label className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-100 hover:bg-zinc-200">
                <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                <span className="text-xs font-medium text-zinc-700">
                  {uploadingFile ? 'Uploading file...' : 'Click to upload task attachment'}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Supported formats: PDF, PNG, JPG, DOCX, ZIP (Up to 16MB)
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>

              {/* Attachments List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {attachments.length === 0 ? (
                  <div className="py-6 text-center text-zinc-400 text-xs">
                    No files attached to this task.
                  </div>
                ) : (
                  attachments.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 bg-white border border-zinc-200 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-800 line-clamp-1">
                            {a.original_name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {formatFileSize(a.file_size)} • Uploaded by {a.user_name || 'Team member'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={api.attachments.getDownloadUrl(a.id)}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(a.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between">
          <div>
            {taskId && (
              <span className="text-[11px] text-zinc-400">
                Created {task?.created_at ? new Date(task.created_at).toLocaleDateString() : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            {activeTab === 'details' && (
              <button
                type="submit"
                form="task-form"
                disabled={saving}
                className="px-5 py-2 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Saving...' : taskId ? 'Save Changes' : 'Create Task'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
