<?php

namespace Tests\Feature;

use App\Models\DoctorReview;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DoctorReviewTest extends TestCase
{
    use DatabaseTransactions;

    protected User $doctor;
    protected User $user;
    protected User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->doctor = User::factory()->create([
            'name'                => 'BS. Phạm Thị Mai Test',
            'email'               => uniqid('dr_') . '@petcare.vn',
            'role'                => 'doctor',
            'specialty'           => 'Cấp cứu & Hồi sức Thú y 24/24',
            'verification_status' => 'verified',
        ]);

        $this->user = User::factory()->create([
            'name'                => 'Chủ Pet Test',
            'email'               => uniqid('user_') . '@gmail.com',
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);

        $this->otherUser = User::factory()->create([
            'name'                => 'Người Dùng Khác',
            'email'               => uniqid('other_') . '@gmail.com',
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);
    }

    public function test_user_can_submit_review_for_doctor(): void
    {
        $response = $this->withHeaders(['X-User-Id' => (string)$this->user->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews", [
                'rating'  => 5,
                'comment' => 'Bác sĩ Mai cấp cứu cho bé cún nhà mình rất kịp thời và tận tâm!',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => [
                    'doctor_id' => $this->doctor->id,
                    'user_id'   => $this->user->id,
                    'rating'    => 5,
                    'comment'   => 'Bác sĩ Mai cấp cứu cho bé cún nhà mình rất kịp thời và tận tâm!',
                ],
            ]);

        $this->assertDatabaseHas('doctor_reviews', [
            'doctor_id' => $this->doctor->id,
            'user_id'   => $this->user->id,
            'rating'    => 5,
        ]);

        // Verify doctor rating recalculated
        $freshDoctor = $this->doctor->fresh();
        $this->assertEquals(5.0, (float)$freshDoctor->average_rating);
        $this->assertEquals(1, $freshDoctor->reviews_count);
    }

    public function test_doctor_cannot_self_review(): void
    {
        $response = $this->withHeaders(['X-User-Id' => (string)$this->doctor->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews", [
                'rating'  => 5,
                'comment' => 'Tự khen bản thân.',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Bạn không thể tự đánh giá chính mình.',
            ]);
    }

    public function test_doctor_cannot_review_another_doctor(): void
    {
        $doctorColleague = User::factory()->create([
            'email' => uniqid('dr_colleague_') . '@petcare.vn',
            'role'  => 'doctor',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$doctorColleague->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews", [
                'rating'  => 5,
                'comment' => 'Bác sĩ đồng nghiệp tuyệt vời.',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Chỉ tài khoản chủ nuôi mới có quyền viết đánh giá.',
            ]);
    }

    public function test_duplicate_review_updates_existing_review_upsert(): void
    {
        // First review: 4 stars
        $this->withHeaders(['X-User-Id' => (string)$this->user->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews", [
                'rating'  => 4,
                'comment' => 'Khá tốt.',
            ]);

        // Second review by same user: update to 5 stars
        $response = $this->withHeaders(['X-User-Id' => (string)$this->user->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews", [
                'rating'  => 5,
                'comment' => 'Rất hài lòng sau khi tái khám!',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseCount('doctor_reviews', 1);
        $this->assertDatabaseHas('doctor_reviews', [
            'doctor_id' => $this->doctor->id,
            'user_id'   => $this->user->id,
            'rating'    => 5,
            'comment'   => 'Rất hài lòng sau khi tái khám!',
        ]);

        $freshDoctor = $this->doctor->fresh();
        $this->assertEquals(5.0, (float)$freshDoctor->average_rating);
        $this->assertEquals(1, $freshDoctor->reviews_count);
    }

    public function test_review_with_completed_sos_gets_verified_treatment_badge(): void
    {
        // Create completed SOS between this doctor and user
        $sosId = \Illuminate\Support\Facades\DB::table('emergency_requests')->insertGetId([
            'user_id'     => $this->user->id,
            'doctor_id'   => $this->doctor->id,
            'status'      => 'completed',
            'pet_name'    => 'Milo',
            'sos_latitude'=> 21.0285,
            'sos_longitude'=> 105.8542,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$this->user->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews", [
                'rating'  => 5,
                'comment' => 'Cảm ơn bác sĩ đã cứu sống bé trong ca cấp cứu!',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => [
                    'is_verified_treatment' => true,
                    'sos_id'                => $sosId,
                ],
            ]);

        $this->assertDatabaseHas('doctor_reviews', [
            'doctor_id'             => $this->doctor->id,
            'user_id'               => $this->user->id,
            'is_verified_treatment' => true,
            'sos_id'                => $sosId,
        ]);
    }

    public function test_doctor_can_reply_to_review(): void
    {
        $review = DoctorReview::create([
            'doctor_id'             => $this->doctor->id,
            'user_id'               => $this->user->id,
            'rating'                => 5,
            'comment'               => 'Bác sĩ tư vấn rất chi tiết.',
            'is_verified_treatment' => false,
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$this->doctor->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews/{$review->id}/reply", [
                'reply' => 'Cảm ơn bạn đã tin tưởng gửi gắm bé cho phòng khám!',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => [
                    'doctor_reply' => 'Cảm ơn bạn đã tin tưởng gửi gắm bé cho phòng khám!',
                ],
            ]);

        $this->assertDatabaseHas('doctor_reviews', [
            'id'           => $review->id,
            'doctor_reply' => 'Cảm ơn bạn đã tin tưởng gửi gắm bé cho phòng khám!',
        ]);
    }

    public function test_other_user_cannot_reply_to_review(): void
    {
        $review = DoctorReview::create([
            'doctor_id' => $this->doctor->id,
            'user_id'   => $this->user->id,
            'rating'    => 5,
            'comment'   => 'Dịch vụ tốt.',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$this->otherUser->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews/{$review->id}/reply", [
                'reply' => 'Phản hồi trái phép.',
            ]);

        $response->assertStatus(403);
    }

    public function test_user_can_delete_own_review_and_rating_recalculates(): void
    {
        $review = DoctorReview::create([
            'doctor_id' => $this->doctor->id,
            'user_id'   => $this->user->id,
            'rating'    => 4,
            'comment'   => 'Muốn xóa đánh giá này.',
        ]);
        $this->doctor->update(['average_rating' => 4.0, 'reviews_count' => 1]);

        $response = $this->withHeaders(['X-User-Id' => (string)$this->user->id])
            ->deleteJson("/api/v1/doctors/{$this->doctor->id}/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('doctor_reviews', ['id' => $review->id]);

        $freshDoctor = $this->doctor->fresh();
        $this->assertEquals(5.0, (float)$freshDoctor->average_rating);
        $this->assertEquals(0, $freshDoctor->reviews_count);
    }

    public function test_idor_user_cannot_delete_others_review(): void
    {
        $review = DoctorReview::create([
            'doctor_id' => $this->doctor->id,
            'user_id'   => $this->user->id,
            'rating'    => 5,
            'comment'   => 'Đánh giá chân thực.',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$this->otherUser->id])
            ->deleteJson("/api/v1/doctors/{$this->doctor->id}/reviews/{$review->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('doctor_reviews', ['id' => $review->id]);
    }

    public function test_user_can_report_review(): void
    {
        $review = DoctorReview::create([
            'doctor_id' => $this->doctor->id,
            'user_id'   => $this->user->id,
            'rating'    => 1,
            'comment'   => 'Ngôn từ xúc phạm, thô tục.',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$this->otherUser->id])
            ->postJson("/api/v1/doctors/{$this->doctor->id}/reviews/{$review->id}/report", [
                'reason' => 'Ngôn từ xúc phạm',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Đã gửi báo cáo vi phạm đến ban quản trị.',
            ]);

        $this->assertDatabaseHas('doctor_reviews', [
            'id'            => $review->id,
            'is_reported'   => true,
            'report_reason' => 'Ngôn từ xúc phạm',
        ]);
    }
}
