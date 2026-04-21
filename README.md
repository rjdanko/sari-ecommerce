# SARI E-Commerce

A full-stack e-commerce application built with **Laravel** (backend) and **Next.js** (frontend).

---

## Prerequisites

Install the following before starting:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| PHP | 8.2+ | https://www.php.net/downloads |
| Composer | Latest | https://getcomposer.org |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Git | Latest | https://git-scm.com |

---

## External Services Required

You will need accounts and credentials for these services. Ask a team member for the actual values.

| Service | Purpose | Where to get credentials |
|---|---|---|
| Supabase | Database (PostgreSQL) + File Storage | https://supabase.com → your project → Settings → API |
| PayMongo | Payment processing | https://dashboard.paymongo.com → Developers → API Keys |
| Recombee | Product recommendations | https://admin.recombee.com → your database → Settings |

---

## Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd sari-ecommerce
```

---

## Step 2 — Start Infrastructure Services

This starts Redis, RabbitMQ, and Typesense using Docker.

```bash
docker-compose up -d
```

Verify all containers are running:

```bash
docker-compose ps
```

You should see `redis`, `rabbitmq`, and `typesense` with a status of `Up`.

> You can access the RabbitMQ management UI at http://localhost:15672 (username: `guest`, password: `guest`)

---

## Step 3 — Backend Setup

### 3.1 Install PHP dependencies

```bash
cd backend
composer install
```

### 3.2 Create the environment file

```bash
cp .env.example .env
```

### 3.3 Fill in your credentials

Open `backend/.env` and fill in the following values. Ask a team member for the actual credentials.

```env
# Database (Supabase)
DB_HOST=your-project.supabase.co
DB_PASSWORD=your-supabase-password

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ACCESS_KEY=your-access-key
SUPABASE_SECRET_KEY=your-secret-key

# PayMongo (Payments)
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxx

# Recombee (Recommendations)
RECOMBEE_DATABASE_ID=your-db-id
RECOMBEE_PRIVATE_TOKEN=your-private-token

# Typesense (Search) — use the key from docker-compose.yml
TYPESENSE_API_KEY=957cabacb58ce316e7f46e14b638412ad111e802aa063f2764fb79900863338e
```

### 3.4 Generate the application key

```bash
php artisan key:generate
```

### 3.5 Run database migrations

```bash
php artisan migrate
```

### 3.6 Seed the database (optional)

```bash
php artisan db:seed
```

### 3.7 Index data in Typesense (search)

```bash
php artisan scout:import "App\Models\Product"
```

---

## Step 4 — Frontend Setup

Open a new terminal window.

### 4.1 Install Node.js dependencies

```bash
cd frontend
npm install
```

### 4.2 Create the environment file

Create a file called `.env.local` inside the `frontend/` folder:

```bash
# On Mac/Linux
cp /dev/null frontend/.env.local

# On Windows (in the frontend folder)
type nul > .env.local
```

### 4.3 Fill in the frontend environment variables

Open `frontend/.env.local` and add the following:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_TYPESENSE_HOST=localhost
NEXT_PUBLIC_TYPESENSE_PORT=8108
NEXT_PUBLIC_TYPESENSE_PROTOCOL=http
NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY=957cabacb58ce316e7f46e14b638412ad111e802aa063f2764fb79900863338e
```

---

## Step 5 — Run the Application

You will need **three terminal windows** running at the same time.

### Terminal 1 — Backend API server

```bash
cd backend
php artisan serve
```

The backend will be available at http://localhost:8000

### Terminal 2 — Queue worker

```bash
cd backend
php artisan queue:work
```

This processes background jobs (emails, order processing, etc.)

### Terminal 3 — Frontend dev server

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:3000

---

## Verifying Everything Works

Open your browser and go to:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api
- **RabbitMQ Dashboard:** http://localhost:15672 (guest / guest)

---

## Common Issues

**`php artisan migrate` fails**
- Double-check your `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `backend/.env`
- Make sure your Supabase project is active and not paused

**Docker containers won't start**
- Make sure Docker Desktop is running before running `docker-compose up -d`
- If a port is already in use, stop the conflicting process or change the port in `docker-compose.yml`

**Frontend can't connect to the backend**
- Make sure `php artisan serve` is running in a separate terminal
- Make sure `NEXT_PUBLIC_API_URL=http://localhost:8000` is set in `frontend/.env.local`

**Search returns no results**
- Make sure Typesense is running (`docker-compose ps`)
- Re-run `php artisan scout:import "App\Models\Product"` in the backend folder

---

## Stopping the Project

To stop all running services:

1. Press `Ctrl+C` in each terminal running `php artisan serve`, `php artisan queue:work`, and `npm run dev`
2. Stop Docker containers:

```bash
docker-compose down
```
