# Module 1: Project Scaffolding & Infrastructure

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Laravel backend, Next.js frontend, and Docker services
so all subsequent modules have a working foundation.

**Architecture:** Monorepo with `backend/` (Laravel 12) and `frontend/` (Next.js 15).
Docker Compose provides Redis, RabbitMQ, and Typesense locally.

**Tech Stack:** Laravel 12, Next.js 15, Docker Compose, Redis, RabbitMQ, Typesense

---

## Files

- Create: `backend/` (via composer)
- Create: `frontend/` (via create-next-app)
- Create: `docker-compose.yml`
- Create: `backend/.env`
- Create: `frontend/.env.local`

---

### Task 1.1: Initialize Laravel Backend

- [ ] **Step 1: Create Laravel project**

Run from the `sari-ecommerce` root:
```bash
composer create-project laravel/laravel backend
```

- [ ] **Step 2: Install all backend dependencies**

```bash
cd backend
composer require laravel/sanctum
composer require spatie/laravel-permission
composer require vladimir-yuldashev/laravel-queue-rabbitmq
composer require laravel/scout
composer require typesense/laravel-scout-typesense-driver
composer require league/flysystem-aws-s3-v3 "^3.0"
composer require recombee/php-api-client
composer require predis/predis
```

- [ ] **Step 3: Install Breeze API scaffolding**

```bash
php artisan breeze:install api
```
This sets up Sanctum auth routes (login, register, logout, password reset),
CORS config, and the EnsureFrontendRequestsAreStateful middleware.

- [ ] **Step 4: Publish Spatie permission config and migration**

```bash
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
```

- [ ] **Step 5: Publish RabbitMQ config**

```bash
php artisan vendor:publish --provider="VladimirYuldashev\LaravelQueueRabbitMQ\LaravelQueueRabbitMQServiceProvider"
```

- [ ] **Step 6: Create .env from .env.example and set initial values**

```env
APP_NAME=SARI
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=pgsql
DB_HOST=your-project.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password

SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=rabbitmq

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null
REDIS_DB=0
REDIS_CACHE_DB=1

RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_QUEUE=default

SCOUT_DRIVER=typesense
TYPESENSE_API_KEY=your-typesense-admin-key
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http

PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxx

RECOMBEE_DATABASE_ID=your-db-id
RECOMBEE_PRIVATE_TOKEN=your-private-token
RECOMBEE_REGION=ap-se

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ACCESS_KEY=your-access-key
SUPABASE_SECRET_KEY=your-secret-key
SUPABASE_BUCKET_NAME=product-images
SUPABASE_REGION=ap-southeast-1
SUPABASE_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
```

> **🔒 SECURITY NOTE:** Verify `.env` is in `.gitignore`. Never commit secrets.
> The `.env.example` should contain placeholder values only (no real keys).

- [ ] **Step 7: Verify .gitignore includes .env**

Check `backend/.gitignore` contains `.env`. If not, add it:
```
.env
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold Laravel backend with all dependencies"
```

---

### Task 1.2: Initialize Next.js Frontend

- [ ] **Step 1: Create Next.js project**

Run from the `sari-ecommerce` root:
```bash
npx -y create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Install frontend dependencies**

```bash
cd frontend
npm install axios typesense instantsearch.js react-instantsearch
npm install @tanstack/react-query zustand
npm install react-icons lucide-react
npm install -D @types/node
```

- [ ] **Step 3: Create .env.local from example**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_TYPESENSE_HOST=localhost
NEXT_PUBLIC_TYPESENSE_PORT=8108
NEXT_PUBLIC_TYPESENSE_PROTOCOL=http
NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY=your-search-only-key
```

> **🔒 SECURITY NOTE — Secure API Keys in Client Code:**
> - Only `NEXT_PUBLIC_*` env vars are exposed to the browser. This is by design.
> - `NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY` MUST be a **search-only** key, NOT the admin key.
>   Generate it via Typesense API: `POST /keys` with `actions: ["documents:search"]`.
> - PayMongo public key (`pk_*`) is safe for frontend.
> - NEVER put `PAYMONGO_SECRET_KEY`, `TYPESENSE_API_KEY` (admin), `SUPABASE_SECRET_KEY`,
>   or `RECOMBEE_PRIVATE_TOKEN` in any `NEXT_PUBLIC_*` variable.

- [ ] **Step 4: Verify .gitignore includes .env.local**

Check `frontend/.gitignore` contains `.env.local`. If not, add it.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js frontend with dependencies"
```

---

### Task 1.3: Docker Compose for Local Services

- [ ] **Step 1: Create docker-compose.yml in project root**

Create file: `sari-ecommerce/docker-compose.yml`

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass "${REDIS_PASSWORD:-}"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  typesense:
    image: typesense/typesense:27.1
    ports:
      - "8108:8108"
    environment:
      TYPESENSE_API_KEY: your-typesense-admin-key
      TYPESENSE_DATA_DIR: /data
    volumes:
      - typesense_data:/data

volumes:
  redis_data:
  rabbitmq_data:
  typesense_data:
```

- [ ] **Step 2: Start services**

```bash
docker-compose up -d
```

- [ ] **Step 3: Verify all services are running**

```bash
docker-compose ps
```
Expected: redis, rabbitmq, typesense all showing "Up"

- [ ] **Step 4: Create Typesense search-only key for frontend**

> **🔒 SECURITY:** The Typesense admin key has full access. The frontend must
> use a search-only key to prevent unauthorized writes.

```bash
curl -X POST "http://localhost:8108/keys" \
  -H "X-TYPESENSE-API-KEY: your-typesense-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Search-only key for frontend",
    "actions": ["documents:search"],
    "collections": ["products"]
  }'
```

Copy the returned `value` (the search-only key) and put it in
`frontend/.env.local` as `NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose for Redis, RabbitMQ, Typesense"
```
