# Image Storage Full Fix — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Target plan:** Module 35 (new Task 3)

---

## Problem Statement

Product images are not loading. The root cause is a three-layer failure:

| Layer | Problem | Symptom |
|-------|---------|---------|
| Bucket visibility | `product-images` bucket was set to **Private** | Public CDN URL returns `{"error":"Bucket not found"}` |
| S3 credentials | `.env` had a Personal Access Token (`sbp_…`) instead of an S3 Access Key | Every upload threw `InvalidAccessKeyId` and failed |
| DB integrity | `product_images` rows exist but point to files that were never uploaded | Dead links — bucket is empty |

All three must be fixed in sequence. Fixing visibility alone does nothing if the bucket is empty. Fixing credentials alone enables future uploads but leaves existing records broken.

---

## Approved Design: Option A

### Fix 1 — Bucket Visibility (manual, already done)

Toggle **"Public bucket" ON** in Supabase Dashboard → Storage → `product-images` → Edit.

**Already completed by the user.** No code change needed.

### Fix 2 — S3 Credentials (already in plan 35 Task 1)

Replace `SUPABASE_ACCESS_KEY` (currently a PAT: `sbp_…`) and `SUPABASE_SECRET_KEY` in `backend/.env` with real S3 access keys from Supabase Dashboard → Storage → S3 Access Keys.

Run `php artisan config:clear` after updating.

**Already documented in plan 35 Task 1.** No new task needed — but this must be executed before re-uploading any images.

### Fix 3 — Prune Dead DB Rows (new Artisan command)

Create `php artisan images:prune-dead`:
- Fetches every row from `product_images`
- Fires a HEAD request to each stored URL
- Deletes rows where the response is not HTTP 200
- Outputs a summary: how many checked, how many deleted

After pruning, affected product cards fall back to the placeholder SVG (already implemented in the frontend). Images are then re-uploaded per product via the existing admin UI upload flow.

---

## What Is Out of Scope

- Bulk re-upload script (original files not available on disk in a structured way)
- Signed URLs (unnecessary complexity for public product images)
- Migrating to a different storage provider

---

## Success Criteria

1. `php artisan images:prune-dead` runs without error and reports deleted row count
2. After running the command, no `product_images` rows remain with dead URLs
3. After fixing S3 credentials and re-uploading an image via the admin UI, the image is visible in the browser from the public CDN URL
4. Product cards show the placeholder SVG for products with no images (not a broken image icon)
