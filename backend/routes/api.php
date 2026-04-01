<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\WishlistController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ========================================================================
// PUBLIC ROUTES — Rate limited, no auth required
// ========================================================================
Route::middleware('throttle:public-api')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);
    Route::get('/recommendations/popular', [RecommendationController::class, 'popular']);
});

// AUTH ROUTES — Strictest rate limit (5/min per IP)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', RegisterController::class);
    Route::post('/login', LoginController::class);
    Route::get('/auth/google/redirect', [\App\Http\Controllers\Auth\GoogleAuthController::class, 'redirect']);
    Route::get('/auth/google/callback', [\App\Http\Controllers\Auth\GoogleAuthController::class, 'callback']);
});

// SEARCH — Separate rate limit (30/min per IP)
Route::middleware('throttle:search')->group(function () {
    Route::get('/search', [SearchController::class, 'search']);
});

// PayMongo webhook — no auth, verified by signature in controller
Route::post('/webhooks/paymongo', [WebhookController::class, 'handlePaymongo']);

// ========================================================================
// AUTHENTICATED ROUTES — Requires valid session + rate limited
// ========================================================================
Route::middleware(['auth:sanctum', 'throttle:authenticated'])->group(function () {
    Route::post('/logout', LogoutController::class);
    Route::get('/user', fn (Request $request) => $request->user()->load('roles'));

    // Cart (Redis-backed)
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::put('/cart/{productId}', [CartController::class, 'update']);
    Route::delete('/cart/{productId}', [CartController::class, 'destroy']);
    Route::delete('/cart', [CartController::class, 'clear']);

    // Wishlist
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/{product}', [WishlistController::class, 'toggle']);

    // Checkout & Orders
    Route::post('/checkout', [CheckoutController::class, 'createSession']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);

    // Personalized recommendations
    Route::get('/recommendations/for-you', [RecommendationController::class, 'forUser']);
    Route::get('/recommendations/similar/{product}', [RecommendationController::class, 'similarTo']);

    // ====================================================================
    // BUSINESS ROUTES — Requires 'business' or 'admin' role
    // ====================================================================
    Route::middleware('role:business|admin')->prefix('business')->group(function () {
        Route::get('/products', [ProductController::class, 'myProducts']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::get('/orders', [OrderController::class, 'businessOrders']);
        Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });

    // ====================================================================
    // ADMIN ROUTES — Requires 'admin' role only
    // ====================================================================
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\Admin\DashboardController::class, 'index']);
        Route::apiResource('/users', App\Http\Controllers\Admin\UserController::class);
        Route::get('/inventory', [App\Http\Controllers\Admin\InventoryController::class, 'index']);
        Route::put('/inventory/{product}', [App\Http\Controllers\Admin\InventoryController::class, 'update']);
    });
});
