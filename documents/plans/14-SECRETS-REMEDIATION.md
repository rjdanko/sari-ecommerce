# Secrets Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revoke exposed keys and scrub backend/.env from git history to secure the repository.

**Architecture:** To securely resolve the exposed secrets in Git, we will untrack `.env`, add it to `.gitignore`, rewrite git history using `git filter-branch` to purge the secrets everywhere, and manually revoke the compromised credentials on third-party services.

**Tech Stack:** Git, Bash

---

### Task 1: Remove .env from Git Tracking

**Files:**
- Modify: `backend/.gitignore`

- [ ] **Step 1: Check .gitignore for .env**
Ensure that `.env` is explicitly listed in `backend/.gitignore`.

```bash
echo ".env" >> backend/.gitignore
```

- [ ] **Step 2: Remove .env from git cache**
Untrack the file without deleting it locally.

```bash
git rm --cached backend/.env
```

- [ ] **Step 3: Commit the removal**

```bash
git add backend/.gitignore
git commit -m "chore: stop tracking backend/.env"
```

### Task 2: Scrub Git History

**Files:**
- None

- [ ] **Step 1: Scrub .env using git filter-branch**
Use `git filter-branch` to purge `backend/.env` from all past commits to ensure it cannot be found in git history.

```bash
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch backend/.env' --prune-empty --tag-name-filter cat -- --all
```

- [ ] **Step 2: Push changes**
Force push the cleansed history to your remote repository.

```bash
git push origin --force --all
```

### Task 3: Revoke Exposed Credentials

**Files:**
- Modify: `backend/.env` (Local Workspace)

- [ ] **Step 1: Rotate Supabase Keys**
Log into the Supabase Dashboard, go to Project Settings -> API, and regenerate the JWT secret and anon/service role keys. Update your local `backend/.env`.

- [ ] **Step 2: Rotate PayMongo Keys**
Log into the PayMongo Dashboard, go to Developers -> API Keys, and roll the public / secret keys. Update your `backend/.env` with the new ones.

- [ ] **Step 3: Rotate Database Password**
Update the database password in Supabase and your local `backend/.env`.
