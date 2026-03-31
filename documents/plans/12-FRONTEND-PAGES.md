# Module 12: Frontend Pages & Components

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all frontend pages: Navbar, Homepage, Login, Register, and
the component library. Match the SARI design reference.

**Architecture:** Next.js App Router with route groups: `(auth)`, `(shop)`,
`(user)`, `(business)`, `(admin)`. Client components for interactive elements.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Lucide React icons

---

## 🔒 Security Context

- **Frontend role checks are for UI only.** The `hasRole()` function shows/hides
  UI elements (admin links, business dashboard). The BACKEND enforces actual permissions.
  A user could bypass frontend checks by calling the API directly — which is why
  every backend endpoint has middleware + policy checks.
- **No secrets in client code.** All API calls go through the Laravel backend which
  holds the real secrets.
- **XSS Prevention:** React auto-escapes rendered values. Do not use `dangerouslySetInnerHTML`
  with user-generated content.

---

## Files

- Create: `frontend/src/components/layout/Navbar.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/products/ProductCard.tsx`
- Create: `frontend/src/components/products/ProductGrid.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/register/page.tsx`

---

### Task 12.1: Navbar Component

- [ ] **Step 1: Create Navbar component**

Create file: `frontend/src/components/layout/Navbar.tsx`

Design reference: SARI logo (orange "S" icon + "SARI" text) on the left,
navigation links (Home, Men, Women, All Products) center, search bar center-right,
heart icon + cart icon + amber "Login" button on the right.

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Heart, ShoppingCart, Search, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-sari-500 font-bold text-2xl">S</span>
            <span className="font-bold text-xl tracking-tight text-gray-900">
              SARI
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-sari-600 transition">
              Home
            </Link>
            <Link href="/products?category=men" className="text-sm font-medium text-gray-700 hover:text-sari-600 transition">
              Men
            </Link>
            <Link href="/products?category=women" className="text-sm font-medium text-gray-700 hover:text-sari-600 transition">
              Women
            </Link>
            <Link href="/products" className="text-sm font-medium text-gray-700 hover:text-sari-600 transition">
              All Products
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={255}
              className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 transition"
            />
          </form>

          {/* Right section: icons + auth */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <Link href="/wishlist" className="text-gray-600 hover:text-sari-600 transition">
                  <Heart className="w-5 h-5" />
                </Link>
                <Link href="/cart" className="text-gray-600 hover:text-sari-600 transition relative">
                  <ShoppingCart className="w-5 h-5" />
                </Link>
              </>
            )}

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {user.first_name}
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Profile
                  </Link>
                  <Link href="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    My Orders
                  </Link>
                  {/* 🔒 UI-only role check — backend enforces actual access */}
                  {hasRole('business') && (
                    <Link href="/business/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Business Dashboard
                    </Link>
                  )}
                  {hasRole('admin') && (
                    <Link href="/admin/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-sari-500 hover:bg-sari-600 text-white text-sm font-medium px-5 py-2 rounded-full transition"
              >
                Login
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-600"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-3">
          <Link href="/" className="block text-sm font-medium text-gray-700">Home</Link>
          <Link href="/products?category=men" className="block text-sm font-medium text-gray-700">Men</Link>
          <Link href="/products?category=women" className="block text-sm font-medium text-gray-700">Women</Link>
          <Link href="/products" className="block text-sm font-medium text-gray-700">All Products</Link>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add Navbar component with search and responsive mobile menu"
```

---

### Task 12.2: Homepage

- [ ] **Step 1: Build Homepage with hero + category grid + recommendations**

File: `frontend/src/app/page.tsx`

```tsx
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-sari-400 via-sari-500 to-sari-600 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full mb-6">
                ✨ NEW COLLECTION
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
                Discover Your Perfect Style
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Explore the latest fashion trends with our AI-powered
                recommendations and smart comparison tools.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-3 rounded-full transition"
                >
                  Shop Now
                </Link>
                <Link
                  href="/products?ai=compare"
                  className="border-2 border-white text-white hover:bg-white hover:text-sari-600 font-medium px-8 py-3 rounded-full transition"
                >
                  Try AI Comparison
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Category */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['T-Shirts', 'Jeans', 'Dresses', 'Jackets'].map((cat) => (
              <Link
                key={cat}
                href={`/categories/${cat.toLowerCase()}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                <div className="absolute bottom-4 left-4 z-20">
                  <h3 className="text-white font-semibold text-lg">{cat}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recommended For You */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Recommended For You
          </h2>
          <p className="text-gray-500">
            Sign in to see personalized recommendations powered by AI.
          </p>
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add Homepage with hero, categories, and recommendation sections"
```

---

### Task 12.3: Login & Register Pages

- [ ] **Step 1: Build Login Page**

File: `frontend/src/app/(auth)/login/page.tsx`

> **🔒 SECURITY:**
> - CSRF cookie fetched before login attempt
> - Generic error messages prevent user enumeration
> - Input lengths are limited client-side (also enforced server-side)

```tsx
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
      // 🔒 Generic error — doesn't reveal if email exists
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <span className="text-sari-500 font-bold text-4xl">S</span>
            <span className="text-sari-500 font-bold text-2xl ml-1">SARI</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Login to your account</p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sari-500 hover:bg-sari-600 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-sari-600 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build Register Page**

File: `frontend/src/app/(auth)/register/page.tsx`

> **🔒 SECURITY:**
> - Role selector only allows 'user' or 'business' (matches backend validation)
> - Password confirmation required
> - All maxLength limits match backend validation rules

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user' as 'user' | 'business',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-sari-500 font-bold text-4xl">S</span>
            <span className="text-sari-500 font-bold text-2xl ml-1">SARI</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-500 text-sm mt-1">Join SARI today</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
            )}

            {/* 🔒 Role selector — only 'user' and 'business' allowed */}
            <div className="flex gap-3">
              {(['user', 'business'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => update('role', role)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    form.role === role
                      ? 'bg-sari-500 text-white border-sari-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-sari-300'
                  }`}
                >
                  {role === 'user' ? 'Shopper' : 'Business'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  required
                  maxLength={255}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  required
                  maxLength={255}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                maxLength={255}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(e) => update('password_confirmation', e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sari-500 hover:bg-sari-600 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-sari-600 font-medium hover:underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Login and Register pages with role selection"
```
