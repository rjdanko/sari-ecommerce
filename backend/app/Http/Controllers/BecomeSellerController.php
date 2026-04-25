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

        $uploadedPaths = [];

        try {
            $store = DB::transaction(function () use ($request, $user, &$uploadedPaths) {
                // Guards inside transaction to prevent race conditions
                if ($user->hasRole(RoleEnum::BUSINESS->value) || $user->hasRole(RoleEnum::ADMIN->value)) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'Your account is already a seller account.'], 422)
                    );
                }

                if ($user->store()->lockForUpdate()->exists()) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'A store already exists for this account.'], 422)
                    );
                }

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
                    $path = $this->imageService->upload($request->file('logo'), 'stores');
                    $uploadedPaths[] = $path;
                    $data['logo_url'] = $path;
                }

                if ($request->hasFile('banner')) {
                    $path = $this->imageService->upload($request->file('banner'), 'stores');
                    $uploadedPaths[] = $path;
                    $data['banner_url'] = $path;
                }

                $store = Store::create($data);
                $user->syncRoles([RoleEnum::BUSINESS->value]);

                return $store;
            });
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            throw $e;
        } catch (\Throwable $e) {
            // Clean up any uploaded files if the transaction failed
            foreach ($uploadedPaths as $path) {
                try {
                    $this->imageService->delete($path);
                } catch (\Throwable) {
                    // best effort
                }
            }
            throw $e;
        }

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
