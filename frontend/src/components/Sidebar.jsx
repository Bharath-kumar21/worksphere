import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  CheckSquare,
  Users2,
  BarChart3,
  History,
  UserCog,
  Settings,
  X,
  Layers,
  Calendar,
  Bell,
  User,
  LogOut
} from 'lucide-react';

export default function Sidebar({ currentPath, onNavigate, isOpen, onClose }) {
  const { user, isAdmin, isManager, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    try {
      const res = await api.notifications.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.unread_count || 0);
      }
    } catch (e) {
      // quiet fail
    }
  };

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 15000);
    return () => clearInterval(timer);
  }, []);

  // Configure navigation items strictly based on role
  let navItems = [];

  if (user?.role === 'team_member') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
      { label: 'Projects', path: '/projects', icon: FolderKanban },
      {
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        badgeCount: unreadCount > 0 ? unreadCount : null
      },
      { label: 'Calendar', path: '/calendar', icon: Calendar },
      { label: 'My Profile', path: '/profile', icon: User },
    ];
  } else {
    // Admin & Project Manager items
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Projects', path: '/projects', icon: FolderKanban },
      { label: 'Kanban Board', path: '/kanban', icon: Kanban },
      { label: 'Tasks', path: '/tasks', icon: CheckSquare },
      { label: 'Teams', path: '/teams', icon: Users2 },
      { label: 'Calendar', path: '/calendar', icon: Calendar },
      {
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        badgeCount: unreadCount > 0 ? unreadCount : null
      },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Activity', path: '/activity', icon: History },
    ];

    if (isAdmin) {
      navItems.push({
        label: 'Users & Employees',
        path: '/users',
        icon: UserCog,
        badge: 'Admin',
      });
    }

    navItems.push({ label: 'My Profile', path: '/profile', icon: User });
  }

  const handleNavClick = (path) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-white text-slate-700 z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out border-r border-slate-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Brand Logo & Title */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
            <button
              onClick={() => handleNavClick('/dashboard')}
              className="flex items-center gap-2.5 text-left group"
              title="Return to Dashboard"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-xs group-hover:bg-black transition-colors">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-base text-zinc-900 font-heading tracking-tight block leading-tight">
                  WorkSphere
                </span>
                <span className="text-[11px] text-zinc-400 font-medium block leading-none">
                  Workspace
                </span>
              </div>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.path ||
                (item.path !== '/dashboard' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badgeCount && (
                      <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                        {item.badgeCount}
                      </span>
                    )}
                    {item.badge && (
                      <span className="text-[10px] font-medium bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-3.5 border-t border-zinc-200">
          <div className="p-2.5 bg-zinc-100 rounded-xl border border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 capitalize truncate">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
