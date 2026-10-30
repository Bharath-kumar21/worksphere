import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Users2, CheckCircle2 } from 'lucide-react';

export default function TeamModal({ team, isOpen, onClose, onTeamSaved, users = [] }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setSelectedUserIds(team.members ? team.members.map((m) => m.user_id) : []);
    } else {
      setName('');
      setDescription('');
      setSelectedUserIds([]);
    }
  }, [team, isOpen]);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        member_ids: selectedUserIds,
      };

      let res;
      if (team) {
        res = await api.teams.update(team.id, payload);
      } else {
        res = await api.teams.create(payload);
      }

      if (res.success) {
        if (onTeamSaved) onTeamSaved(res.team);
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Error saving team');
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
            <Users2 className="w-5 h-5 text-zinc-900" />
            <h3 className="text-base font-bold text-zinc-900 font-heading">
              {team ? 'Edit Team' : 'Create New Team'}
            </h3>
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
              Team Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Core Engineering, Product Design"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Team responsibilities or scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {!team && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Select Team Members ({selectedUserIds.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl p-2 divide-y divide-zinc-100 bg-zinc-50">
                {users.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-2 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUser(u.id)}
                        className="rounded text-zinc-900 focus:ring-zinc-900"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-zinc-800">{u.name}</p>
                        <p className="text-[10px] text-zinc-500">{u.email} • {u.role.replace('_', ' ')}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
              <span>{saving ? 'Saving...' : team ? 'Save Team' : 'Create Team'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
