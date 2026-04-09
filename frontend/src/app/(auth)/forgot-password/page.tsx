'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import api, { getCsrfCookie } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await getCsrfCookie();
      await api.post('/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors?.email) {
        setError(Array.isArray(errors.email) ? errors.email[0] : errors.email);
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sari-200/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sari-100/40 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

        <div className="relative w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/Sari_Logo_Icon.png"
                alt="SARI"
                width={180}
                height={60}
                className="h-16 w-auto"
                priority
              />
            </Link>
            <h1 className="mt-6 font-display text-3xl text-gray-900">Forgot Password</h1>
            <p className="text-gray-500 text-sm mt-1.5">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-8">
            {success ? (
              <div className="text-center py-4 animate-fade-in">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="font-display text-xl text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-6">
                  We&apos;ve sent a password reset link to <span className="font-medium text-gray-700">{email}</span>. Check your inbox and follow the instructions.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3.5 border border-red-100 animate-fade-in">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400 transition-all duration-200 placeholder:text-gray-400"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Remember your password?{' '}
                  <Link href="/login" className="text-sari-600 font-medium hover:underline underline-offset-2">
                    Login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
