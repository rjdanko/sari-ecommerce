# Module 13: Integration Testing & Verification

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the entire system works end-to-end. Run automated tests,
verify all security measures are in place, and perform manual smoke tests.

**Architecture:** Laravel Feature Tests for backend, Next.js build verification
for frontend, curl commands for API smoke tests.

**Tech Stack:** PHPUnit, curl

---

## 🔒 Security Verification Checklist

This module verifies that ALL security measures from the plan are actually working:

| # | Security Check | Verified By |
|---|---------------|------------|
| 1 | Rate limiting on login/register | `RateLimitTest.php` |
| 2 | Rate limiting on search | Manual curl test |
| 3 | API keys not in frontend code | Grep check |
| 4 | SQL injection prevention | Code audit (all Eloquent) |
| 5 | IDOR on orders | `IDORTest.php` |
| 6 | IDOR on products | `IDORTest.php` |
| 7 | Admin route authorization | `AuthorizationTest.php` |
| 8 | Business route authorization | `AuthorizationTest.php` |
| 9 | Admin role self-assignment blocked | `AuthorizationTest.php` |
| 10 | Webhook signature verification | Manual PayMongo test |
| 11 | Input validation on all mutations | Form Request classes |
| 12 | CORS restricted to frontend origin | `config/cors.php` check |

---

## Files

- No new files — this module runs existing tests and verification commands.

---

### Task 13.1: Run Automated Tests

- [ ] **Step 1: Run all Laravel tests**

```bash
cd backend
php artisan test
```
Expected: All tests pass.

- [ ] **Step 2: Run security-specific tests**

```bash
php artisan test --filter=Security
```
Expected: All IDOR, authorization, and rate limit tests pass.

- [ ] **Step 3: Verify all migrations run cleanly from scratch**

```bash
php artisan migrate:fresh --seed
```
Expected: All tables created, roles/permissions seeded, admin user created.

- [ ] **Step 4: Commit test results**

```bash
git add .
git commit -m "test: verify all automated tests pass"
```

---

### Task 13.2: API Smoke Tests

- [ ] **Step 1: Test public endpoints**

```bash
# Product listing (should return 200 with paginated products)
curl -s http://localhost:8000/api/products | head -c 200

# Categories (should return 200 with category list)
curl -s http://localhost:8000/api/categories | head -c 200

# Search (should return 200)
curl -s "http://localhost:8000/api/search?q=shirt" | head -c 200
```

- [ ] **Step 2: Test auth flow**

```bash
# Register a test user
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test@test.com","password":"password123","password_confirmation":"password123","role":"user"}'
# Expected: 201 with user object

# Get CSRF cookie then login
curl -c cookies.txt http://localhost:8000/sanctum/csrf-cookie
curl -b cookies.txt -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Expected: 200 with user object
```

- [ ] **Step 3: Test rate limiting**

```bash
# Send 6 rapid login attempts (limit is 5/min)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
# Expected: First 5 return 401, 6th returns 429 (Too Many Requests)
```

- [ ] **Step 4: Test IDOR prevention**

```bash
# Try to access admin routes as regular user (should return 403)
curl -b cookies.txt -s -o /dev/null -w "%{http_code}" \
  http://localhost:8000/api/admin/dashboard
# Expected: 403 Forbidden

# Try to access another user's order (should return 403)
curl -b cookies.txt -s -o /dev/null -w "%{http_code}" \
  http://localhost:8000/api/orders/99999
# Expected: 403 or 404
```

- [ ] **Step 5: Test admin role self-assignment is blocked**

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Evil","last_name":"Hacker","email":"hacker@evil.com","password":"password123","password_confirmation":"password123","role":"admin"}'
# Expected: 422 Unprocessable Entity (validation error on role field)
```

---

### Task 13.3: Frontend Verification

- [ ] **Step 1: Verify Next.js builds successfully**

```bash
cd frontend
npm run build
```
Expected: Build completes with no errors.

- [ ] **Step 2: Verify no secrets in frontend code**

> **🔒 CRITICAL CHECK:** Ensure no backend secrets leaked into frontend code.

```bash
# Search for any secret key patterns in frontend source code
cd frontend
grep -r "sk_test" src/ || echo "✅ No PayMongo secret keys found"
grep -r "sk_live" src/ || echo "✅ No PayMongo live secret keys found"
grep -r "SUPABASE_SECRET" src/ || echo "✅ No Supabase secret keys found"
grep -r "RECOMBEE_PRIVATE" src/ || echo "✅ No Recombee private tokens found"
grep -r "TYPESENSE_API_KEY" src/ --include="*.ts" --include="*.tsx" || echo "✅ No Typesense admin keys found"
```
Expected: All checks show "✅ No ... found"

- [ ] **Step 3: Verify .env files are gitignored**

```bash
cd ..
git status --ignored | grep ".env"
```
Expected: `.env` and `.env.local` files shown as ignored.

---

### Task 13.4: Docker Services Verification

- [ ] **Step 1: Verify all Docker services are running**

```bash
docker-compose ps
```
Expected: redis, rabbitmq, typesense all showing "Up"

- [ ] **Step 2: Test RabbitMQ queue worker**

```bash
cd backend
php artisan queue:work rabbitmq --once
```
Expected: Worker processes one job (or waits for a job) without errors.

- [ ] **Step 3: Test Typesense search**

```bash
curl -s "http://localhost:8108/collections" \
  -H "X-TYPESENSE-API-KEY: your-typesense-admin-key"
```
Expected: Returns JSON array of collections (including `products` if imported).

---

### Task 13.5: Manual Verification Checklist

- [ ] **Step 1: Full user journey**

1. Open http://localhost:3000 — verify homepage renders with hero and categories
2. Navigate to /login — verify login form matches design reference
3. Register a new user with role "user" — verify success
4. Register a new user with role "business" — verify success
5. Login as `admin@sari.ph` / `password` — verify admin panel link appears
6. Test search bar — verify Typesense instant search works
7. Add item to cart — verify Redis cart persists across page loads
8. Proceed to checkout — verify PayMongo redirect (use test keys)
9. Complete test payment — verify webhook processes and order updates

- [ ] **Step 2: Document any issues found**

If any issues are found, create a follow-up task list before marking verification
as complete.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: complete integration testing and verification"
```

---

## 🎉 Implementation Complete

If all tests pass and manual verification succeeds, the SARI e-commerce platform
is ready for staging deployment. Key security measures verified:

✅ Rate limiting on all API endpoints
✅ API keys secured — no secrets in frontend code
✅ Authentication enforced on all internal endpoints
✅ Input validated on every mutation
✅ SQL injection prevented (all Eloquent ORM)
✅ IDOR prevented (Policies verify resource ownership)
✅ Authorization enforced on admin/business routes (backend middleware, not frontend)
✅ Webhook signature verification (PayMongo)
✅ CSRF protection via Sanctum
✅ CORS restricted to frontend origin
