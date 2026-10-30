import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  FolderKanban,
  ExternalLink,
  Filter
} from 'lucide-react';

export default function NotificationsPage({ onNavigate, onOpenTaskDetails }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  const loadNotifications = async () => {
    try {
      const res = await api.notifications.list();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.notifications.markRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.notifications.markAllRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      await handleMarkRead(n.id);
    }
    if (n.link) {
      // Check if link contains task ID parameter, e.g. /projects/1?task=2
      const match = n.link.match(/task=(\d+)/);
      if (match && onOpenTaskDetails) {
        onOpenTaskDetails(parseInt(match[1]));
      } else if (onNavigate) {
        onNavigate(n.link);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredList = notifications.filter((n) => (filter === 'unread' ? !n.is_read : true));

  const getNotifIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <CheckCircle2 className="w-4 h-4 text-brand-600" />;
      case 'new_comment':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'status_changed':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              Notifications
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Stay updated with task assignments, team comments, status updates, and deadlines.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-zinc-900" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === 'unread'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filter === 'unread' ? 'bg-white text-zinc-900 font-bold' : 'bg-rose-600 text-white font-bold'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-24 text-center text-xs text-zinc-400">Loading notifications...</div>
      ) : filteredList.length > 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100 overflow-hidden">
          {filteredList.map((n) => (
            <div
              key={`notif-${n.id}`}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                !n.is_read ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !n.is_read ? 'bg-white border border-zinc-200 shadow-xs' : 'bg-zinc-100'
                  }`}
                >
                  {getNotifIcon(n.notif_type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-zinc-900 truncate">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {n.created_at ? new Date(n.created_at).toLocaleString() : 'Recently'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.is_read && (
                  <button
                    onClick={(e) => handleMarkRead(n.id, e)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg text-xs"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {n.link && <ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">No notifications to show</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {filter === 'unread'
              ? 'You have caught up with all notifications!'
              : 'You will be notified when tasks or activities occur.'}
          </p>
        </div>
      )}
    </div>
  );
}
