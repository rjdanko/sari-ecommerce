'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Users, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { User } from '@/types/user';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function getInitials(user: User): string {
  return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
}

function getRoleBadge(user: User) {
  const roleName = user.roles?.[0]?.name;
  switch (roleName) {
    case 'admin':
      return { label: 'Admin', className: 'bg-sari-50 text-sari-700' };
    case 'business':
      return { label: 'Business', className: 'bg-blue-50 text-blue-700' };
    default:
      return { label: 'Buyer', className: 'bg-amber-50 text-amber-700' };
  }
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-6 py-4">
          <div className="flex items-center gap-3 w-[220px]">
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          <div className="h-3.5 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
          <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-3.5 w-10 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = query ? { search: query } : undefined;
      const res = await api.get('/api/admin/users', { params });
      setUsers(res.data.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers('');
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(value);
    }, 300);
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-gray-900">
            Users Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor all registered users.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sari-50">
          <Users className="h-5 w-5 text-sari-600" strokeWidth={1.8} />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-sari-300 focus:ring-2 focus:ring-sari-100"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Table header */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
          <div className="flex items-center gap-6 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <span className="w-[220px]">User</span>
            <span className="w-[180px]">Email</span>
            <span className="w-[90px]">Role</span>
            <span className="w-[130px]">Phone</span>
            <span className="w-[120px]">Joined</span>
            <span className="w-[60px]">Actions</span>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <TableSkeleton />
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <Users className="h-7 w-7 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-900">No users found</p>
            <p className="mt-1 text-xs text-gray-400">
              {search
                ? 'Try adjusting your search query.'
                : 'No users have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((user) => {
              const role = getRoleBadge(user);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-6 px-6 py-3.5 transition-colors hover:bg-gray-50/50"
                >
                  {/* User (avatar + name) */}
                  <div className="flex w-[220px] items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sari-50 text-xs font-semibold text-sari-700">
                      {getInitials(user)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="truncate text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <span className="w-[180px] truncate text-sm text-gray-600">
                    {user.email}
                  </span>

                  {/* Role */}
                  <span className="w-[90px]">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        role.className
                      )}
                    >
                      {role.label}
                    </span>
                  </span>

                  {/* Phone */}
                  <span className="w-[130px] truncate text-sm text-gray-600">
                    {user.phone || '\u2014'}
                  </span>

                  {/* Joined */}
                  <span className="w-[120px] text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </span>

                  {/* Actions */}
                  <span className="w-[60px]">
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-sari-600 transition-colors hover:text-sari-700">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
