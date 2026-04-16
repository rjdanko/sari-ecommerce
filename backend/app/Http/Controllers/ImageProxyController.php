<?php

namespace App\Http\Controllers;

use App\Models\ProductImage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ImageProxyController extends Controller
{
    /**
     * Proxy a product image through the backend.
     * Used as a fallback when Supabase CDN is unreachable from the client.
     *
     * Caches the image response for 1 hour to avoid hammering Supabase.
     */
    private const TTL = 86400; // 24 hours — product images are immutable

    public function show(int $imageId)
    {
        $image = ProductImage::findOrFail($imageId);
        $url = $image->url;

        if (!$url || !str_starts_with($url, 'http')) {
            abort(404);
        }

        $cacheKey = 'img_proxy:' . $imageId;
        $etag = '"' . md5($imageId . $url) . '"';

        // Return 304 if the browser already has a valid cached copy
        if (request()->header('If-None-Match') === $etag) {
            return response('', 304)
                ->header('ETag', $etag)
                ->header('Cache-Control', 'public, max-age=' . self::TTL);
        }

        $cached = Cache::get($cacheKey);
        if ($cached) {
            return response($cached['body'])
                ->header('Content-Type', $cached['content_type'])
                ->header('Cache-Control', 'public, max-age=' . self::TTL)
                ->header('ETag', $etag);
        }

        try {
            $response = Http::timeout(5)->get($url);

            if ($response->failed()) {
                abort(404);
            }

            $contentType = $response->header('Content-Type') ?? 'image/jpeg';
            $body = $response->body();

            Cache::put($cacheKey, [
                'body' => $body,
                'content_type' => $contentType,
            ], self::TTL);

            return response($body)
                ->header('Content-Type', $contentType)
                ->header('Cache-Control', 'public, max-age=' . self::TTL)
                ->header('ETag', $etag);
        } catch (\Exception $e) {
            abort(404);
        }
    }
}
