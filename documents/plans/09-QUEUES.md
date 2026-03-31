# Module 9: Queue Configuration (RabbitMQ)

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure RabbitMQ as the queue driver for background job processing
(payment webhooks, search indexing, recommendation syncing, image processing).

**Architecture:** Laravel's queue system connects to RabbitMQ via
`vladimir-yuldashev/laravel-queue-rabbitmq`. Jobs are dispatched from controllers
and processed by `php artisan queue:work rabbitmq`.

**Tech Stack:** RabbitMQ, Laravel Queue

---

## 🔒 Security Context

- **Queue Credentials:** `RABBITMQ_USER` and `RABBITMQ_PASSWORD` are backend-only.
  Change default credentials (`guest/guest`) in production.
- **Failed Jobs:** Failed jobs are stored in the database for debugging.
  Ensure failed job data doesn't contain sensitive info in logs.

---

## Files

- Modify: `backend/config/queue.php`

---

### Task 9.1: RabbitMQ Queue Setup

- [ ] **Step 1: Configure RabbitMQ in queue.php**

File: `backend/config/queue.php` — add to 'connections' array:

```php
'rabbitmq' => [
    'driver' => 'rabbitmq',
    'hosts' => [
        [
            'host' => env('RABBITMQ_HOST', '127.0.0.1'),
            'port' => env('RABBITMQ_PORT', 5672),
            'user' => env('RABBITMQ_USER', 'guest'),
            'password' => env('RABBITMQ_PASSWORD', 'guest'),
            'vhost' => env('RABBITMQ_VHOST', '/'),
        ],
    ],
    'queue' => env('RABBITMQ_QUEUE', 'default'),
    'options' => [
        'exchange' => [
            'name' => env('RABBITMQ_EXCHANGE_NAME', ''),
            'type' => env('RABBITMQ_EXCHANGE_TYPE', 'direct'),
        ],
    ],
    'after_commit' => false,
],
```

> **🔒 SECURITY NOTE:** In production, change `RABBITMQ_USER` and
> `RABBITMQ_PASSWORD` from the defaults. Use strong, unique credentials.
> The RabbitMQ management UI (port 15672) should be firewalled in production.

- [ ] **Step 2: Create the failed_jobs table**

```bash
php artisan make:queue-failed-table
php artisan migrate
```

- [ ] **Step 3: Test queue worker with RabbitMQ**

```bash
php artisan queue:work rabbitmq --tries=3
```
Expected: Worker starts and listens for jobs on the RabbitMQ default queue.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: configure RabbitMQ as queue driver"
```
