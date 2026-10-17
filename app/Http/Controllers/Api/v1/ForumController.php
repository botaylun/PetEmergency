<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Jobs\GeneratePostEmbedding;
use App\Models\Comment;
use App\Models\Post;
use App\Models\PostReport;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ForumController extends Controller
{
    // ────────────────────────────────────────────────────────
    // Available post tags (như Reddit)
    // ────────────────────────────────────────────────────────
    const AVAILABLE_TAGS = [
        'Sức khỏe', 'Dinh dưỡng', 'Sơ cứu', 'Vaccine',
        'Triệu chứng', 'Phẫu thuật', 'Tâm lý thú cưng',
        'Mèo', 'Chó', 'Thỏ', 'Chim', 'Cá cảnh',
        'Hỏi bác sĩ', 'Chia sẻ khoảnh khắc', 'Tìm bác sĩ',
        'Cấp cứu', 'Mẹo hay', 'Review phòng khám',
    ];

    // ────────────────────────────────────────────────────────
    // 1. TẠO BÀI VIẾT (có AI kiểm duyệt ảnh)
    // ────────────────────────────────────────────────────────

    public function createPost(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'media'   => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,webm|max:51200',
            'tags'    => 'nullable|array|max:5',
            'tags.*'  => 'string|max:50',
        ]);

        $rawUserId = Auth::id() ?? $request->header('X-User-Id') ?? $request->input('user_id');
        $user = null;
        if ($rawUserId) {
            $user = User::find($rawUserId);
        }
        if (!$user && $request->input('author_name')) {
            $user = User::where('name', $request->input('author_name'))->first();
        }
        if (!$user) {
            $user = User::first();
        }
        $userId = $user ? $user->id : 1;

        // Cập nhật avatar_url cho user nếu gửi kèm avatar và user chưa có
        if ($user && $request->input('author_avatar') && empty($user->avatar_url)) {
            $user->update(['avatar_url' => $request->input('author_avatar')]);
        }

        // ── Upload media ──────────────────────────────────────
        $mediaUrl  = null;
        $mediaType = 'none';

        if ($request->hasFile('media')) {
            $file = $request->file('media');
            $mime = $file->getMimeType();
            $ext  = strtolower($file->getClientOriginalExtension());

            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
            $videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'm4v'];

            if (str_starts_with($mime, 'image/') || in_array($ext, $imageExtensions)) {
                $mediaType = 'image';
            } elseif (str_starts_with($mime, 'video/') || in_array($ext, $videoExtensions)) {
                $mediaType = 'video';
            }

            $path     = $file->store('forum', 'public');
            $mediaUrl = $path;
        }

        // ── AI kiểm duyệt ảnh (chỉ khi có ảnh) ──────────────
        $aiModStatus = 'approved';
        $aiModReason = null;

        if ($mediaType === 'image' && $mediaUrl) {
            [$aiModStatus, $aiModReason] = $this->moderateImageWithAI(
                Storage::disk('public')->path($mediaUrl)
            );

            if ($aiModStatus === 'rejected') {
                // Xóa file vừa upload
                Storage::disk('public')->delete($mediaUrl);
                return response()->json([
                    'success' => false,
                    'message' => '🚫 Bài viết bị từ chối: ' . $aiModReason,
                    'ai_reason' => $aiModReason,
                ], 422);
            }
        }

        // ── Tagged pets (Part C: 0-3 pets, IDOR protected) ────────
        $petIds = $request->input('pet_ids', []);
        if (!is_array($petIds) && $request->filled('pet_ids')) {
            $petIds = [$petIds];
        }
        if (empty($petIds) && $request->filled('pet_id')) {
            $petIds = [$request->input('pet_id')];
        }

        // Lọc bỏ rỗng / không hợp lệ
        $petIds = array_values(array_filter(array_map('intval', (array)$petIds)));

        if (count($petIds) > 3) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gắn thẻ tối đa 3 thú cưng trong một bài viết.',
            ], 422);
        }

        if (!empty($petIds)) {
            $foreignPets = \App\Models\Pet::whereIn('id', $petIds)
                ->where('user_id', '!=', $userId)
                ->count();

            if ($foreignPets > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền gắn thẻ thú cưng của người khác.',
                ], 403);
            }
        }

        // ── Lưu bài viết ─────────────────────────────────────
        $tags = $validated['tags'] ?? [];
        $tags = array_values(array_filter($tags, fn($t) => mb_strlen($t) <= 50));

        $petName   = $request->input('petName')   ?? $request->input('pet_name');
        $petAvatar = $request->input('petAvatar') ?? $request->input('pet_avatar');

        $post = Post::create([
            'user_id'        => $userId,
            'pet_name'       => $petName,
            'pet_avatar'     => $petAvatar,
            'content'        => $validated['content'],
            'media_url'      => $mediaUrl,
            'media_type'     => $mediaType,
            'tags'           => $tags,
            'ai_mod_status'  => $aiModStatus,
            'ai_mod_reason'  => $aiModReason,
        ]);

        if (!empty($petIds)) {
            $post->pets()->sync($petIds);
        }

        $post->load([
            'user:id,name,email,role,verification_status,avatar_url,specialty,clinic_name',
            'pets:id,pet_name,species,breed,photo_url,is_public',
        ]);

        // ── Dispatch embedding job (async, không block response) ──
        try {
            GeneratePostEmbedding::dispatch($post)->onQueue('embeddings');
        } catch (\Throwable $e) {
            Log::warning("Không thể dispatch embedding job: {$e->getMessage()}");
        }

        return response()->json([
            'success' => true,
            'message' => 'Đăng bài viết thành công.',
            'data'    => array_merge($post->toArray(), [
                'media_full_url' => $post->media_full_url,
            ]),
        ], 201);
    }

    // ────────────────────────────────────────────────────────
    // 2. DANH SÁCH BÀI VIẾT
    // ────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 15);
        $tag     = $request->input('tag');

        $query = Post::with([
                'user:id,name,email,role,verification_status,avatar_url,specialty,clinic_name',
                'pets:id,pet_name,species,breed,photo_url,is_public',
                'comments' => fn($q) => $q->orderBy('created_at', 'asc'),
                'comments.user:id,name,email,role,verification_status,avatar_url,specialty',
            ])
            ->withCount('comments')
            ->where('ai_mod_status', '!=', 'rejected')
            ->where('is_flagged', false)
            ->orderBy('created_at', 'desc');

        // Lọc theo tag nếu có
        if ($tag) {
            $query->whereJsonContains('tags', $tag);
        }

        $posts = $query->paginate($perPage);

        $posts->getCollection()->transform(function ($post) {
            $post->media_full_url = $post->media_full_url;

            // Pin bình luận bác sĩ lên đầu
            $sortedComments = $post->comments->sort(function ($a, $b) {
                $aDoc = ($a->user && $a->user->role === 'doctor') ? 1 : 0;
                $bDoc = ($b->user && $b->user->role === 'doctor') ? 1 : 0;
                return $bDoc <=> $aDoc ?: $a->created_at <=> $b->created_at;
            })->values();

            $post->setRelation('comments', $sortedComments);
            return $post;
        });

        return response()->json(['success' => true, 'data' => $posts]);
    }

    // ────────────────────────────────────────────────────────
    // 3. XÓA BÀI VIẾT (chủ bài hoặc admin)
    // ────────────────────────────────────────────────────────

    public function deletePost(Request $request, int $postId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id') ?? $request->input('user_id');

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $post = Post::find($postId);
        if (!$post) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy bài viết.'], 404);
        }

        $user = User::find($userId);
        $isOwner = (string)$post->user_id === (string)$userId;
        $isAdmin = $user && $user->role === 'admin';

        if (!$isOwner && !$isAdmin) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa bài viết này.'], 403);
        }

        // Xóa file media nếu có
        if ($post->media_url) {
            Storage::disk('public')->delete($post->media_url);
        }

        $post->delete();

        return response()->json(['success' => true, 'message' => 'Đã xóa bài viết.']);
    }

    // ────────────────────────────────────────────────────────
    // 4. SỬA BÀI VIẾT (chỉ chủ bài)
    // ────────────────────────────────────────────────────────

    public function updatePost(Request $request, int $postId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id') ?? $request->input('user_id');

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập để chỉnh sửa bài viết.'], 401);
        }

        $post = Post::find($postId);
        if (!$post) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy bài viết.'], 404);
        }

        // Chỉ chủ bài viết do chính mình tạo mới có quyền chỉnh sửa
        if ((string)$post->user_id !== (string)$userId) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chỉ có quyền chỉnh sửa bài viết do chính bạn tạo.',
            ], 403);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'tags'    => 'nullable|array|max:5',
            'tags.*'  => 'string|max:50',
        ]);

        $post->update([
            'content' => $validated['content'],
            'tags'    => $validated['tags'] ?? $post->tags,
        ]);

        if ($request->has('pet_ids')) {
            $petIds = $request->input('pet_ids', []);
            $petIds = array_values(array_filter(array_map('intval', (array)$petIds)));
            if (count($petIds) > 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể gắn thẻ tối đa 3 thú cưng.',
                ], 422);
            }
            if (!empty($petIds)) {
                $foreign = \App\Models\Pet::whereIn('id', $petIds)->where('user_id', '!=', $userId)->count();
                if ($foreign > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền gắn thẻ thú cưng của người khác.',
                    ], 403);
                }
            }
            $post->pets()->sync($petIds);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật bài viết.',
            'data'    => $post->fresh(['user', 'pets']),
        ]);
    }

    // ────────────────────────────────────────────────────────
    // 5. BÌNH LUẬN
    // ────────────────────────────────────────────────────────

    public function addComment(Request $request, int $postId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập để bình luận.'], 401);
        }

        $validated = $request->validate(['content' => 'required|string|max:2000']);

        $post = Post::find($postId);
        if (!$post) {
            return response()->json(['success' => false, 'message' => 'Bài viết không tồn tại.'], 404);
        }

        $comment = Comment::create([
            'post_id' => $postId,
            'user_id' => $userId,
            'content' => $validated['content'],
        ]);

        $comment->load('user:id,name,email,role,verification_status,avatar_url,specialty,clinic_name');

        return response()->json(['success' => true, 'message' => 'Đã thêm bình luận.', 'data' => $comment], 201);
    }

    // ────────────────────────────────────────────────────────
    // 6. THÍCH
    // ────────────────────────────────────────────────────────

    public function toggleLike(Request $request, int $postId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập để thả tim.'], 401);
        }

        $post = Post::find($postId);
        if (!$post) {
            return response()->json(['success' => false, 'message' => 'Bài viết không tồn tại.'], 404);
        }

        $likes = max(0, ($post->likes_count ?? 0) + 1);
        $post->update(['likes_count' => $likes]);

        return response()->json(['success' => true, 'likes_count' => $likes]);
    }

    // ────────────────────────────────────────────────────────
    // 7. BÁO CÁO BÀI VIẾT
    // ────────────────────────────────────────────────────────

    public function reportPost(Request $request, int $postId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập để báo cáo.'], 401);
        }

        $validated = $request->validate([
            'reason'      => 'required|in:spam,inappropriate,misinformation,harassment,off_topic,other',
            'description' => 'nullable|string|max:500',
        ]);

        $post = Post::find($postId);
        if (!$post) {
            return response()->json(['success' => false, 'message' => 'Bài viết không tồn tại.'], 404);
        }

        try {
            PostReport::create([
                'post_id'     => $postId,
                'reporter_id' => $userId,
                'reason'      => $validated['reason'],
                'description' => $validated['description'] ?? null,
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            return response()->json(['success' => false, 'message' => 'Bạn đã báo cáo bài viết này rồi.'], 409);
        }

        // Tự động flag nếu ≥ 3 reports
        $reportCount = PostReport::where('post_id', $postId)->count();
        if ($reportCount >= 3) {
            $post->update(['is_flagged' => true]);
        }

        return response()->json(['success' => true, 'message' => 'Đã gửi báo cáo. Chúng tôi sẽ xem xét sớm nhất!']);
    }

    // ────────────────────────────────────────────────────────
    // 8. ADMIN: DANH SÁCH BÁO CÁO
    // ────────────────────────────────────────────────────────

    public function adminReports(Request $request): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user   = User::find($userId);

        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Truy cập bị từ chối.'], 403);
        }

        $reports = PostReport::with([
                'post:id,content,user_id,media_url,created_at',
                'post.user:id,name,email',
                'reporter:id,name,email',
            ])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $reports]);
    }

    // ────────────────────────────────────────────────────────
    // 9. ADMIN: DUYỆT/TỪ CHỐI BÁO CÁO
    // ────────────────────────────────────────────────────────

    public function adminReviewReport(Request $request, int $reportId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $user   = User::find($userId);

        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Truy cập bị từ chối.'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:dismiss,delete_post',
        ]);

        $report = PostReport::find($reportId);
        if (!$report) {
            return response()->json(['success' => false, 'message' => 'Báo cáo không tồn tại.'], 404);
        }

        if ($validated['action'] === 'delete_post') {
            $post = Post::find($report->post_id);
            if ($post) {
                if ($post->media_url) Storage::disk('public')->delete($post->media_url);
                $post->delete();
            }
            PostReport::where('post_id', $report->post_id)->update([
                'status' => 'reviewed', 'reviewed_by' => $userId,
            ]);
            return response()->json(['success' => true, 'message' => 'Đã xóa bài viết và đánh dấu báo cáo đã xử lý.']);
        }

        // Dismiss
        $report->update(['status' => 'dismissed', 'reviewed_by' => $userId]);
        Post::where('id', $report->post_id)->update(['is_flagged' => false]);

        return response()->json(['success' => true, 'message' => 'Đã bỏ qua báo cáo.']);
    }

    // ────────────────────────────────────────────────────────
    // 10. DANH SÁCH TAGS KHẢ DỤNG
    // ────────────────────────────────────────────────────────

    public function getTags(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => self::AVAILABLE_TAGS]);
    }

    // ────────────────────────────────────────────────────────
    // PRIVATE: AI Kiểm duyệt ảnh với Gemini
    // ────────────────────────────────────────────────────────

    private function moderateImageWithAI(string $imagePath): array
    {
        try {
            $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
            if (!$apiKey) {
                // Nếu không có API key, bỏ qua kiểm duyệt
                return ['approved', null];
            }

            $imageData   = base64_encode(file_get_contents($imagePath));
            $mimeType    = mime_content_type($imagePath) ?: 'image/jpeg';

            $response = Http::timeout(15)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}",
                [
                    'contents' => [[
                        'parts' => [
                            [
                                'inline_data' => [
                                    'mime_type' => $mimeType,
                                    'data'      => $imageData,
                                ],
                            ],
                            [
                                'text' => 'Ảnh này có chứa động vật (chó, mèo, thú cưng, hoặc bất kỳ loài vật nào) không? Chỉ trả lời YES hoặc NO, không giải thích thêm.',
                            ],
                        ],
                    ]],
                    'generationConfig' => ['maxOutputTokens' => 5, 'temperature' => 0],
                ]
            );

            if ($response->successful()) {
                $text = strtoupper(trim(
                    $response->json('candidates.0.content.parts.0.text') ?? 'YES'
                ));

                if (str_contains($text, 'NO')) {
                    return ['rejected', 'Ảnh không chứa thú cưng. Vui lòng chỉ đăng ảnh liên quan đến thú cưng của bạn.'];
                }
            }

            return ['approved', null];

        } catch (\Throwable $e) {
            Log::warning("AI moderation lỗi, bỏ qua kiểm duyệt: {$e->getMessage()}");
            return ['approved', null]; // Fallback: cho phép nếu AI lỗi
        }
    }
}
