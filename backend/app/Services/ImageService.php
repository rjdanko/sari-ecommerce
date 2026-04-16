<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageService
{
    private string $disk = 'supabase';

    /**
     * Upload an image file to Supabase Storage.
     *
     * File validation (MIME type, max size) is handled by the Form Request
     * class BEFORE this method is called. This method generates a UUID
     * filename to prevent path traversal attacks.
     */
    public function upload(UploadedFile $file, string $directory = 'products'): string
    {
        // UUID filename prevents path traversal and filename collisions
        $uuid = Str::uuid();
        $extension = $file->getClientOriginalExtension();

        $result = Storage::disk($this->disk)->putFileAs(
            $directory,
            $file,
            $uuid . '.' . $extension,
            ['visibility' => 'public']
        );

        if ($result === false) {
            throw new \RuntimeException('Failed to upload image to storage. Check Supabase S3 credentials and bucket configuration.');
        }

        // Construct the public URL explicitly using SUPABASE_PUBLIC_URL
        // instead of relying on the S3 driver's url() which may produce
        // an incorrect format for Supabase
        $publicUrl = rtrim(config('filesystems.disks.supabase.url'), '/');
        return $publicUrl . '/' . $directory . '/' . $uuid . '.' . $extension;
    }

    public function delete(string $path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }

    public function getPublicUrl(string $path): string
    {
        return Storage::disk($this->disk)->url($path);
    }
}
