import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings as SettingsIcon, Building, User, Lock, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { user, organization, refreshUser, isAdmin } = useAuth();

  // User Profile Form
  const [userName, setUserName] = useState(user?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userMsg, setUserMsg] = useState('');

  // Organization Form
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgMsg, setOrgMsg] = useState('');

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setUserMsg('');
    setSavingUser(true);
    try {
      const payload = { name: userName };
      if (newPassword) payload.password = newPassword;

      const res = await api.auth.updateProfile(payload);
      if (res.success) {
        setUserMsg('Profile updated successfully!');
        setNewPassword('');
        refreshUser();
      }
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSavingUser(false);
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    setOrgMsg('');
    setSavingOrg(true);
    try {
      const res = await api.organizations.updateCurrent({ name: orgName });
      if (res.success) {
        setOrgMsg('Organization settings saved!');
        refreshUser();
      }
    } catch (err) {
      alert(err.message || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials and organization settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Profile Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Personal Profile</h3>
          </div>

          {userMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{userMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                System Role
              </label>
              <input
                type="text"
                disabled
                value={user?.role?.replace('_', ' ').toUpperCase() || ''}
                className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 capitalize cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingUser}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              {savingUser ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Organization Settings (Admin only) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Organization Settings</h3>
          </div>

          {orgMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{orgMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateOrg} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 ${
                  isAdmin ? 'bg-slate-50 focus:ring-2 focus:ring-purple-500' : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
              />
              {!isAdmin && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Only Organization Admins can rename the organization workspace.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SaaS Subscription Plan
              </label>
              <input
                type="text"
                disabled
                value="Enterprise Tier (Active)"
                className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={savingOrg}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                {savingOrg ? 'Saving...' : 'Save Organization'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
