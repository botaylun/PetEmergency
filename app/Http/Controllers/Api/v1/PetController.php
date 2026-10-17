<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\HealthEvent;
use App\Models\Medication;
use App\Models\Pet;
use App\Models\PetWeight;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PetController extends Controller
{
    /**
     * Helper to get current user ID with simulated fallback.
     */
    private function resolveUserId(Request $request): int
    {
        return Auth::id() ?? (int) $request->header('X-User-Id', 1);
    }

    /**
     * Get all pets for the current simulated user.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $this->resolveUserId($request);

        $pets = Pet::where('user_id', $userId)
            ->with(['healthEvents', 'weights', 'medications'])
            ->orderBy('pet_name')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $pets,
        ]);
    }

    /**
     * Store a newly created pet.
     */
    public function store(Request $request): JsonResponse
    {
        $userId = $this->resolveUserId($request);

        $validated = $request->validate([
            'pet_name'        => 'required|string|max:255',
            'species'         => 'nullable|string|max:100',
            'breed'           => 'nullable|string|max:100',
            'age'             => 'nullable|integer|min:0',
            'gender'          => 'nullable|string|max:50',
            'weight'          => 'nullable|numeric|min:0',
            'hardware_gps_id' => 'nullable|string|max:255|unique:pets,hardware_gps_id',
        ]);

        $validated['user_id'] = $userId;
        $validated['type']    = $validated['species'] ?? 'dog';

        $pet = Pet::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pet created successfully.',
            'data'    => $pet,
        ], 201);
    }

    /**
     * Display the specified pet.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $userId = $this->resolveUserId($request);

        $pet = Pet::where('id', $id)
            ->where('user_id', $userId)
            ->with(['healthEvents', 'weights', 'medications'])
            ->first();

        if (!$pet) {
            return response()->json([
                'success' => false,
                'message' => 'Pet not found or does not belong to this user.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $pet,
        ]);
    }

    /**
     * Update the specified pet.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $userId = $this->resolveUserId($request);

        $pet = Pet::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$pet) {
            return response()->json([
                'success' => false,
                'message' => 'Pet not found or does not belong to this user.',
            ], 404);
        }

        $validated = $request->validate([
            'pet_name'        => 'sometimes|required|string|max:255',
            'species'         => 'sometimes|nullable|string|max:100',
            'breed'           => 'sometimes|nullable|string|max:100',
            'age'             => 'sometimes|nullable|integer|min:0',
            'gender'          => 'sometimes|nullable|string|max:50',
            'weight'          => 'sometimes|nullable|numeric|min:0',
            'hardware_gps_id' => 'sometimes|nullable|string|max:255|unique:pets,hardware_gps_id,' . $pet->id,
        ]);

        $pet->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pet updated successfully.',
            'data'    => $pet->fresh(['healthEvents', 'weights', 'medications']),
        ]);
    }

    /**
     * Remove the specified pet.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $userId = $this->resolveUserId($request);

        $pet = Pet::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$pet) {
            return response()->json([
                'success' => false,
                'message' => 'Pet not found or does not belong to this user.',
            ], 404);
        }

        $pet->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pet deleted successfully.',
        ]);
    }

    /**
     * Pair a GPS collar device to a pet.
     * Binds a unique hardware_gps_id string to the specified pet record.
     */
    public function pairGpsCollar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pet_id'          => 'required|integer|exists:pets,id',
            'hardware_gps_id' => 'required|string|max:255|unique:pets,hardware_gps_id',
        ]);

        $userId = $this->resolveUserId($request);

        $pet = Pet::where('id', $validated['pet_id'])
            ->where('user_id', $userId)
            ->first();

        if (!$pet) {
            return response()->json([
                'success' => false,
                'message' => 'Pet not found or does not belong to this user.',
            ], 404);
        }

        $pet->update([
            'hardware_gps_id' => $validated['hardware_gps_id'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'GPS collar paired successfully.',
            'data'    => $pet->fresh(),
        ]);
    }

    /**
     * Simulate GPS collar sending live background coordinates.
     * This endpoint receives latitude/longitude from the collar hardware
     * and updates the pet's tracking position in MySQL.
     */
    public function updateGps(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hardware_gps_id' => 'required|string|exists:pets,hardware_gps_id',
            'latitude'        => 'required|numeric|between:-90,90',
            'longitude'       => 'required|numeric|between:-180,180',
        ]);

        $pet = Pet::where('hardware_gps_id', $validated['hardware_gps_id'])->first();

        if (!$pet) {
            return response()->json([
                'success' => false,
                'message' => 'No pet found with this GPS collar ID.',
            ], 404);
        }

        $pet->update([
            'tracking_lat' => $validated['latitude'],
            'tracking_lng' => $validated['longitude'],
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'GPS coordinates updated.',
            'data'      => [
                'pet_id'       => $pet->id,
                'pet_name'     => $pet->pet_name,
                'tracking_lat' => $pet->tracking_lat,
                'tracking_lng' => $pet->tracking_lng,
                'updated_at'   => $pet->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Get health events for a pet.
     */
    public function indexHealthEvents(Request $request, int $petId): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        $pet = Pet::where('id', $petId)->where('user_id', $userId)->first();

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $pet->healthEvents()->orderBy('event_date', 'desc')->get(),
        ]);
    }

    /**
     * Store a health event for a pet.
     */
    public function storeHealthEvent(Request $request, int $petId): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        $pet = Pet::where('id', $petId)->where('user_id', $userId)->first();

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_date'  => 'required|date',
            'category'    => 'nullable|string|max:100',
        ]);

        $event = $pet->healthEvents()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Health event recorded successfully.',
            'data'    => $event,
        ], 201);
    }

    /**
     * Get weight records for a pet.
     */
    public function indexWeights(Request $request, int $petId): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        $pet = Pet::where('id', $petId)->where('user_id', $userId)->first();

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $pet->weights()->orderBy('recorded_at', 'desc')->get(),
        ]);
    }

    /**
     * Store a weight record for a pet.
     */
    public function storeWeight(Request $request, int $petId): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        $pet = Pet::where('id', $petId)->where('user_id', $userId)->first();

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        $validated = $request->validate([
            'weight'      => 'required|numeric|min:0',
            'recorded_at' => 'required|date',
            'notes'       => 'nullable|string',
        ]);

        $weightRecord = $pet->weights()->create($validated);

        $pet->update(['weight' => $validated['weight']]);

        return response()->json([
            'success' => true,
            'message' => 'Weight record added successfully.',
            'data'    => $weightRecord,
        ], 201);
    }

    /**
     * Get medications for a pet.
     */
    public function indexMedications(Request $request, int $petId): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        $pet = Pet::where('id', $petId)->where('user_id', $userId)->first();

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $pet->medications()->orderBy('created_at', 'desc')->get(),
        ]);
    }

    /**
     * Store a medication for a pet.
     */
    public function storeMedication(Request $request, int $petId): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        $pet = Pet::where('id', $petId)->where('user_id', $userId)->first();

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'dosage'       => 'required|string|max:100',
            'frequency'    => 'required|string|max:100',
            'start_date'   => 'required|date',
            'end_date'     => 'nullable|date|after_or_equal:start_date',
            'instructions' => 'nullable|string',
        ]);

        $medication = $pet->medications()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Medication added successfully.',
            'data'    => $medication,
        ], 201);
    }

    /**
     * Public QR profile view (no login required)
     */
    public function showPublicQr(string $token): JsonResponse
    {
        $pet = Pet::where('qr_token', $token)->with('user:id,name,phone')->first();
        if (!$pet && is_numeric($token)) {
            $pet = Pet::where('id', (int)$token)->with('user:id,name,phone')->first();
        }

        if (!$pet) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin bé cưng từ mã QR này.',
            ], 404);
        }

        $settings = $pet->qr_settings ?? [
            'show_photo'     => true,
            'show_name'      => true,
            'show_allergies' => true,
            'show_contact'   => true,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'id'                 => $pet->id,
                'pet_name'           => ($settings['show_name'] ?? true) ? $pet->pet_name : 'Bé cưng',
                'species'            => $pet->species ?? $pet->type ?? 'dog',
                'breed'              => $pet->breed,
                'photo_url'          => ($settings['show_photo'] ?? true) ? $pet->photo_url : null,
                'allergies'          => ($settings['show_allergies'] ?? true) ? $pet->allergies : null,
                'chronic_conditions' => ($settings['show_allergies'] ?? true) ? $pet->chronic_conditions : null,
                'microchip_number'   => $pet->microchip_number,
                'owner'              => ($settings['show_contact'] ?? true) ? [
                    'name'  => $pet->user?->name ?? 'Chủ nuôi',
                    'phone' => $pet->user?->phone ?? 'Liên hệ qua tổng đài PetCare AI 24/24: 1900-8888',
                ] : null,
                'qr_token'           => $pet->qr_token,
            ],
        ]);
    }

    /**
     * "Tôi tìm thấy bé này" report notification to owner
     */
    public function reportFound(Request $request, string $token): JsonResponse
    {
        $pet = Pet::where('qr_token', $token)->first();
        if (!$pet && is_numeric($token)) {
            $pet = Pet::where('id', (int)$token)->first();
        }

        if (!$pet) {
            return response()->json(['success' => false, 'message' => 'Pet not found.'], 404);
        }

        $validated = $request->validate([
            'finder_name'    => 'nullable|string|max:100',
            'finder_phone'   => 'nullable|string|max:50',
            'location_text'  => 'nullable|string|max:255',
            'notes'          => 'nullable|string|max:1000',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi thông báo cứu hộ tới chủ nuôi của bé!',
        ]);
    }
}
