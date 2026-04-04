'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      window.location.href = '/';
    } catch (err: any) {
      // Generic error — doesn't reveal if email exists
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sari-200/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sari-100/40 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

        <div className="relative w-full max-w-md animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sari-400 to-sari-600 text-white font-bold text-xl shadow-md">
                S
              </span>
              <span className="font-display text-2xl tracking-tight text-gray-900">SARI</span>
            </Link>
            <h1 className="mt-6 font-display text-3xl text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1.5">Login to your account</p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-8 space-y-5"
          >
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3.5 border border-red-100 animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400 transition-all duration-200 placeholder:text-gray-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-sari-600 font-medium hover:underline underline-offset-2">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
