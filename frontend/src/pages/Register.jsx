import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, ArrowRight, Building, User, Mail, Lock } from 'lucide-react';

export default function Register({ onNavigate }) {
  const { register } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!orgName.trim() || !name.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      await register({
        organization_name: orgName.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'admin',
      });
      onNavigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white shadow-xs mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight font-heading">
          Create Organization
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Set up your team collaboration workspace in seconds
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-zinc-200 py-8 px-6 sm:px-10 rounded-2xl shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Organization Name *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Your Full Name (Admin Owner) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Admin Work Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <span>{loading ? 'Creating...' : 'Create Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center border-t border-zinc-200 pt-5">
            <p className="text-xs text-zinc-500">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('/login')}
                className="font-semibold text-zinc-900 hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
