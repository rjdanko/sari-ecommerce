<?php

namespace App\Http\Controllers;

use App\Enums\RoleEnum;
use App\Http\Requests\BecomeSellerRequest;
use App\Models\Store;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BecomeSellerController extends Controller
{
    public function __construct(private ImageService $imageService) {}

    public function __invoke(BecomeSellerRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole(RoleEnum::BUSINESS->value) || $user->hasRole(RoleEnum::ADMIN->value)) {
            return response()->json([
                'message' => 'Your account is already a seller account.',
            ], 422);
        }

        if ($user->store) {
            return response()->json([
                'message' => 'A store already exists for this account.',
            ], 422);
        }

        $store = DB::transaction(function () use ($request, $user) {
            $data = [
                'user_id'     => $user->id,
                'name'        => $request->name,
                'slug'        => Str::slug($request->name) . '-' . Str::random(5),
                'description' => $request->description,
                'address'     => $request->address,
                'phone'       => $request->phone,
                'latitude'    => $request->latitude,
                'longitude'   => $request->longitude,
            ];

            if ($request->hasFile('logo')) {
                $data['logo_url'] = $this->imageService->upload($request->file('logo'));
            }

            if ($request->hasFile('banner')) {
                $data['banner_url'] = $this->imageService->upload($request->file('banner'));
            }

            $store = Store::create($data);

            $user->syncRoles([RoleEnum::BUSINESS->value]);

            return $store;
        });

        Log::info('User converted to seller', [
            'user_id'  => $user->id,
            'store_id' => $store->id,
        ]);

        return response()->json([
            'message' => 'Welcome to SARI, seller!',
            'user'    => $user->fresh()->load('roles'),
            'store'   => $store,
        ], 201);
    }
}
