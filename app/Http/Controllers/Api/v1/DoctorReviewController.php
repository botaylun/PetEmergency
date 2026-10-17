<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\DoctorReview;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DoctorReviewController extends Controller
{
    /**
     * Get list of reviews for a doctor with aggregate statistics.
     */
    public function index(Request $request, int $doctorId): JsonResponse
    {
        $doctor = User::find($doctorId);
        if (!$doctor) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy bác sĩ.'], 404);
        }

        $currentUserId = Auth::id() ?? $request->header('X-User-Id');
        $currentUser = $currentUserId ? User::find($currentUserId) : null;

        $sortBy = $request->input('sort', 'newest'); // newest, highest, lowest
        $query = DoctorReview::with(['user:id,name,avatar_url,role'])
            ->where('doctor_id', $doctorId);

        switch ($sortBy) {
            case 'highest':
                $query->orderBy('rating', 'desc')->orderBy('created_at', 'desc');
                break;
            case 'lowest':
                $query->orderBy('rating', 'asc')->orderBy('created_at', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $reviews = $query->paginate(15);

        // Aggregate statistics
        $allReviews = DB::table('doctor_reviews')->where('doctor_id', $doctorId)->get();
        $total = $allReviews->count();
        $avg = $total > 0 ? round($allReviews->avg('rating'), 1) : 5.0;

        $distribution = [
            5 => $allReviews->where('rating', 5)->count(),
            4 => $allReviews->where('rating', 4)->count(),
            3 => $allReviews->where('rating', 3)->count(),
            2 => $allReviews->where('rating', 2)->count(),
            1 => $allReviews->where('rating', 1)->count(),
        ];

        // Existing review of current user
        $userReview = null;
        $canReview = false;

        if ($currentUser) {
            $isSelf = (int)$currentUser->id === (int)$doctorId;
            $isDoctorOrAdmin = in_array($currentUser->role, ['doctor', 'admin']);
            $canReview = !$isSelf && !$isDoctorOrAdmin;

            $userReview = DoctorReview::where('doctor_id', $doctorId)
                ->where('user_id', $currentUser->id)
                ->first();
        }

        return response()->json([
            'success'   => true,
            'data'      => $reviews->items(),
            'pagination'=> [
                'current_page' => $reviews->currentPage(),
                'last_page'    => $reviews->lastPage(),
                'total'        => $reviews->total(),
            ],
            'aggregate' => [
                'average'      => $avg,
                'total'        => $total,
                'distribution' => $distribution,
            ],
            'user_review' => $userReview,
            'can_review'  => $canReview,
        ]);
    }

    /**
     * Store or update a doctor review.
     */
    public function store(Request $request, int $doctorId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $currentUser = $userId ? User::find($userId) : Auth::user();

        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập để gửi đánh giá.'], 401);
        }

        if ((int)$currentUser->id === (int)$doctorId) {
            return response()->json(['success' => false, 'message' => 'Bạn không thể tự đánh giá chính mình.'], 422);
        }

        if (in_array($currentUser->role, ['doctor', 'admin'])) {
            return response()->json(['success' => false, 'message' => 'Chỉ tài khoản chủ nuôi mới có quyền viết đánh giá.'], 403);
        }

        $validated = $request->validate([
            'rating'  => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:1000',
        ], [
            'rating.required' => 'Vui lòng chọn số sao từ 1 đến 5.',
            'rating.between'  => 'Số sao đánh giá phải từ 1 đến 5.',
            'comment.max'     => 'Nhận xét không được vượt quá 1000 ký tự.',
        ]);

        // Check if verified treatment (completed SOS or appointment with this doctor)
        $completedSos = DB::table('emergency_requests')
            ->where('doctor_id', $doctorId)
            ->where('user_id', $currentUser->id)
            ->where('status', 'completed')
            ->latest('id')
            ->first();

        if (!$completedSos) {
            $completedSos = DB::table('emergency_logs')
                ->where('assigned_doctor_id', $doctorId)
                ->where('user_id', $currentUser->id)
                ->where('status', 'completed')
                ->latest('id')
                ->first();
        }

        $isVerified = !is_null($completedSos);
        $sosId = $completedSos ? $completedSos->id : null;

        // Upsert review
        $review = DoctorReview::updateOrCreate(
            ['doctor_id' => $doctorId, 'user_id' => $currentUser->id],
            [
                'rating'                => $validated['rating'],
                'comment'               => $validated['comment'] ?? null,
                'is_verified_treatment' => $isVerified,
                'sos_id'                => $sosId,
            ]
        );

        // Recalculate doctor rating atomically
        $this->recalculateDoctorRating($doctorId);

        return response()->json([
            'success' => true,
            'message' => 'Đánh giá của bạn đã được ghi nhận thành công!',
            'data'    => $review->load('user:id,name,avatar_url,role'),
        ]);
    }

    /**
     * Delete review by author or admin.
     */
    public function destroy(Request $request, int $doctorId, int $reviewId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $currentUser = $userId ? User::find($userId) : Auth::user();

        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Chưa đăng nhập.'], 401);
        }

        $review = DoctorReview::where('doctor_id', $doctorId)->where('id', $reviewId)->first();
        if (!$review) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy đánh giá.'], 404);
        }

        // IDOR check: author or admin only
        if ((int)$review->user_id !== (int)$currentUser->id && $currentUser->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa đánh giá này.'], 403);
        }

        $review->delete();
        $this->recalculateDoctorRating($doctorId);

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa đánh giá thành công.',
        ]);
    }

    /**
     * Doctor responds to a review (max 1 public reply).
     */
    public function reply(Request $request, int $doctorId, int $reviewId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        $currentUser = $userId ? User::find($userId) : Auth::user();

        if (!$currentUser || ((int)$currentUser->id !== (int)$doctorId && $currentUser->role !== 'admin')) {
            return response()->json(['success' => false, 'message' => 'Chỉ bác sĩ được đánh giá mới có quyền phản hồi.'], 403);
        }

        $review = DoctorReview::where('doctor_id', $doctorId)->where('id', $reviewId)->first();
        if (!$review) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy đánh giá.'], 404);
        }

        $validated = $request->validate([
            'reply' => 'required|string|max:1000',
        ], [
            'reply.required' => 'Nội dung phản hồi không được để trống.',
            'reply.max'      => 'Nội dung phản hồi tối đa 1000 ký tự.',
        ]);

        $review->update([
            'doctor_reply'      => $validated['reply'],
            'doctor_replied_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã đăng phản hồi công khai thành công!',
            'data'    => $review,
        ]);
    }

    /**
     * Report an inappropriate review.
     */
    public function report(Request $request, int $doctorId, int $reviewId): JsonResponse
    {
        $userId = Auth::id() ?? $request->header('X-User-Id');
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập để báo cáo.'], 401);
        }

        $review = DoctorReview::where('doctor_id', $doctorId)->where('id', $reviewId)->first();
        if (!$review) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy đánh giá.'], 404);
        }

        $reason = $request->input('reason', 'Nội dung không phù hợp');

        $review->update([
            'is_reported'   => true,
            'report_reason' => mb_substr($reason, 0, 255),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi báo cáo vi phạm đến ban quản trị.',
        ]);
    }

    /**
     * Atomically recalculate doctor average rating and count.
     */
    private function recalculateDoctorRating(int $doctorId): void
    {
        DB::transaction(function () use ($doctorId) {
            $stats = DB::table('doctor_reviews')
                ->where('doctor_id', $doctorId)
                ->selectRaw('COUNT(*) as total, AVG(rating) as avg_rating')
                ->first();

            $total = $stats->total ?? 0;
            $avg = $total > 0 ? round($stats->avg_rating, 2) : 5.0;

            DB::table('users')->where('id', $doctorId)->update([
                'average_rating' => $avg,
                'reviews_count'  => $total,
            ]);
        });
    }
}
