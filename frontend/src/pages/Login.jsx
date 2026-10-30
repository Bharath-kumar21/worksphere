import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Layers, ArrowRight, Lock, Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Standard Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await login(email, password);
      onNavigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 1: Forgot Password (Request Reset)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email.trim());
      if (res.success && res.reset_token) {
        setResetToken(res.reset_token);
        setView('reset');
        setSuccessMsg('Account verified! Please create your new password below.');
      } else {
        setError(res.message || 'Failed to initiate password reset.');
      }
    } catch (err) {
      setError(err.message || 'No active account found with this email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Set New Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: email.trim(),
        reset_token: resetToken,
        new_password: newPassword,
      });

      if (res.success) {
        setView('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setSuccessMsg('Password reset successfully! Please sign in with your new password.');
      } else {
        setError(res.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.message || 'Reset session expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white shadow-xs mb-3">
          {view === 'login' ? (
            <Layers className="w-6 h-6" />
          ) : (
            <KeyRound className="w-6 h-6" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight font-heading">
          {view === 'login' && 'Sign in to WorkSphere'}
          {view === 'forgot' && 'Reset your password'}
          {view === 'reset' && 'Create new password'}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {view === 'login' && 'Enter your account details to access your workspace'}
          {view === 'forgot' && 'Enter your registered email address to verify your account'}
          {view === 'reset' && `Setting a new password for ${email}`}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-zinc-200 py-8 px-6 sm:px-10 rounded-2xl shadow-xs">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: Standard Sign In */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* VIEW 2: Forgot Password Request */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <span>{loading ? 'Verifying Account...' : 'Continue to Reset'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className="w-full py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* VIEW 3: Create New Password */}
          {view === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <span>{loading ? 'Resetting Password...' : 'Reset & Save Password'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className="w-full py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* Footer Navigation */}
          {view === 'login' && (
            <div className="mt-6 text-center border-t border-zinc-200 pt-5">
              <p className="text-xs text-zinc-500">
                Need a new organization?{' '}
                <button
                  onClick={() => onNavigate('/register')}
                  className="font-semibold text-zinc-900 hover:underline"
                >
                  Register here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
