<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Round3PetManagementAndForumTest extends TestCase
{
    use \Illuminate\Foundation\Testing\DatabaseTransactions;
    /**
     * PART A: Public User Profile & Unified Search
     */
    public function test_public_user_profile_returns_safe_data_without_leaking_sensitive_fields(): void
    {
        $doctor = User::factory()->create([
            'name'                => 'BS. Đặng Hoàng Nam',
            'email'               => uniqid('doctor_') . '@petcare.vn',
            'role'                => 'doctor',
            'specialty'           => 'Nội khoa & Tiêm chủng',
            'clinic_name'         => 'Bệnh viện PetCare Hà Nội',
            'verification_status' => 'verified',
        ]);

        $response = $this->getJson("/api/v1/users/{$doctor->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id'                  => $doctor->id,
                    'name'                => 'BS. Đặng Hoàng Nam',
                    'role'                => 'doctor',
                    'specialty'           => 'Nội khoa & Tiêm chủng',
                    'verification_status' => 'verified',
                ],
            ]);

        // Verify sensitive fields are hidden
        $json = $response->json();
        $this->assertArrayNotHasKey('password', $json['data']);
    }

    public function test_unified_search_returns_doctors_clinics_and_posts(): void
    {
        $user = User::factory()->create(['name' => 'BS. Lê Minh Phúc', 'role' => 'doctor']);
        $post = Post::create([
            'user_id' => $user->id,
            'content' => 'Lịch tiêm phòng dại và chăm sóc mèo con mùa hè',
            'tags'    => ['Mèo', 'Vaccine'],
        ]);

        $response = $this->getJson('/api/v1/search?q=mèo');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertNotEmpty($response->json('data.posts'));
    }

    /**
     * PART C: Forum Posting with Optional Pets & IDOR Protection
     */
    public function test_owner_can_post_with_text_only_without_selecting_any_pet(): void
    {
        $user = User::factory()->create();

        $response = $this->withHeaders(['X-User-Id' => (string)$user->id])
            ->postJson('/api/v1/forum/posts', [
                'content' => 'Chào mọi người, em vừa tham gia diễn đàn PetCare AI!',
                'tags'    => ['Chia sẻ khoảnh khắc'],
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'content' => 'Chào mọi người, em vừa tham gia diễn đàn PetCare AI!',
                    'pet_name' => null,
                ],
            ]);
    }

    public function test_owner_can_tag_their_own_pet_in_forum_post(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::create([
            'user_id'  => $owner->id,
            'pet_name' => 'Bé Cún Miu',
            'species'  => 'dog',
            'breed'    => 'Poodle',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$owner->id])
            ->postJson('/api/v1/forum/posts', [
                'content' => 'Bé Cún Miu vừa đi dạo về rất ngoan!',
                'pet_ids' => [$pet->id],
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $postId = $response->json('data.id');
        $this->assertDatabaseHas('post_pets', [
            'post_id' => $postId,
            'pet_id'  => $pet->id,
        ]);
    }

    public function test_tagging_another_users_pet_is_forbidden_idor(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();

        $foreignPet = Pet::create([
            'user_id'  => $owner1->id,
            'pet_name' => 'Chó của Owner 1',
            'species'  => 'dog',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$owner2->id])
            ->postJson('/api/v1/forum/posts', [
                'content' => 'Cố tình tag thú cưng của người khác',
                'pet_ids' => [$foreignPet->id],
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Bạn không có quyền gắn thẻ thú cưng của người khác.',
            ]);
    }

    public function test_tagging_more_than_three_pets_is_rejected(): void
    {
        $owner = User::factory()->create();
        $pets = [];
        for ($i = 1; $i <= 4; $i++) {
            $pets[] = Pet::create([
                'user_id'  => $owner->id,
                'pet_name' => "Bé {$i}",
                'species'  => 'dog',
            ])->id;
        }

        $response = $this->withHeaders(['X-User-Id' => (string)$owner->id])
            ->postJson('/api/v1/forum/posts', [
                'content' => 'Tag 4 bé cùng lúc',
                'pet_ids' => $pets,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Chỉ có thể gắn thẻ tối đa 3 thú cưng trong một bài viết.',
            ]);
    }

    /**
     * PART B: Pet Management & Health Records
     */
    public function test_owner_can_create_and_manage_pet(): void
    {
        $owner = User::factory()->create();

        $response = $this->withHeaders(['X-User-Id' => (string)$owner->id])
            ->postJson('/api/v1/pets', [
                'pet_name' => 'Mèo Bơ',
                'species'  => 'cat',
                'breed'    => 'Munchkin',
                'age'      => 2,
                'weight'   => 3.5,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'pet_name' => 'Mèo Bơ',
                    'species'  => 'cat',
                    'breed'    => 'Munchkin',
                ],
            ]);

        $petId = $response->json('data.id');

        // Fetch Pet Detail
        $detailRes = $this->withHeaders(['X-User-Id' => (string)$owner->id])
            ->getJson("/api/v1/pets/{$petId}");

        $detailRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id'       => $petId,
                    'pet_name' => 'Mèo Bơ',
                ],
            ]);
    }

    public function test_public_qr_page_and_found_pet_reporting(): void
    {
        $owner = User::factory()->create(['name' => 'Chủ Nuôi Test', 'phone' => '0988776655']);
        $pet = Pet::create([
            'user_id'          => $owner->id,
            'pet_name'         => 'Bé Lucky',
            'species'          => 'dog',
            'breed'            => 'Corgi',
            'microchip_number' => '9851410999',
            'allergies'        => 'Dị ứng phấn hoa',
            'qr_token'         => uniqid('token_test_'),
            'qr_settings'      => [
                'show_photo'     => true,
                'show_name'      => true,
                'show_allergies' => true,
                'show_contact'   => true,
            ],
        ]);

        // Public QR Endpoint (no login / no auth header)
        $response = $this->getJson("/api/v1/pets/qr/{$pet->qr_token}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'pet_name'         => 'Bé Lucky',
                    'species'          => 'dog',
                    'microchip_number' => '9851410999',
                    'allergies'        => 'Dị ứng phấn hoa',
                ],
            ]);

        // Good Samaritan reports finding the pet
        $foundRes = $this->postJson("/api/v1/pets/qr/{$pet->qr_token}/found", [
            'finder_name'   => 'Người qua đường tốt bụng',
            'finder_phone'  => '0901234567',
            'location_text' => 'Công viên Thống Nhất',
            'notes'         => 'Bé đang ngồi ngoan uống nước',
        ]);

        $foundRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Đã gửi thông báo cứu hộ tới chủ nuôi của bé!',
            ]);
    }

    public function test_another_user_cannot_access_private_pet_endpoints(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();

        $pet = Pet::create([
            'user_id'  => $owner1->id,
            'pet_name' => 'Pet của Owner 1',
            'species'  => 'dog',
        ]);

        $response = $this->withHeaders(['X-User-Id' => (string)$owner2->id])
            ->getJson("/api/v1/pets/{$pet->id}");

        $response->assertStatus(404);
    }
}
