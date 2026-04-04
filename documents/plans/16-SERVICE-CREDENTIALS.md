# Service Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correctly configure environment variables and connections for Typesense to replace placeholders.

**Architecture:** We will obtain real API credentials for the Typesense development instance and update local `.env` variables to enable robust AI-powered search features.

**Tech Stack:** Typesense, Laravel, Bash

---

### Task 1: Configure Typesense Credentials

**Files:**
- Modify: `backend/.env`
- Modify: `frontend/.env.local`

- [ ] **Step 1: Obtain and Update Typesense Admin Key**
Register for Typesense Cloud or spin up a local instance to get an actual Admin API Key. In `backend/.env`, replace `your-typesense-admin-key` with the real key.

```bash
# Verify it has been changed
cat backend/.env | grep TYPESENSE_API_KEY
```

- [ ] **Step 2: Update Search-Only Key in Frontend**
In `frontend/.env.local`, verify or create a Search-only Public API Key so the frontend can query Typesense directly without exposing the Admin key.

- [ ] **Step 3: Clear Application Cache**
Clear the application config cache in the Laravel backend to ensure it picks up the latest environment variables and instantiates the clients correctly.

```bash
cd backend
php artisan config:clear
```
