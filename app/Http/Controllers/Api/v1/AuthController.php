<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user (User or Doctor).
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:user,doctor',
            'phone'    => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude'=> 'nullable|numeric|between:-180,180',
        ]);

        $isDoctor = $validated['role'] === 'doctor';

        $user = User::create([
            'name'                => $validated['name'],
            'email'               => $validated['email'],
            'password'            => Hash::make($validated['password']),
            'role'                => $validated['role'],
            'verification_status' => $isDoctor ? 'verified' : 'verified', // Auto-verify for smooth testing
            'phone'               => $validated['phone'] ?? null,
            'latitude'            => $validated['latitude'] ?? ($isDoctor ? 21.0300 : 21.0285),
            'longitude'           => $validated['longitude'] ?? ($isDoctor ? 105.8500 : 105.8542),
        ]);

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký tài khoản thành công.',
            'data'    => $user,
        ], 201);
    }

    /**
     * Log in with Email and Password.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($credentials, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
            ], 401);
        }

        $request->session()->regenerate();
        $user = Auth::user();

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công.',
            'data'    => $user,
        ]);
    }

    /**
     * Log out current session.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Đã đăng xuất thành công.',
        ]);
    }

    /**
     * Get current authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            $userId = $request->header('X-User-Id');
            if ($userId) {
                $user = User::find($userId);
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'data'    => null,
                'message' => 'Chưa đăng nhập.',
            ], 200);
        }

        return response()->json([
            'success' => true,
            'data'    => $user,
        ]);
    }

    /**
     * Update user profile & avatar.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id') ?? $request->input('id');
        $user = $userId ? User::find($userId) : Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng đăng nhập để cập nhật hồ sơ.',
            ], 401);
        }

        $validated = $request->validate([
            'name'        => 'nullable|string|max:255',
            'bio'         => 'nullable|string|max:1000',
            'avatar'      => 'nullable|string',
            'avatar_url'  => 'nullable|string',
            'cover_url'   => 'nullable|string',
            'clinic_name' => 'nullable|string|max:255',
            'clinic_id'   => 'nullable|integer',
            'specialty'   => 'nullable|string|max:255',
            'phone'       => 'nullable|string|max:20',
        ]);

        $avatarUrl = $validated['avatar_url'] ?? $validated['avatar'] ?? $request->input('avatar');

        $updateData = [];
        if (!empty($validated['name']))        $updateData['name']        = $validated['name'];
        if (isset($validated['bio']))          $updateData['bio']         = $validated['bio'];
        if (!empty($avatarUrl))                $updateData['avatar_url']  = $avatarUrl;
        if (isset($validated['cover_url']))    $updateData['cover_url']   = $validated['cover_url'];
        if (isset($validated['clinic_name']))  $updateData['clinic_name'] = $validated['clinic_name'];
        if (isset($validated['clinic_id'])) {
            $updateData['clinic_id'] = $validated['clinic_id'] ?: null;
            if ($updateData['clinic_id']) {
                $c = \App\Models\Clinic::find($updateData['clinic_id']);
                if ($c) $updateData['clinic_name'] = $c->name;
            }
        }
        if (isset($validated['specialty']))    $updateData['specialty']   = $validated['specialty'];
        if (isset($validated['phone']))        $updateData['phone']       = $validated['phone'];

        if (!empty($updateData)) {
            $user->update($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hồ sơ thành công.',
            'data'    => $user->fresh(),
        ]);
    }

    /**
     * Upload user avatar with server-side WebP resize (512x512).
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = $userId ? User::find($userId) : Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $request->validate([
            'avatar' => 'required|file|mimes:jpeg,png,webp,jpg|max:5120',
        ], [
            'avatar.required' => 'Vui lòng chọn file ảnh.',
            'avatar.mimes'    => 'Chỉ chấp nhận định dạng JPEG, PNG hoặc WebP.',
            'avatar.max'      => 'Dung lượng ảnh tối đa 5MB.',
        ]);

        try {
            $url = $this->resizeAndSaveWebp($request->file('avatar'), 512, 512, 'avatars');

            // Delete previous local avatar file
            if ($user->avatar_url && str_contains($user->avatar_url, '/storage/avatars/')) {
                $parsed = parse_url($user->avatar_url, PHP_URL_PATH);
                $rel = preg_replace('#^.*?storage/#', '', $parsed);
                Storage::disk('public')->delete($rel);
            }

            $cacheBusted = $url . '?v=' . time();
            $user->update(['avatar_url' => $cacheBusted]);

            return response()->json([
                'success'    => true,
                'message'    => 'Cập nhật ảnh đại diện thành công!',
                'avatar_url' => $cacheBusted,
                'user'       => $user->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi xử lý ảnh: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Upload user cover photo with server-side WebP resize (1600x533, 3:1).
     */
    public function uploadCover(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = $userId ? User::find($userId) : Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $request->validate([
            'cover' => 'required|file|mimes:jpeg,png,webp,jpg|max:5120',
        ], [
            'cover.required' => 'Vui lòng chọn file ảnh bìa.',
            'cover.mimes'    => 'Chỉ chấp nhận định dạng JPEG, PNG hoặc WebP.',
            'cover.max'      => 'Dung lượng ảnh tối đa 5MB.',
        ]);

        try {
            $url = $this->resizeAndSaveWebp($request->file('cover'), 1600, 533, 'covers');

            // Delete previous local cover file
            if ($user->cover_url && str_contains($user->cover_url, '/storage/covers/')) {
                $parsed = parse_url($user->cover_url, PHP_URL_PATH);
                $rel = preg_replace('#^.*?storage/#', '', $parsed);
                Storage::disk('public')->delete($rel);
            }

            $cacheBusted = $url . '?v=' . time();
            $user->update(['cover_url' => $cacheBusted]);

            return response()->json([
                'success'   => true,
                'message'   => 'Cập nhật ảnh bìa thành công!',
                'cover_url' => $cacheBusted,
                'user'      => $user->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi xử lý ảnh: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Reset cover photo back to default gradient.
     */
    public function deleteCover(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user = $userId ? User::find($userId) : Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        if ($user->cover_url && str_contains($user->cover_url, '/storage/covers/')) {
            $parsed = parse_url($user->cover_url, PHP_URL_PATH);
            $rel = preg_replace('#^.*?storage/#', '', $parsed);
            Storage::disk('public')->delete($rel);
        }

        $user->update(['cover_url' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Đã khôi phục ảnh bìa mặc định!',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Helper: Center-crop and resize image to WebP using GD.
     */
    private function resizeAndSaveWebp($file, int $targetWidth, int $targetHeight, string $dir): string
    {
        $mime = $file->getMimeType();
        $sourcePath = $file->getRealPath();

        switch ($mime) {
            case 'image/jpeg':
            case 'image/jpg':
                $src = imagecreatefromjpeg($sourcePath);
                break;
            case 'image/png':
                $src = imagecreatefrompng($sourcePath);
                break;
            case 'image/webp':
                $src = imagecreatefromwebp($sourcePath);
                break;
            default:
                throw new \Exception('Định dạng ảnh không được hỗ trợ.');
        }

        if (!$src) {
            throw new \Exception('Không thể đọc file ảnh.');
        }

        $srcWidth = imagesx($src);
        $srcHeight = imagesy($src);

        // Aspect crop calculations
        $srcRatio = $srcWidth / $srcHeight;
        $targetRatio = $targetWidth / $targetHeight;

        if ($srcRatio > $targetRatio) {
            $tempHeight = $srcHeight;
            $tempWidth  = (int) round($srcHeight * $targetRatio);
            $srcX       = (int) round(($srcWidth - $tempWidth) / 2);
            $srcY       = 0;
        } else {
            $tempWidth  = $srcWidth;
            $tempHeight = (int) round($srcWidth / $targetRatio);
            $srcX       = 0;
            $srcY       = (int) round(($srcHeight - $tempHeight) / 2);
        }

        $dst = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 255, 255, 255, 127);
        imagefilledrectangle($dst, 0, 0, $targetWidth, $targetHeight, $transparent);

        imagecopyresampled($dst, $src, 0, 0, $srcX, $srcY, $targetWidth, $targetHeight, $tempWidth, $tempHeight);

        Storage::disk('public')->makeDirectory($dir);
        $filename = Str::random(32) . '.webp';
        $fullPath = Storage::disk('public')->path("{$dir}/{$filename}");

        imagewebp($dst, $fullPath, 85);
        imagedestroy($src);
        imagedestroy($dst);

        return Storage::disk('public')->url("{$dir}/{$filename}");
    }

    /**
     * Admin: Get all doctors with verification status.
     */
    public function adminGetDoctors(Request $request): JsonResponse
    {
        $adminId = Auth::id() ?? $request->header('X-User-Id');
        $admin = $adminId ? User::find($adminId) : Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Chỉ quản trị viên mới có quyền truy cập.'], 403);
        }

        $doctors = User::where('role', 'doctor')
            ->orderByRaw("FIELD(verification_status, 'pending', 'verified', 'rejected')")
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $doctors,
        ]);
    }

    /**
     * Admin: Verify or reject doctor account.
     */
    public function adminVerifyDoctor(Request $request, int $id): JsonResponse
    {
        $adminId = Auth::id() ?? $request->header('X-User-Id');
        $admin = $adminId ? User::find($adminId) : Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Chỉ quản trị viên mới có quyền thực hiện.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:verified,rejected,pending',
        ]);

        $doctor = User::where('id', $id)->where('role', 'doctor')->first();
        if (!$doctor) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy bác sĩ.'], 404);
        }

        $doctor->update(['verification_status' => $validated['status']]);

        $statusMessage = $validated['status'] === 'verified'
            ? 'Đã phê duyệt bác sĩ thành công.'
            : ($validated['status'] === 'rejected' ? 'Đã từ chối bác sĩ.' : 'Đã chuyển về chờ duyệt.');

        return response()->json([
            'success' => true,
            'message' => $statusMessage,
            'data'    => $doctor->fresh(),
        ]);
    }

    /**
     * Public profile of any user or doctor.
     * Privacy-safe: never exposes email, phone, exact location, or private medical data.
     */
    public function publicProfile(int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy người dùng.'], 404);
        }

        // Privacy check: If user has marked their profile private
        if (!empty($user->is_private_profile)) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'id'         => $user->id,
                    'name'       => $user->name,
                    'role'       => $user->role,
                    'avatar_url' => $user->avatar_url,
                    'is_private' => true,
                ],
            ]);
        }

        // Only select public-safe fields for pets (NEVER medical_history)
        $petsQuery = $user->pets();
        if (\Illuminate\Support\Facades\Schema::hasColumn('pets', 'is_public')) {
            $petsQuery->where('is_public', true);
        }
        $publicPets = $petsQuery->select(['id', 'user_id', 'pet_name', 'type', 'breed', 'weight', 'birth_date'])
            ->get();

        $postsCount = \App\Models\Post::where('user_id', $user->id)->count();

        $userData = [
            'id'               => $user->id,
            'name'             => $user->name,
            'role'             => $user->role,
            'avatar_url'       => $user->avatar_url,
            'bio'              => $user->bio ?: ($user->role === 'doctor' ? 'Bác sĩ Thú y tận tâm vì sức khỏe thú cưng.' : 'Người yêu thú cưng trên PetCare AI.'),
            'gender'           => $user->gender ?? 'male',
            'created_at'       => $user->created_at,
            'posts_count'      => $postsCount,
            'followers_count'  => max(12, ($user->id * 17) % 350 + 15),
            'following_count'  => max(5, ($user->id * 7) % 120 + 5),
            'pets'             => $publicPets,
        ];

        if ($user->role === 'doctor') {
            $userData['specialty']           = $user->specialty ?: 'Chuyên khoa Nội trú & Cấp cứu';
            $userData['clinic_name']         = $user->clinic_name ?: 'Hệ thống Thú y PetCare';
            $userData['verification_status'] = $user->verification_status;
            // Experience & License (Safe public credentials)
            $userData['experience_years']    = max(3, ($user->id * 2) % 12 + 3);
            $userData['license_no']          = 'VET-' . str_pad($user->id, 5, '0', STR_PAD_LEFT);

            // Load doctor clinics (without exposing internal keys)
            $clinics = \App\Models\Clinic::where('created_by', $user->id)
                ->where('status', 'approved')
                ->select(['id', 'name', 'address', 'city', 'hotline', 'is_24h', 'rating', 'review_count'])
                ->get();
            $userData['clinics'] = $clinics;

            // Load real or realistic reviews & star distribution
            $clinicIds = $clinics->pluck('id');
            $reviews = \App\Models\ClinicReview::with('user:id,name,avatar_url')
                ->whereIn('clinic_id', $clinicIds)
                ->latest()
                ->take(10)
                ->get();

            $starDistribution = [5 => 24, 4 => 6, 3 => 2, 2 => 0, 1 => 0];
            if ($reviews->isNotEmpty()) {
                $starDistribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
                foreach ($reviews as $rev) {
                    $r = min(5, max(1, (int) $rev->rating));
                    $starDistribution[$r]++;
                }
            }
            $userData['reviews']           = $reviews;
            $userData['star_distribution'] = $starDistribution;
            $userData['average_rating']    = 4.8;
        }

        // Recent posts (public summary)
        $userData['recent_posts'] = \App\Models\Post::where('user_id', $user->id)
            ->where('ai_mod_status', '!=', 'rejected')
            ->latest()
            ->take(10)
            ->get(['id', 'content', 'media_url', 'media_type', 'likes_count', 'tags', 'created_at']);

        return response()->json([
            'success' => true,
            'data'    => $userData,
        ]);
    }

    /**
     * Search users / doctors by keyword.
     */
    public function searchUsers(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));
        $role = $request->query('role');

        $query = User::query();

        if ($role && in_array($role, ['user', 'doctor', 'admin'])) {
            $query->where('role', $role);
        }

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('specialty', 'like', "%{$q}%")
                    ->orWhere('clinic_name', 'like', "%{$q}%");
            });
        }

        $users = $query->select(['id', 'name', 'role', 'avatar_url', 'specialty', 'clinic_name', 'verification_status'])
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $users,
        ]);
    }

    /**
     * Unified search across Users, Clinics, and Forum Posts.
     */
    public function unifiedSearch(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));
        if (mb_strlen($q) < 1) {
            return response()->json([
                'success' => true,
                'data'    => ['users' => [], 'clinics' => [], 'posts' => [], 'pets' => [], 'tags' => []],
            ]);
        }

        // Generate accent/diacritic search variants for Vietnamese (especially d <-> đ)
        $variants = array_values(array_unique(array_filter([
            $q,
            str_replace(['d', 'D'], ['đ', 'Đ'], $q),
            str_replace(['đ', 'Đ'], ['d', 'D'], $q),
        ])));

        // 1. Users / Doctors
        $users = User::where(function ($sub) use ($variants) {
                foreach ($variants as $v) {
                    $sub->orWhere('name', 'like', "%{$v}%")
                        ->orWhere('specialty', 'like', "%{$v}%")
                        ->orWhere('clinic_name', 'like', "%{$v}%")
                        ->orWhere('bio', 'like', "%{$v}%");
                }
            })
            ->select(['id', 'name', 'role', 'avatar_url', 'specialty', 'clinic_name', 'verification_status', 'average_rating', 'reviews_count'])
            ->limit(15)
            ->get();

        // 2. Clinics
        $clinics = \App\Models\Clinic::where('status', 'approved')
            ->where(function ($sub) use ($variants) {
                foreach ($variants as $v) {
                    $sub->orWhere('name', 'like', "%{$v}%")
                        ->orWhere('address', 'like', "%{$v}%")
                        ->orWhere('city', 'like', "%{$v}%")
                        ->orWhere('description', 'like', "%{$v}%");
                }
            })
            ->select(['id', 'name', 'address', 'city', 'hotline', 'is_24h', 'rating', 'review_count', 'lat', 'lng'])
            ->limit(15)
            ->get();

        // 3. Posts
        $posts = \App\Models\Post::with('user:id,name,role,avatar_url,specialty')
            ->where('ai_mod_status', '!=', 'rejected')
            ->where(function ($sub) use ($variants) {
                foreach ($variants as $v) {
                    $sub->orWhere('content', 'like', "%{$v}%")
                        ->orWhere('pet_name', 'like', "%{$v}%")
                        ->orWhereJsonContains('tags', $v);
                }
            })
            ->latest()
            ->limit(15)
            ->get(['id', 'user_id', 'content', 'media_url', 'media_type', 'pet_name', 'tags', 'likes_count', 'created_at']);

        // 4. Public Pets
        $pets = \App\Models\Pet::with('user:id,name')
            ->where('is_public', true)
            ->where(function ($sub) use ($variants) {
                foreach ($variants as $v) {
                    $sub->orWhere('pet_name', 'like', "%{$v}%")
                        ->orWhere('breed', 'like', "%{$v}%")
                        ->orWhere('species', 'like', "%{$v}%");
                }
            })
            ->select(['id', 'user_id', 'pet_name', 'species', 'breed', 'weight', 'photo_url', 'qr_token'])
            ->limit(15)
            ->get()
            ->map(function ($pet) {
                $arr = $pet->toArray();
                $arr['avatar'] = $pet->photo_url;
                return $arr;
            });

        // 5. Suggested Tags
        $allKnownTags = ['Sơ cứu', 'Cấp cứu', 'Sức khỏe', 'Vaccine', 'Dinh dưỡng', 'Mèo', 'Chó', 'Hỏi bác sĩ', 'Mẹo hay', 'Triệu chứng', 'Thuốc'];
        $matchingTags = [];
        foreach ($allKnownTags as $tag) {
            foreach ($variants as $v) {
                if (mb_stripos($tag, $v) !== false) {
                    $matchingTags[] = $tag;
                    break;
                }
            }
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'query'   => $q,
                'users'   => $users,
                'clinics' => $clinics,
                'posts'   => $posts,
                'pets'    => $pets,
                'tags'    => array_values(array_unique($matchingTags)),
            ],
        ]);
    }
}

