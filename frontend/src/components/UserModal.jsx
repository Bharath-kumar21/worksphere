import React, { useState } from 'react';
import { api } from '../services/api';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';

export default function UserModal({ isOpen, onClose, onUserCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome2026!');
  const [role, setRole] = useState('team_member');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      const res = await api.users.create(payload);
      if (res.success) {
        if (onUserCreated) onUserCreated(res.user);
        onClose();
        setName('');
        setEmail('');
        setPassword('Welcome2026!');
        setRole('team_member');
      }
    } catch (err) {
      alert(err.message || 'Error creating user');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-zinc-900" />
            <h3 className="text-base font-bold text-zinc-900 font-heading">Add Organization User</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Initial Password *
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              System Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            >
              <option value="team_member">Team Member (Works on assigned tasks)</option>
              <option value="project_manager">Project Manager (Creates projects & assigns tasks)</option>
              <option value="admin">Organization Admin (Full user & team administration)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Creating...' : 'Add User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
