# Navbar Loading State Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the navigation bar displays a correct loading skeleton instead of flashing the 'Login' button when checking authentication state.

**Architecture:** Update the `Navbar` component to read the `loading` state from the `useAuth` hook and conditionally render a UI skeleton pulse instead of dropping to the unauthenticated layout while verification is in-flight.

**Tech Stack:** React, Next.js, Tailwind CSS

---

### Task 1: Fix Navbar Authentication State Render

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx:9`
- Modify: `frontend/src/components/layout/Navbar.tsx:84-86`

- [ ] **Step 1: Update useAuth destructuring**

Extract the `loading` variable from the hook in `frontend/src/components/layout/Navbar.tsx`.

```tsx
// frontend/src/components/layout/Navbar.tsx (around line 9)
  const { user, loading, logout, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
```

- [ ] **Step 2: Add conditional rendering for the loading state**

Wrap the authentication block in `frontend/src/components/layout/Navbar.tsx` (around line 84) to return a pulsing skeleton loader when `loading` is true.

```tsx
// frontend/src/components/layout/Navbar.tsx (around line 84)
            {loading ? (
              <div className="w-20 h-9 bg-gray-100 animate-pulse rounded-full" />
            ) : user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors duration-200">
```

- [ ] **Step 3: Run the project to verify it visually passes**

Run: `npm run dev --prefix frontend` (or equivalent dev script)
Expected: Loading the home page displays a grey pulsing placeholder instead of a "Login" button for the first few milliseconds / seconds while the `/api/user` request resolves.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "fix(ui): prevent login button flash during initial auth check"
```
