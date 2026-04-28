'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_suspended: boolean;
  created_at: string;
  roles: { name: string }[];
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

const roleBadge = (roles: { name: string }[]) => {
  const name = roles[0]?.name ?? 'user';
  const map: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    business: 'bg-violet-100 text-violet-700',
    user: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[name] ?? map.user}`}>
      {name}
    </span>
  );
};

export default function AdminUsersPage() {
  const [result, setResult] = useState<Paginated<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (search) params.search = search;
    if (role !== 'all') params.role = role;
    if (status !== 'all') params.status = status;
    api.get('/api/admin/users', { params })
      .then(r => setResult(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, role, status, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">{result?.total ?? 0} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
          />
        </div>
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="business">Business</option>
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sari-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Joined</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No users found.</td>
                </tr>
              ) : (
                result?.data.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">{roleBadge(u.roles)}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="rounded-lg bg-sari-50 px-3 py-1.5 text-xs font-medium text-sari-700 hover:bg-sari-100 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {result && result.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {result.current_page} of {result.last_page}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(result.last_page, p + 1))}
              disabled={page === result.last_page}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
