<?php

namespace App\Console\Commands;

use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class VerifyImageUrls extends Command
{
    protected $signature = 'images:verify {--fix : Auto-fix URLs with wrong format}';
    protected $description = 'Verify product image URLs are accessible and fix malformed URLs';

    public function handle(): int
    {
        $images = ProductImage::all();
        $publicBase = rtrim(config('filesystems.disks.supabase.url'), '/');
        $broken = 0;
        $fixed = 0;

        foreach ($images as $image) {
            $url = $image->url;

            // Check if URL uses the S3 endpoint format instead of public format
            if (str_contains($url, '.storage.supabase.co/storage/v1/s3/')) {
                $this->warn("Malformed URL (S3 format): {$url}");
                $broken++;

                if ($this->option('fix')) {
                    preg_match('/\/s3\/[^\/]+\/(.+)$/', $url, $matches);
                    if (!empty($matches[1])) {
                        $newUrl = $publicBase . '/' . $matches[1];
                        $image->update(['url' => $newUrl]);
                        $this->info("  Fixed → {$newUrl}");
                        $fixed++;
                    }
                }
                continue;
            }

            // Check if URL is accessible (HEAD request, 2s timeout)
            if (str_starts_with($url, 'http')) {
                try {
                    $response = Http::timeout(2)->head($url);
                    if ($response->failed()) {
                        $this->warn("Unreachable ({$response->status()}): {$url}");
                        $broken++;
                    }
                } catch (\Exception $e) {
                    $this->warn("Unreachable (timeout): {$url}");
                    $broken++;
                }
            } else {
                $this->warn("Relative URL (not Supabase): {$url}");
                $broken++;

                if ($this->option('fix')) {
                    $newUrl = $publicBase . '/' . ltrim($url, '/');
                    $image->update(['url' => $newUrl]);
                    $this->info("  Fixed → {$newUrl}");
                    $fixed++;
                }
            }
        }

        $this->info("Total images: {$images->count()}, Broken: {$broken}, Fixed: {$fixed}");
        return Command::SUCCESS;
    }
}
