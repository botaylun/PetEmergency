<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicHour;
use App\Models\ClinicMember;
use App\Models\ClinicPhoto;
use App\Models\ClinicReport;
use App\Models\ClinicReview;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ClinicController — Manages Vet Map clinics
 *
 * Public:   GET /api/v1/clinics               - list approved clinics (with spatial filter)
 *           GET /api/v1/clinics/{id}           - clinic detail
 *           POST /api/v1/clinics/{id}/report   - report incorrect info
 *           POST /api/v1/clinics/{id}/reviews  - post a review
 *
 * Doctor:   GET  /api/v1/doctor/clinics        - list my clinics
 *           POST /api/v1/doctor/clinics        - create clinic (draft)
 *           PUT  /api/v1/doctor/clinics/{id}   - update clinic
 *           POST /api/v1/doctor/clinics/{id}/submit  - submit for review
 *           POST /api/v1/clinics/{id}/join-request   - join existing clinic
 *
 * Geocoding proxy:
 *           GET /api/v1/geo/search?q=          - address search (Nominatim proxy)
 *           GET /api/v1/geo/reverse?lat=&lng=  - reverse geocoding
 *
 * Admin:    GET  /api/v1/admin/clinics?status= - pending queue
 *           POST /api/v1/admin/clinics/{id}/approve
 *           POST /api/v1/admin/clinics/{id}/reject
 *           POST /api/v1/admin/clinics/{id}/suspend
 */
class ClinicController extends Controller
{
    // ────────────────────────────────────────────────────────────────────────
    // PUBLIC ENDPOINTS
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/clinics
     * List approved clinics with optional spatial filter and facets.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Clinic::where('status', 'approved');

        // Spatial filter by lat/lng + radius (km)
        $lat    = $request->input('lat');
        $lng    = $request->input('lng');
        $radius = (float) ($request->input('radius', 20));

        if ($lat && $lng) {
            $query->nearby((float)$lat, (float)$lng, $radius);
        }

        // Facet filters
        if ($request->boolean('open_now')) {
            $dayOfWeek   = (int) now()->format('w'); // 0=Sun
            $currentTime = now()->format('H:i:s');
            $query->whereHas('hours', function ($q) use ($dayOfWeek, $currentTime) {
                $q->where('day_of_week', $dayOfWeek)
                  ->where('is_closed', false)
                  ->where('open_time', '<=', $currentTime)
                  ->where('close_time', '>=', $currentTime);
            })->orWhere('is_24h', true);
        }

        if ($request->boolean('is_24h')) {
            $query->where('is_24h', true);
        }

        if ($request->boolean('emergency')) {
            $query->where('accepts_emergency', true);
        }

        if ($request->has('species')) {
            $species = $request->input('species');
            $query->whereJsonContains('species', $species);
        }

        if ($request->has('city') && $request->input('city') !== 'all') {
            $query->where('city', $request->input('city'));
        }

        // Sort
        $sort = $request->input('sort', 'distance');
        if ($sort === 'rating') {
            $query->orderByDesc('rating');
        } elseif (!($lat && $lng)) {
            $query->orderByDesc('rating');
        }
        // distance sort is applied by scopeNearby

        $clinics = $query->with(['hours', 'photos', 'members.user'])->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $clinics,
        ]);
    }

    /**
     * GET /api/v1/clinics/{id}
     */
    public function show(int $id): JsonResponse
    {
        $clinic = Clinic::where('status', 'approved')
            ->with(['hours', 'photos', 'reviews.user', 'members.user'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $clinic,
        ]);
    }

    /**
     * POST /api/v1/clinics/{id}/report
     */
    public function reportClinic(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập.'], 401);
        }

        $clinic = Clinic::where('status', 'approved')->findOrFail($id);

        $validated = $request->validate([
            'reason'  => 'required|string|max:200',
            'details' => 'nullable|string|max:1000',
        ]);

        ClinicReport::create([
            'clinic_id'   => $clinic->id,
            'reporter_id' => $userId,
            'reason'      => $validated['reason'],
            'details'     => $validated['details'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Đã gửi báo cáo. Cảm ơn bạn!']);
    }

    /**
     * POST /api/v1/clinics/{id}/reviews
     */
    public function addReview(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập.'], 401);
        }

        $clinic = Clinic::where('status', 'approved')->findOrFail($id);

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $existing = ClinicReview::where('clinic_id', $id)->where('user_id', $userId)->first();
        if ($existing) {
            $existing->update($validated);
        } else {
            ClinicReview::create([
                'clinic_id' => $id,
                'user_id'   => $userId,
                ...$validated,
            ]);
        }

        // Recalculate average rating
        $avg = ClinicReview::where('clinic_id', $id)->avg('rating');
        $cnt = ClinicReview::where('clinic_id', $id)->count();
        $clinic->update(['rating' => round($avg, 2), 'review_count' => $cnt]);

        return response()->json(['success' => true, 'message' => 'Đã gửi đánh giá!']);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DOCTOR ENDPOINTS
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/doctor/clinics
     */
    public function doctorIndex(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $user = User::find($userId);
        if (!$user || $user->role !== 'doctor') {
            return response()->json(['success' => false, 'message' => 'Chỉ dành cho bác sĩ.'], 403);
        }

        // Clinics I created or am a member of
        $memberClinicIds = ClinicMember::where('user_id', $userId)->where('status', 'active')->pluck('clinic_id');
        $ownedClinicIds  = Clinic::where('created_by', $userId)->pluck('id');
        $allIds = $memberClinicIds->merge($ownedClinicIds)->unique();

        $clinics = Clinic::whereIn('id', $allIds)
            ->with(['hours', 'photos', 'members.user'])
            ->get();

        return response()->json(['success' => true, 'data' => $clinics]);
    }

    /**
     * POST /api/v1/doctor/clinics
     * Create a new clinic in draft mode.
     */
    public function doctorStore(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $user = User::find($userId);
        if (!$user || $user->role !== 'doctor') {
            return response()->json(['success' => false, 'message' => 'Chỉ bác sĩ đã xác minh mới được tạo phòng khám.'], 403);
        }

        if ($user->verification_status !== 'verified') {
            return response()->json(['success' => false, 'message' => 'Tài khoản bác sĩ chưa được xác minh.'], 403);
        }

        $validated = $request->validate([
            'name'              => 'required|string|max:200',
            'type'              => 'nullable|string|in:hospital,clinic,pet_shop',
            'description'       => 'nullable|string|max:2000',
            'address'           => 'required|string|max:300',
            'city'              => 'nullable|string|max:100',
            'lat'               => 'required|numeric|between:-90,90',
            'lng'               => 'required|numeric|between:-180,180',
            'hotline'           => 'required|string|max:30',
            'zalo'              => 'nullable|string|max:30',
            'website'           => 'nullable|url|max:200',
            'facebook'          => 'nullable|url|max:200',
            'is_24h'            => 'boolean',
            'accepts_emergency' => 'boolean',
            'species'           => 'nullable|array',
            'services'          => 'nullable|array',
            'hours'             => 'nullable|array',
        ]);

        // Duplicate detection: same phone within 50 m
        $duplicateByPhone = Clinic::where('hotline', $validated['hotline'])
            ->whereNotIn('status', ['rejected', 'suspended'])
            ->first();

        $duplicateNearby = Clinic::nearby($validated['lat'], $validated['lng'], 0.05)
            ->whereNotIn('status', ['rejected', 'suspended'])
            ->where('name', 'LIKE', '%' . substr($validated['name'], 0, 5) . '%')
            ->first();

        if ($duplicateByPhone) {
            return response()->json([
                'success' => false,
                'message' => 'Phòng khám với số điện thoại này đã tồn tại.',
                'duplicate' => ['id' => $duplicateByPhone->id, 'name' => $duplicateByPhone->name],
            ], 422);
        }

        if ($duplicateNearby) {
            return response()->json([
                'success'   => false,
                'message'   => 'Phòng khám tương tự đã tồn tại trong bán kính 50 m. Bạn có muốn tham gia không?',
                'duplicate' => ['id' => $duplicateNearby->id, 'name' => $duplicateNearby->name],
            ], 422);
        }

        $clinic = Clinic::create([
            'name'              => $validated['name'],
            'type'              => $validated['type'] ?? 'clinic',
            'description'       => $validated['description'] ?? null,
            'address'           => $validated['address'],
            'city'              => $validated['city'] ?? null,
            'lat'               => $validated['lat'],
            'lng'               => $validated['lng'],
            'hotline'           => $validated['hotline'],
            'zalo'              => $validated['zalo'] ?? null,
            'website'           => $validated['website'] ?? null,
            'facebook'          => $validated['facebook'] ?? null,
            'is_24h'            => $validated['is_24h'] ?? false,
            'accepts_emergency' => $validated['accepts_emergency'] ?? true,
            'species'           => $validated['species'] ?? ['Chó', 'Mèo'],
            'services'          => $validated['services'] ?? [],
            'status'            => 'draft',
            'created_by'        => $userId,
        ]);

        // Create owner membership
        ClinicMember::create([
            'clinic_id' => $clinic->id,
            'user_id'   => $userId,
            'role'      => 'owner',
            'status'    => 'active',
        ]);

        // Save hours if provided
        if (!empty($validated['hours'])) {
            foreach ($validated['hours'] as $day => $h) {
                ClinicHour::create([
                    'clinic_id'  => $clinic->id,
                    'day_of_week' => (int) $day,
                    'open_time'   => $h['open_time'] ?? '08:00:00',
                    'close_time'  => $h['close_time'] ?? '20:00:00',
                    'is_closed'   => $h['is_closed'] ?? false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Phòng khám đã được tạo ở trạng thái nháp.',
            'data'    => $clinic->load(['hours', 'members']),
        ], 201);
    }

    /**
     * PUT /api/v1/doctor/clinics/{id}
     */
    public function doctorUpdate(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $clinic = Clinic::findOrFail($id);
        $member = ClinicMember::where('clinic_id', $id)->where('user_id', $userId)->first();

        if (!$member || $member->role !== 'owner') {
            return response()->json(['success' => false, 'message' => 'Chỉ chủ phòng khám mới có thể chỉnh sửa.'], 403);
        }

        $validated = $request->validate([
            'name'              => 'sometimes|string|max:200',
            'type'              => 'sometimes|string|in:hospital,clinic,pet_shop',
            'description'       => 'nullable|string|max:2000',
            'address'           => 'sometimes|string|max:300',
            'city'              => 'nullable|string|max:100',
            'lat'               => 'sometimes|numeric|between:-90,90',
            'lng'               => 'sometimes|numeric|between:-180,180',
            'hotline'           => 'sometimes|string|max:30',
            'zalo'              => 'nullable|string|max:30',
            'website'           => 'nullable|url|max:200',
            'facebook'          => 'nullable|url|max:200',
            'is_24h'            => 'boolean',
            'accepts_emergency' => 'boolean',
            'species'           => 'nullable|array',
            'services'          => 'nullable|array',
            'hours'             => 'nullable|array',
        ]);

        // Sensitive fields that require re-approval when already approved
        $sensitiveFields = ['name', 'hotline', 'lat', 'lng', 'address'];
        $hasSensitiveChange = array_intersect(array_keys($validated), $sensitiveFields);

        if ($clinic->status === 'approved' && !empty($hasSensitiveChange)) {
            // Store pending edits; keep live version intact
            $pendingEdits = array_intersect_key($validated, array_flip($sensitiveFields));
            $clinic->update(['pending_edits' => $pendingEdits]);

            // Update non-sensitive fields directly
            $safeFields = array_diff_key($validated, array_flip($sensitiveFields));
            if ($safeFields) {
                $clinic->update($safeFields);
            }

            return response()->json([
                'success' => true,
                'message' => 'Các thay đổi nhạy cảm đang chờ phê duyệt lại. Thông tin cũ vẫn hiển thị công khai.',
            ]);
        }

        $clinic->update($validated);

        // Update hours if provided
        if (!empty($validated['hours'])) {
            foreach ($validated['hours'] as $day => $h) {
                ClinicHour::updateOrCreate(
                    ['clinic_id' => $clinic->id, 'day_of_week' => (int)$day],
                    [
                        'open_time'  => $h['open_time'] ?? '08:00:00',
                        'close_time' => $h['close_time'] ?? '20:00:00',
                        'is_closed'  => $h['is_closed'] ?? false,
                    ]
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thành công.',
            'data'    => $clinic->fresh()->load(['hours', 'members']),
        ]);
    }

    /**
     * POST /api/v1/doctor/clinics/{id}/submit
     * Submit clinic for admin review.
     */
    public function doctorSubmit(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $clinic = Clinic::findOrFail($id);
        $member = ClinicMember::where('clinic_id', $id)->where('user_id', $userId)->first();

        if (!$member || $member->role !== 'owner') {
            return response()->json(['success' => false, 'message' => 'Chỉ chủ phòng khám mới có thể gửi duyệt.'], 403);
        }

        if (!in_array($clinic->status, ['draft', 'rejected'])) {
            return response()->json(['success' => false, 'message' => 'Phòng khám không ở trạng thái có thể gửi duyệt.'], 422);
        }

        $clinic->update(['status' => 'pending_review', 'reject_reason' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu duyệt. Admin sẽ phản hồi trong 1-2 ngày làm việc.',
            'data'    => $clinic->fresh(),
        ]);
    }

    /**
     * POST /api/v1/clinics/{id}/join-request
     * Doctor requests to join an existing clinic.
     */
    public function joinRequest(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $user = User::find($userId);
        if (!$user || $user->role !== 'doctor') {
            return response()->json(['success' => false, 'message' => 'Chỉ bác sĩ mới có thể tham gia phòng khám.'], 403);
        }

        $clinic = Clinic::findOrFail($id);
        $existing = ClinicMember::where('clinic_id', $id)->where('user_id', $userId)->first();

        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Bạn đã là thành viên hoặc đang chờ duyệt.'], 422);
        }

        ClinicMember::create([
            'clinic_id' => $id,
            'user_id'   => $userId,
            'role'      => 'member',
            'status'    => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu tham gia. Chủ phòng khám sẽ xem xét và phê duyệt.',
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GEOCODING PROXY (Nominatim, rate-limited with Cache)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/geo/search?q=&limit=
     */
    public function geoSearch(Request $request): JsonResponse
    {
        $q = $request->input('q', '');
        if (strlen(trim($q)) < 3) {
            return response()->json(['success' => true, 'results' => []]);
        }

        $cacheKey = 'geo_search_' . md5($q);
        $results = Cache::remember($cacheKey, 60, function () use ($q) {
            $response = Http::withHeaders([
                'User-Agent' => 'PetCareAI/1.0 (petcare-ai-24h; contact@petcare.vn)',
                'Accept-Language' => 'vi,en',
            ])->timeout(5)->get('https://nominatim.openstreetmap.org/search', [
                'q'               => $q . ', Vietnam',
                'format'          => 'json',
                'limit'           => 5,
                'countrycodes'    => 'vn',
                'addressdetails'  => 1,
            ]);

            if (!$response->successful()) {
                return [];
            }

            return collect($response->json())->map(function ($item) {
                return [
                    'display_name' => $item['display_name'] ?? '',
                    'lat'          => (float)($item['lat'] ?? 0),
                    'lng'          => (float)($item['lon'] ?? 0),
                    'type'         => $item['type'] ?? 'other',
                ];
            })->toArray();
        });

        return response()->json(['success' => true, 'results' => $results]);
    }

    /**
     * GET /api/v1/geo/reverse?lat=&lng=
     */
    public function geoReverse(Request $request): JsonResponse
    {
        $lat = $request->input('lat');
        $lng = $request->input('lng');

        if (!$lat || !$lng) {
            return response()->json(['success' => false, 'message' => 'Thiếu tọa độ.'], 422);
        }

        $cacheKey = 'geo_reverse_' . round((float)$lat, 4) . '_' . round((float)$lng, 4);
        $result = Cache::remember($cacheKey, 300, function () use ($lat, $lng) {
            $response = Http::withHeaders([
                'User-Agent' => 'PetCareAI/1.0 (petcare-ai-24h; contact@petcare.vn)',
            ])->timeout(5)->get('https://nominatim.openstreetmap.org/reverse', [
                'lat'    => $lat,
                'lon'    => $lng,
                'format' => 'json',
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();
            return [
                'display_name' => $data['display_name'] ?? '',
                'lat'          => (float)($data['lat'] ?? $lat),
                'lng'          => (float)($data['lon'] ?? $lng),
            ];
        });

        if (!$result) {
            return response()->json(['success' => false, 'message' => 'Không tìm được địa chỉ.'], 503);
        }

        return response()->json(['success' => true, 'result' => $result]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // ADMIN ENDPOINTS
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/admin/clinics?status=pending_review
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = User::find($userId);
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        $status = $request->input('status', 'pending_review');
        $clinics = Clinic::where('status', $status)
            ->with(['creator', 'members.user', 'photos', 'documents', 'hours'])
            ->orderByDesc('updated_at')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $clinics]);
    }

    /**
     * POST /api/v1/admin/clinics/{id}/approve
     */
    public function adminApprove(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = User::find($userId);
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        $clinic = Clinic::findOrFail($id);

        // If approving pending edits, apply them now
        if ($clinic->pending_edits) {
            $clinic->update(array_merge($clinic->pending_edits, ['pending_edits' => null]));
        }

        $clinic->update([
            'status'        => 'approved',
            'reject_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Phòng khám «{$clinic->name}» đã được duyệt và xuất hiện trên bản đồ.",
            'data'    => $clinic->fresh(),
        ]);
    }

    /**
     * POST /api/v1/admin/clinics/{id}/reject
     */
    public function adminReject(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = User::find($userId);
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $clinic = Clinic::findOrFail($id);
        $clinic->update([
            'status'        => 'rejected',
            'reject_reason' => $validated['reason'],
            'pending_edits' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Phòng khám «{$clinic->name}» đã bị từ chối.",
            'data'    => $clinic->fresh(),
        ]);
    }

    /**
     * POST /api/v1/admin/clinics/{id}/suspend
     */
    public function adminSuspend(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = User::find($userId);
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        $clinic = Clinic::findOrFail($id);
        $clinic->update(['status' => 'suspended']);

        return response()->json([
            'success' => true,
            'message' => "Phòng khám «{$clinic->name}» đã bị tạm đình chỉ.",
            'data'    => $clinic->fresh(),
        ]);
    }
}
