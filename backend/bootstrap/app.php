<?php

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
        ]);

        $middleware->statefulApi();

        // Exclude webhook routes from CSRF verification
        $middleware->validateCsrfTokens(except: [
            'api/webhooks/*',
        ]);
    })

    ->withProviders()

    ->booted(function () {
        // Rate limit: Auth endpoints (login/register) — 5 per minute per IP
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Rate limit: Public API — 60 per minute per IP
        RateLimiter::for('public-api', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // Rate limit: Search — 30 per minute per IP
        RateLimiter::for('search', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Rate limit: Authenticated API — 120 per minute per user
        RateLimiter::for('authenticated', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    })

    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
