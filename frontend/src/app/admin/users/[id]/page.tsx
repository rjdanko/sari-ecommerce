'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_suspended: boolean;
  created_at: string;
  roles: { name: string }[];
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-700" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 rounded-xl py-2 text-sm font-medium text-white ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: adminUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('');
  const [modal, setModal] = useState<'suspend' | 'unsuspend' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/admin/users/${id}`)
      .then(r => {
        setUser(r.data);
        setRole(r.data.roles?.[0]?.name ?? 'user');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const isSelf = adminUser?.id === user?.id;

  const saveRole = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/api/admin/users/${user.id}`, { role });
      setUser(data);
      setRole(data.roles?.[0]?.name ?? 'user');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const doSuspend = async () => {
    if (!user) return;
    setModal(null);
    setSaving(true);
    try {
      await api.post(`/api/admin/users/${user.id}/suspend`);
      setUser(u => u ? { ...u, is_suspended: true } : u);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? 'Failed to suspend');
    } finally {
      setSaving(false);
    }
  };

  const doUnsuspend = async () => {
    if (!user) return;
    setModal(null);
    setSaving(true);
    try {
      await api.post(`/api/admin/users/${user.id}/unsuspend`);
      setUser(u => u ? { ...u, is_suspended: false } : u);
    } catch {
      setError('Failed to unsuspend');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-700" />
      </div>
    );
  }

  if (!user) {
    return <div className="p-6 text-sm text-gray-500">User not found.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${user.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {user.is_suspended ? 'Suspended' : 'Active'}
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Profile info */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">First name</dt>
            <dd className="font-medium text-gray-900">{user.first_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Last name</dt>
            <dd className="font-medium text-gray-900">{user.last_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd className="font-medium text-gray-900">{user.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Joined</dt>
            <dd className="font-medium text-gray-900">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {/* Role editor */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Role</h2>
        <div className="flex items-center gap-3">
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            disabled={isSelf}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
          >
            <option value="user">User</option>
            <option value="business">Business</option>
          </select>
          <button
            onClick={saveRole}
            disabled={saving || isSelf || role === (user.roles?.[0]?.name ?? 'user')}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Role'}
          </button>
          {isSelf && <span className="text-xs text-gray-400">Cannot change own role</span>}
        </div>
      </div>

      {/* Suspend / Unsuspend */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Account Status</h2>
        {isSelf ? (
          <p className="text-sm text-gray-400">Cannot suspend your own account.</p>
        ) : user.is_suspended ? (
          <button
            onClick={() => setModal('unsuspend')}
            disabled={saving}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
          >
            Unsuspend Account
          </button>
        ) : (
          <button
            onClick={() => setModal('suspend')}
            disabled={saving}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40"
          >
            Suspend Account
          </button>
        )}
      </div>

      {modal === 'suspend' && (
        <ConfirmModal
          title="Suspend account?"
          message={`${user.first_name} ${user.last_name} will be logged out immediately and unable to log in again until unsuspended.`}
          confirmLabel="Suspend"
          confirmClass="bg-red-700 hover:bg-red-800"
          onConfirm={doSuspend}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'unsuspend' && (
        <ConfirmModal
          title="Unsuspend account?"
          message={`${user.first_name} ${user.last_name} will be able to log in again.`}
          confirmLabel="Unsuspend"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={doUnsuspend}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
