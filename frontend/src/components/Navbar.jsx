import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import NotificationDropdown from './NotificationDropdown';
import {
  Menu,
  Search,
  Building,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Briefcase,
  Users,
  Key,
  FolderKanban,
  CheckSquare,
  X,
  ExternalLink,
  UserPlus,
  UserCog
} from 'lucide-react';

export default function Navbar({ onToggleSidebar, onNavigate, onOpenNewTask, onOpenTaskDetails, onOpenNewUser }) {
  const { user, organization, logout, isManager, isAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search.query(searchQuery.trim());
        if (res.success) {
          setSearchResults(res.results);
          setSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'project_manager':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
            <Briefcase className="w-3 h-3" /> Project Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
            <Users className="w-3 h-3" /> Team Member
          </span>
        );
    }
  };

  const handleSelectTask = (taskId) => {
    setSearchDropdownOpen(false);
    setSearchQuery('');
    if (onOpenTaskDetails) {
      onOpenTaskDetails(taskId);
    } else if (onNavigate) {
      onNavigate(`/tasks?task=${taskId}`);
    }
  };

  const handleSelectProject = (projectId) => {
    setSearchDropdownOpen(false);
    setSearchQuery('');
    if (onNavigate) {
      onNavigate(`/projects/${projectId}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left section: Hamburger & Org Name */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {organization?.name ? organization.name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">
                {organization?.name || 'WorkSphere Workspace'}
              </span>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-medium">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Global Search */}
      <div ref={searchContainerRef} className="flex-1 max-w-md mx-4 relative hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setSearchDropdownOpen(true);
            }}
            placeholder="Search tasks, projects, or people..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setSearchDropdownOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {searchDropdownOpen && searchResults && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto z-50 p-2 divide-y divide-slate-100">
            {/* Tasks section */}
            {searchResults.tasks?.length > 0 && (
              <div className="py-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3 h-3 text-brand-600" />
                  <span>Tasks</span>
                </div>
                {searchResults.tasks.map((t) => (
                  <button
                    key={`search-t-${t.id}`}
                    onClick={() => handleSelectTask(t.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-brand-600 truncate">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Project: {t.project_name || 'General'}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize shrink-0">
                      {t.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Projects section */}
            {searchResults.projects?.length > 0 && (
              <div className="py-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderKanban className="w-3 h-3 text-indigo-600" />
                  <span>Projects</span>
                </div>
                {searchResults.projects.map((p) => (
                  <button
                    key={`search-p-${p.id}`}
                    onClick={() => handleSelectProject(p.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 truncate">
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-[10px] text-slate-400 truncate">{p.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded capitalize shrink-0">
                      {p.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* People section */}
            {searchResults.people?.length > 0 && (
              <div className="py-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-purple-600" />
                  <span>People</span>
                </div>
                {searchResults.people.map((u) => (
                  <div
                    key={`search-u-${u.id}`}
                    className="px-2.5 py-1.5 rounded-lg flex items-center gap-2.5"
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-semibold text-[10px] flex items-center justify-center shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.tasks?.length === 0 &&
              searchResults.projects?.length === 0 &&
              searchResults.people?.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching tasks, projects, or people found.
                </div>
              )}
          </div>
        )}
      </div>

      {/* Right section: Action button, Notifications, User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {isAdmin && onOpenNewUser && (
          <button
            onClick={onOpenNewUser}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            title="Invite or add user to organization"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add User</span>
          </button>
        )}

        {isManager && onOpenNewTask && (
          <button
            onClick={onOpenNewTask}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
          >
            <span>+ New Task</span>
          </button>
        )}

        {/* Notification Bell Dropdown */}
        <NotificationDropdown onNavigate={onNavigate} />

        {/* User Profile Menu Dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
              <div className="mt-1">{getRoleBadge(user?.role)}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5">{getRoleBadge(user?.role)}</div>
              </div>

              {/* Admin: Users & Employees */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate && onNavigate('/users');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 flex items-center gap-2 transition-colors border-b border-slate-100"
                >
                  <UserCog className="w-4 h-4 text-zinc-700" />
                  Users & Employees (Admin)
                </button>
              )}

              {/* View Profile */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate && onNavigate('/profile');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                View Profile
              </button>

              {/* Account Settings */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate && onNavigate('/profile');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <Building className="w-4 h-4 text-slate-400" />
                Account Settings
              </button>

              {/* Change Password */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate && onNavigate('/profile?tab=security');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <Key className="w-4 h-4 text-slate-400" />
                Change Password
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 mt-1 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
