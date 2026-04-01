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
        $filename = $directory . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        Storage::disk($this->disk)->put($filename, file_get_contents($file));

        return Storage::disk($this->disk)->url($filename);
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
