<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Routing\RoutingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * EmergencyController — Xử lý luồng SOS khẩn cấp PetCare AI
 * ==========================================================
 *
 * Giai đoạn 1: Quét bác sĩ trực tuyến gần nhất (ST_Distance_Sphere / Haversine)
 *              → Đếm ngược điều phối Grab-style
 *              → Bác sĩ đầu tiên chấp nhận → Lock ca (Atomic DB Transaction)
 *
 * Giai đoạn 2: Song song → AI First-Aid RAG / Gemini Fallback
 *              → Trả về ngay 3-4 bước sơ cứu khẩn cấp cho chủ nuôi
 *
 * Giai đoạn 3: Theo dõi trạng thái ca cấp cứu (State Machine):
 *              finding -> accepted -> en_route -> arrived -> treating -> completed
 */
class EmergencyController extends Controller
{
    const DEFAULT_RADIUS_M = 15000; // 15km

    // ────────────────────────────────────────────────────────────────────────
    // 1. TẠO CA SOS MỚI (Chủ nuôi kích hoạt)
    // ────────────────────────────────────────────────────────────────────────

    public function createSos(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập để gửi SOS.'], 401);
        }

        $validated = $request->validate([
            'lat'            => 'required|numeric|between:-90,90',
            'lng'            => 'required|numeric|between:-180,180',
            'symptom_tags'   => 'required|array|min:1',
            'symptom_tags.*' => 'string|max:50',
            'notes'          => 'nullable|string|max:1000',
            'pet_photo'      => 'nullable|file|image|max:10240',
            'pet_id'         => 'nullable|integer',
            'pet_name'       => 'nullable|string|max:100',
            'pet_breed'      => 'nullable|string|max:100',
            'urgency_level'  => 'nullable|string|in:low,medium,high,critical',
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];

        // ── Upload ảnh thú cưng (nếu có) ─────────────────────────────────────
        $petPhotoUrl = null;
        if ($request->hasFile('pet_photo')) {
            $path = $request->file('pet_photo')->store('sos', 'public');
            $petPhotoUrl = Storage::disk('public')->url($path);
        }

        // ── Lưu Emergency Request ─────────────────────────────────────────────
        $emergencyId = DB::table('emergency_requests')->insertGetId([
            'user_id'       => $userId,
            'pet_id'        => $validated['pet_id'] ?? null,
            'pet_name'      => $validated['pet_name'] ?? null,
            'pet_breed'     => $validated['pet_breed'] ?? null,
            'sos_latitude'  => $lat,
            'sos_longitude' => $lng,
            'location'      => DB::raw("ST_GeomFromText('POINT({$lat} {$lng})', 4326)"),
            'symptom_tags'  => json_encode($validated['symptom_tags'], JSON_UNESCAPED_UNICODE),
            'notes'         => $validated['notes'] ?? null,
            'pet_photo_url' => $petPhotoUrl,
            'urgency_level' => $validated['urgency_level'] ?? 'critical',
            'status'        => 'finding',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // ── Giai đoạn 1 + 2 song song ────────────────────────────────────────
        $nearbyDoctors = $this->findNearbyDoctors($lat, $lng);
        $aiFirstAid    = $this->getAiFirstAid(
            $validated['symptom_tags'],
            $validated['notes'] ?? null,
            $petPhotoUrl
        );

        // ── Ping bác sĩ qua Socket.io (nếu có) ──────────────────────────────
        $this->pingDoctors($nearbyDoctors, $emergencyId, $userId, $lat, $lng, $validated['symptom_tags']);

        // ── Cache phác đồ sơ cứu vào bản ghi SOS ─────────────────────────────
        if ($aiFirstAid && !empty($aiFirstAid['steps'])) {
            DB::table('emergency_requests')
                ->where('id', $emergencyId)
                ->update(['ai_first_aid' => implode("\n", $aiFirstAid['steps'])]);
        }

        // ── Format thông tin bác sĩ lân cận ─────────────────────────────────
        $formattedDoctors = collect($nearbyDoctors)->map(function ($doc) {
            return [
                'user_id'      => $doc->user_id,
                'name'         => $doc->name,
                'specialty'    => $doc->specialty ?? 'Bác sĩ Thú y Tổng quát',
                'clinic_name'  => $doc->clinic_name ?? 'Phòng khám PetCare',
                'phone'        => $this->formatVietnamesePhone($doc->phone ?? ''),
                'distance_m'   => (int) ($doc->distance_m ?? 0),
                'distance_txt' => $this->formatDistance((int) ($doc->distance_m ?? 0)),
            ];
        })->values();

        return response()->json([
            'success'        => true,
            'emergency_id'   => $emergencyId,
            'nearby_doctors' => $formattedDoctors,
            'doctors_pinged' => count($nearbyDoctors),
            'ai_first_aid'   => $aiFirstAid,
            'status'         => 'finding',
        ], 201);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. DANH SÁCH CA SOS CHỜ NHẬN (Doctor Dashboard Feed)
    // ────────────────────────────────────────────────────────────────────────

    public function getPendingSos(Request $request): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        $docLat = 21.0285;
        $docLng = 105.8542;

        if ($doctorId) {
            $docPresence = DB::table('doctors_online')->where('user_id', $doctorId)->first();
            if ($docPresence && $docPresence->latitude) {
                $docLat = (float) $docPresence->latitude;
                $docLng = (float) $docPresence->longitude;
            } else {
                $docUser = User::find($doctorId);
                if ($docUser && $docUser->latitude) {
                    $docLat = (float) $docUser->latitude;
                    $docLng = (float) $docUser->longitude;
                }
            }
        }

        $requests = DB::table('emergency_requests as er')
            ->leftJoin('users as u', 'u.id', '=', 'er.user_id')
            ->leftJoin('pets as p', 'p.id', '=', 'er.pet_id')
            ->whereIn('er.status', ['finding', 'pending'])
            ->select([
                'er.id',
                'er.user_id',
                'er.pet_id',
                'er.pet_name',
                'er.pet_breed',
                'er.sos_latitude',
                'er.sos_longitude',
                'er.symptom_tags',
                'er.notes',
                'er.pet_photo_url',
                'er.ai_first_aid',
                'er.urgency_level',
                'er.status',
                'er.created_at',
                'u.name as user_name',
                'u.phone as user_phone',
                'u.avatar_url as user_avatar',
                'p.pet_name as registered_pet_name',
                'p.breed as registered_pet_breed',
            ])
            ->orderBy('er.created_at', 'desc')
            ->limit(30)
            ->get();

        $data = $requests->map(function ($req) use ($docLat, $docLng) {
            $lat = (float) ($req->sos_latitude ?? 21.028);
            $lng = (float) ($req->sos_longitude ?? 105.854);
            $distM = $this->calculateDistanceMeters($docLat, $docLng, $lat, $lng);
            $distKm = round($distM / 1000, 1);

            $tags = [];
            if ($req->symptom_tags) {
                $tags = is_array($req->symptom_tags) ? $req->symptom_tags : json_decode($req->symptom_tags, true) ?? [];
            }

            return [
                'id'            => $req->id,
                'urgency_level' => $req->urgency_level ?? 'critical',
                'status'        => $req->status,
                'description'   => $req->notes ?: 'Cần cấp cứu khẩn cấp cho thú cưng',
                'sos_latitude'  => $lat,
                'sos_longitude' => $lng,
                'created_at'    => $req->created_at,
                'symptom_tags'  => $tags,
                'pet_photo_url' => $req->pet_photo_url,
                'ai_first_aid'  => $req->ai_first_aid,
                'user'          => [
                    'id'     => $req->user_id,
                    'name'   => $req->user_name ?? 'Chủ nuôi',
                    'phone'  => $this->formatVietnamesePhone($req->user_phone ?? ''),
                    'avatar' => $req->user_avatar,
                ],
                'pet'           => [
                    'name'  => $req->pet_name ?: ($req->registered_pet_name ?: 'Bé cưng'),
                    'breed' => $req->pet_breed ?: ($req->registered_pet_breed ?: 'Thú cưng'),
                ],
                'distance_km'   => $distKm,
                'distance_txt'  => $this->formatDistance($distM),
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. CHI TIẾT CA SOS
    // ────────────────────────────────────────────────────────────────────────

    public function getSosDetail(Request $request, int $id): JsonResponse
    {
        $emergency = DB::table('emergency_requests as er')
            ->leftJoin('users as u', 'u.id', '=', 'er.user_id')
            ->leftJoin('users as doc', 'doc.id', '=', 'er.doctor_id')
            ->leftJoin('pets as p', 'p.id', '=', 'er.pet_id')
            ->where('er.id', $id)
            ->select([
                'er.*',
                'u.name as user_name',
                'u.phone as user_phone',
                'u.avatar_url as user_avatar',
                'doc.name as doctor_name',
                'doc.phone as doctor_phone',
                'doc.specialty as doctor_specialty',
                'doc.clinic_name as doctor_clinic',
                'p.pet_name as registered_pet_name',
                'p.breed as registered_pet_breed',
            ])
            ->first();

        if (!$emergency) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy ca SOS.'], 404);
        }

        $report = DB::table('sos_reports')->where('emergency_request_id', $id)->first();

        $tags = [];
        if ($emergency->symptom_tags) {
            $tags = is_array($emergency->symptom_tags) ? $emergency->symptom_tags : json_decode($emergency->symptom_tags, true) ?? [];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'            => $emergency->id,
                'status'        => $emergency->status,
                'urgency_level' => $emergency->urgency_level,
                'notes'         => $emergency->notes,
                'symptom_tags'  => $tags,
                'pet_photo_url' => $emergency->pet_photo_url,
                'ai_first_aid'  => $emergency->ai_first_aid,
                'sos_latitude'  => (float) $emergency->sos_latitude,
                'sos_longitude' => (float) $emergency->sos_longitude,
                'created_at'    => $emergency->created_at,
                'accepted_at'   => $emergency->accepted_at,
                'completed_at'  => $emergency->completed_at,
                'user'          => [
                    'id'     => $emergency->user_id,
                    'name'   => $emergency->user_name,
                    'phone'  => $this->formatVietnamesePhone($emergency->user_phone ?? ''),
                    'avatar' => $emergency->user_avatar,
                ],
                'pet'           => [
                    'name'  => $emergency->pet_name ?: ($emergency->registered_pet_name ?: 'Bé cưng'),
                    'breed' => $emergency->pet_breed ?: ($emergency->registered_pet_breed ?: 'Thú cưng'),
                ],
                'doctor'        => $emergency->doctor_id ? [
                    'id'          => $emergency->doctor_id,
                    'name'        => $emergency->doctor_name,
                    'phone'       => $this->formatVietnamesePhone($emergency->doctor_phone ?? ''),
                    'specialty'   => $emergency->doctor_specialty,
                    'clinic_name' => $emergency->doctor_clinic,
                ] : null,
                'report'        => $report,
            ],
        ]);
    }

    /**
     * Lấy tuyến đường cấp cứu & chỉ dẫn rẽ chi tiết (Bác sĩ).
     * Áp dụng quyền riêng tư: Nếu chưa chấp nhận ca -> Tọa độ đích bị làm mờ (~500m).
     * Sau khi nhận ca -> Trả về tọa độ chính xác.
     */
    public function getEmergencyRoute(Request $request, int $id): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        if (!$doctorId) {
            return response()->json(['success' => false, 'message' => 'Chưa xác thực.'], 401);
        }

        $doctor = User::find($doctorId);
        if (!$doctor || $doctor->role !== 'doctor') {
            return response()->json(['success' => false, 'message' => 'Chỉ bác sĩ mới có quyền truy cập chỉ đường cấp cứu.'], 403);
        }

        $emergency = DB::table('emergency_requests')->where('id', $id)->first();
        if (!$emergency) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy ca SOS.'], 404);
        }

        $fromLat = (float) $request->query('from_lat', 0);
        $fromLng = (float) $request->query('from_lng', 0);
        $mode    = $request->query('mode', 'driving');

        if (!$fromLat || !$fromLng) {
            $presence = DB::table('doctors_online')->where('user_id', $doctorId)->first();
            if ($presence && $presence->latitude) {
                $fromLat = (float) $presence->latitude;
                $fromLng = (float) $presence->longitude;
            } elseif ($doctor->latitude) {
                $fromLat = (float) $doctor->latitude;
                $fromLng = (float) $doctor->longitude;
            } else {
                $fromLat = 21.0285;
                $fromLng = 105.8542;
            }
        }

        $isAcceptedDoctor = in_array($emergency->status, ['accepted', 'en_route', 'arrived', 'treating', 'completed'])
            && (int)$emergency->doctor_id === (int)$doctorId;

        $targetLat = (float) ($emergency->sos_latitude ?? 21.028);
        $targetLng = (float) ($emergency->sos_longitude ?? 105.854);
        $isApproximate = false;

        // Privacy rule: Trước khi nhận ca, chỉ hiển thị vùng ước lượng bán kính 500m
        if (!$isAcceptedDoctor) {
            $fuzzed = RoutingService::fuzzCoordinates($targetLat, $targetLng, 500.0);
            $targetLat = $fuzzed['lat'];
            $targetLng = $fuzzed['lng'];
            $isApproximate = true;
        }

        $routingService = new RoutingService();
        $route = $routingService->getRoute($fromLat, $fromLng, $targetLat, $targetLng, $mode);

        return response()->json([
            'success'        => true,
            'emergency_id'   => $id,
            'is_accepted'    => $isAcceptedDoctor,
            'is_approximate' => $isApproximate,
            'origin'         => ['lat' => $fromLat, 'lng' => $fromLng],
            'destination'    => [
                'lat'                  => $targetLat,
                'lng'                  => $targetLng,
                'approximate_radius_m' => $isApproximate ? 500 : 0,
            ],
            'geometry'       => $route['geometry'],
            'distance_m'     => $route['distance_m'],
            'duration_s'     => $route['duration_s'],
            'distance_txt'   => $route['distance_txt'],
            'duration_txt'   => $route['duration_txt'],
            'steps'          => $route['steps'],
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. BÁC SĨ CHẤP NHẬN CA (Grab-style Race-Condition Safe)
    // ────────────────────────────────────────────────────────────────────────

    public function acceptSos(Request $request, int $emergencyId): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        if (!$doctorId) {
            return response()->json(['success' => false, 'message' => 'Chưa xác thực.'], 401);
        }

        $doctor = User::find($doctorId);
        if (!$doctor || $doctor->role !== 'doctor') {
            return response()->json(['success' => false, 'message' => 'Chỉ bác sĩ mới có thể nhận ca cấp cứu.'], 403);
        }

        // Khóa giao dịch nguyên tử DB Transaction
        $result = DB::transaction(function () use ($emergencyId, $doctorId) {
            $row = DB::table('emergency_requests')
                ->where('id', $emergencyId)
                ->lockForUpdate()
                ->first();

            if (!$row) {
                return ['status' => 'not_found'];
            }

            // Nếu chính bác sĩ này đã nhận trước đó -> trả về thành công (idempotent)
            if ($row->status === 'accepted' && (int)$row->doctor_id === (int)$doctorId) {
                return ['status' => 'already_mine'];
            }

            // Nếu ca không còn ở trạng thái tìm bác sĩ
            if (!in_array($row->status, ['finding', 'pending'])) {
                return ['status' => 'already_taken'];
            }

            // Cập nhật trạng thái thành accepted
            DB::table('emergency_requests')
                ->where('id', $emergencyId)
                ->update([
                    'status'      => 'accepted',
                    'doctor_id'   => $doctorId,
                    'accepted_at' => now(),
                    'updated_at'  => now(),
                ]);

            // Đánh dấu bác sĩ bận
            DB::table('doctors_online')
                ->where('user_id', $doctorId)
                ->update(['is_busy' => 1, 'updated_at' => now()]);

            return ['status' => 'success', 'data' => $row];
        });

        if ($result['status'] === 'not_found') {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy ca SOS.'], 404);
        }

        if ($result['status'] === 'already_taken') {
            return response()->json([
                'success' => false,
                'message' => 'Ca này đã được bác sĩ khác tiếp nhận.',
            ], 409);
        }

        $emergency = DB::table('emergency_requests')->find($emergencyId);
        $user      = User::find($emergency->user_id);

        Log::info("✅ Bác sĩ #{$doctorId} ({$doctor->name}) nhận ca SOS #{$emergencyId}");

        return response()->json([
            'success'      => true,
            'message'      => 'Bạn đã nhận ca thành công!',
            'emergency_id' => $emergencyId,
            'patient'      => [
                'name'  => $user?->name ?? 'Người dùng',
                'phone' => $this->formatVietnamesePhone($user?->phone ?? ''),
            ],
            'symptom_tags' => json_decode($emergency->symptom_tags ?? '[]'),
            'notes'        => $emergency->notes,
            'pet_photo_url'=> $emergency->pet_photo_url,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. CẬP NHẬT TRẠNG THÁI TIẾN ĐỘ CA (State Machine)
    // ────────────────────────────────────────────────────────────────────────

    public function updateSosStatus(Request $request, int $emergencyId): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        if (!$doctorId) return response()->json(['success' => false, 'message' => 'Chưa xác thực.'], 401);

        $validated = $request->validate([
            'status' => 'required|string|in:en_route,arrived,treating,completed',
        ]);

        $nextStatus = $validated['status'];

        $emergency = DB::table('emergency_requests')->where('id', $emergencyId)->first();
        if (!$emergency) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy ca SOS.'], 404);
        }

        if ((int)$emergency->doctor_id !== (int)$doctorId) {
            return response()->json(['success' => false, 'message' => 'Bạn không phải là bác sĩ phụ trách ca này.'], 403);
        }

        $updateData = [
            'status'     => $nextStatus,
            'updated_at' => now(),
        ];

        if ($nextStatus === 'completed') {
            $updateData['completed_at'] = now();
            DB::table('doctors_online')->where('user_id', $doctorId)->update(['is_busy' => 0]);
        }

        DB::table('emergency_requests')->where('id', $emergencyId)->update($updateData);

        return response()->json([
            'success' => true,
            'message' => "Đã chuyển trạng thái ca sang '{$nextStatus}'",
            'status'  => $nextStatus,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. HỦY CA SOS (Chủ nuôi hoặc Bác sĩ)
    // ────────────────────────────────────────────────────────────────────────

    public function cancelSos(Request $request, int $emergencyId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) return response()->json(['success' => false, 'message' => 'Chưa xác thực.'], 401);

        $emergency = DB::table('emergency_requests')->where('id', $emergencyId)->first();
        if (!$emergency) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy ca SOS.'], 404);
        }

        // Cho phép chủ ca hoặc bác sĩ phụ trách hủy ca
        if ((int)$emergency->user_id !== (int)$userId && (int)$emergency->doctor_id !== (int)$userId) {
            return response()->json(['success' => false, 'message' => 'Không có quyền hủy ca này.'], 403);
        }

        DB::table('emergency_requests')
            ->where('id', $emergencyId)
            ->update([
                'status'     => 'canceled',
                'updated_at' => now(),
            ]);

        if ($emergency->doctor_id) {
            DB::table('doctors_online')->where('user_id', $emergency->doctor_id)->update(['is_busy' => 0]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy ca cấp cứu thành công.',
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 7. HOÀN TẤT CA & LƯU BÁO CÁO Y KHOA (Doctor Complete with Report)
    // ────────────────────────────────────────────────────────────────────────

    public function completeSos(Request $request, int $emergencyId): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        if (!$doctorId) return response()->json(['success' => false, 'message' => 'Chưa xác thực.'], 401);

        $validated = $request->validate([
            'diagnosis'         => 'nullable|string|max:2000',
            'treatment_summary' => 'nullable|string|max:2000',
            'follow_up_advice'  => 'nullable|string|max:2000',
            'prescription'      => 'nullable|string|max:2000',
        ]);

        $updated = DB::table('emergency_requests')
            ->where('id', $emergencyId)
            ->where('doctor_id', $doctorId)
            ->update([
                'status'       => 'completed',
                'completed_at' => now(),
                'updated_at'   => now(),
            ]);

        if (!$updated) {
            return response()->json(['success' => false, 'message' => 'Không thể hoàn tất ca này.'], 400);
        }

        // Lưu bệnh án / báo cáo cấp cứu
        if (!empty($validated['diagnosis']) || !empty($validated['treatment_summary'])) {
            DB::table('sos_reports')->updateOrInsert(
                ['emergency_request_id' => $emergencyId],
                [
                    'doctor_id'         => $doctorId,
                    'diagnosis'         => $validated['diagnosis'] ?? 'Đã sơ cứu tại chỗ, sức khỏe thú cưng đã ổn định.',
                    'treatment_summary' => $validated['treatment_summary'] ?? 'Đã can thiệp y tế kịp thời.',
                    'follow_up_advice'  => $validated['follow_up_advice'] ?? 'Cho bé nghỉ ngơi, theo dõi thêm trong 24-48 giờ.',
                    'prescription'      => $validated['prescription'] ?? null,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]
            );
        }

        // Đánh dấu bác sĩ rảnh lại
        DB::table('doctors_online')
            ->where('user_id', $doctorId)
            ->update(['is_busy' => 0, 'updated_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Ca cấp cứu đã hoàn tất thành công. Đã lưu hồ sơ bệnh án!',
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 8. CẬP NHẬT VỊ TRÍ BÁC SĨ (Heartbeat Online)
    // ────────────────────────────────────────────────────────────────────────

    public function updateDoctorLocation(Request $request): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        if (!$doctorId) {
            return response()->json(['success' => false, 'message' => 'Chưa xác thực.'], 401);
        }

        $validated = $request->validate([
            'lat'       => 'required|numeric',
            'lng'       => 'required|numeric',
            'socket_id' => 'nullable|string|max:100',
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];

        DB::statement(
            "INSERT INTO doctors_online (user_id, latitude, longitude, location, is_online, socket_id, last_heartbeat, created_at, updated_at)
             VALUES (?, ?, ?, ST_GeomFromText('POINT({$lat} {$lng})', 4326), 1, ?, NOW(), NOW(), NOW())
             ON DUPLICATE KEY UPDATE
               latitude = VALUES(latitude),
               longitude = VALUES(longitude),
               location = ST_GeomFromText('POINT({$lat} {$lng})', 4326),
               is_online = 1,
               socket_id = VALUES(socket_id),
               last_heartbeat = NOW(),
               updated_at = NOW()",
            [$doctorId, $lat, $lng, $validated['socket_id'] ?? null]
        );

        return response()->json(['success' => true, 'is_online' => true]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 9. BÁC SĨ CHUYỂN SANG NGHỈ (Offline)
    // ────────────────────────────────────────────────────────────────────────

    public function doctorGoOffline(Request $request): JsonResponse
    {
        $doctorId = Auth::id() ?? $request->header('X-User-Id');
        if (!$doctorId) return response()->json(['success' => false], 401);

        DB::table('doctors_online')
            ->where('user_id', $doctorId)
            ->update(['is_online' => 0, 'updated_at' => now()]);

        return response()->json(['success' => true, 'is_online' => false, 'message' => 'Đã chuyển sang chế độ offline.']);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Tìm bác sĩ online/gần nhất trong bán kính
     */
    private function findNearbyDoctors(float $lat, float $lng, int $radius = self::DEFAULT_RADIUS_M): array
    {
        // 1. Thử tìm trong doctors_online trước
        $onlineDocs = DB::table('doctors_online as d')
            ->join('users as u', 'u.id', '=', 'd.user_id')
            ->where('d.is_online', 1)
            ->where('d.is_busy', 0)
            ->select(['d.user_id', 'd.socket_id', 'd.latitude', 'd.longitude', 'u.name', 'u.phone', 'u.specialty', 'u.clinic_name'])
            ->get();

        $results = [];
        foreach ($onlineDocs as $doc) {
            $docLat = (float) ($doc->latitude ?? 21.0285);
            $docLng = (float) ($doc->longitude ?? 105.8542);
            $distM = $this->calculateDistanceMeters($lat, $lng, $docLat, $docLng);
            if ($distM <= $radius) {
                $doc->distance_m = $distM;
                $results[] = $doc;
            }
        }

        // 2. Nếu không có bác sĩ online, fallback sang các bác sĩ trong bảng users
        if (empty($results)) {
            $registeredDocs = User::where('role', 'doctor')
                ->where('verification_status', 'verified')
                ->get();

            foreach ($registeredDocs as $doc) {
                $docLat = (float) ($doc->latitude ?? 21.0285);
                $docLng = (float) ($doc->longitude ?? 105.8542);
                $distM = $this->calculateDistanceMeters($lat, $lng, $docLat, $docLng);
                if ($distM <= $radius) {
                    $results[] = (object) [
                        'user_id'     => $doc->id,
                        'socket_id'   => null,
                        'name'        => $doc->name,
                        'phone'       => $doc->phone,
                        'specialty'   => $doc->specialty ?? 'Bác sĩ Thú y Tổng quát',
                        'clinic_name' => $doc->clinic_name ?? 'Phòng khám PetCare',
                        'distance_m'  => $distM,
                    ];
                }
            }
        }

        usort($results, fn($a, $b) => $a->distance_m <=> $b->distance_m);
        return array_slice($results, 0, 10);
    }

    /**
     * Tính khoảng cách giữa 2 tọa độ (Haversine formula, mét)
     */
    private function calculateDistanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $theta = $lon1 - $lon2;
        $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
        $dist = acos(max(-1.0, min(1.0, $dist)));
        $dist = rad2deg($dist);
        $meters = $dist * 60 * 1.1515 * 1609.344;
        return (int) round($meters);
    }

    /**
     * Lấy phác đồ AI First-Aid từ RAG service hoặc Gemini Fallback
     */
    private function getAiFirstAid(array $symptomTags, ?string $notes, ?string $petPhotoUrl): ?array
    {
        $ragUrl = config('services.rag.url');

        if ($ragUrl) {
            try {
                $response = Http::timeout(config('services.rag.timeout', 5))
                    ->post("{$ragUrl}/ai-first-aid", [
                        'symptom_tags' => $symptomTags,
                        'notes'        => $notes,
                    ]);

                if ($response->successful()) {
                    return $response->json();
                }
            } catch (\Throwable $e) {
                Log::debug("RAG service offline: {$e->getMessage()}");
            }
        }

        return $this->callGeminiFallback($symptomTags, $notes);
    }

    /**
     * Gọi Gemini Fallback
     */
    private function callGeminiFallback(array $tags, ?string $notes): array
    {
        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return $this->defaultFirstAid($tags);
        }

        try {
            $prompt = implode("\n", [
                "Bạn là bác sĩ thú y cấp cứu khẩn cấp.",
                "Thú cưng có triệu chứng: " . implode(', ', $tags) . ".",
                $notes ? "Ghi chú: {$notes}" : '',
                "Hãy đưa ra 3-4 bước sơ cứu khẩn cấp. Mỗi bước tối đa 15 từ. Chỉ gạch đầu dòng, bằng tiếng Việt.",
            ]);

            $response = Http::timeout(6)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}",
                [
                    'contents'         => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => ['maxOutputTokens' => 200, 'temperature' => 0.3],
                ]
            );

            if ($response->successful()) {
                $raw   = $response->json('candidates.0.content.parts.0.text') ?? '';
                $steps = array_values(array_filter(
                    array_map(fn($l) => trim(ltrim($l, '-•* ')), explode("\n", $raw)),
                    fn($l) => strlen($l) > 5
                ));

                return [
                    'steps'        => array_slice($steps, 0, 4),
                    'context_used' => 0,
                    'warning'      => '⚠️ Đây là hướng dẫn sơ cứu tạm thời. Hãy đưa thú cưng đến bác sĩ ngay!',
                ];
            }
        } catch (\Throwable $e) {
            Log::debug("Gemini API error: {$e->getMessage()}");
        }

        return $this->defaultFirstAid($tags);
    }

    /**
     * Sơ cứu mặc định chuẩn y khoa khi offline
     */
    private function defaultFirstAid(array $tags): array
    {
        $steps = [
            'Giữ thú cưng nằm yên nơi thoáng mát, tránh kích động.',
            'Cầm máu bằng gạc hoặc vải sạch nếu có vết thương chảy máu.',
            'Giữ ấm cơ thể, tuyệt đối không tự ý cho uống thuốc hạ sốt người.',
            'Liên hệ ngay bác sĩ thú y gần nhất để được can thiệp kịp thời.',
        ];

        if (in_array('Ngộ độc', $tags)) {
            $steps[1] = 'Không ép thú cưng nôn trừ khi có chỉ dẫn của bác sĩ thú y.';
        } elseif (in_array('Co giật', $tags)) {
            $steps[0] = 'Dọn dẹp vật sắc nhọn xung quanh, tuyệt đối không đưa tay vào miệng thú cưng.';
        } elseif (in_array('Khó thở', $tags)) {
            $steps[0] = 'Đặt thú cưng nằm nghiêng một bên, đầu hơi nâng cao để thông thoáng đường thở.';
        }

        return [
            'steps'        => $steps,
            'context_used' => 0,
            'warning'      => '⚠️ Hướng dẫn sơ cứu khẩn cấp. Bác sĩ đang tiếp nhận ca của bạn!',
        ];
    }

    /**
     * Ping bác sĩ qua Socket.io
     */
    private function pingDoctors(array $doctors, int $emergencyId, int $userId, float $lat, float $lng, array $tags): void
    {
        $socketUrl = env('SOCKET_SERVER_URL', 'http://localhost:3001');

        foreach ($doctors as $doctor) {
            if (empty($doctor->socket_id)) continue;

            try {
                Http::timeout(2)->post("{$socketUrl}/emit-sos", [
                    'socket_id'    => $doctor->socket_id,
                    'emergency_id' => $emergencyId,
                    'user_id'      => $userId,
                    'lat'          => $lat,
                    'lng'          => $lng,
                    'tags'         => $tags,
                    'countdown'    => 30,
                ]);
            } catch (\Throwable $e) {
                // Socket offline, ignore
            }
        }
    }

    /**
     * Format số điện thoại Việt Nam chuẩn 10 số (bắt đầu 0)
     */
    private function formatVietnamesePhone(string $phone): string
    {
        $clean = preg_replace('/\D/', '', $phone);
        if (str_starts_with($clean, '84') && strlen($clean) === 11) {
            return '0' . substr($clean, 2);
        }
        if (str_starts_with($clean, '0') && strlen($clean) === 10) {
            return $clean;
        }
        return $phone ?: '0901 234 567';
    }

    /**
     * Format khoảng cách hiển thị thân thiện
     */
    private function formatDistance(int $meters): string
    {
        if ($meters < 1000) return "{$meters} m";
        return round($meters / 1000, 1) . ' km';
    }
}
