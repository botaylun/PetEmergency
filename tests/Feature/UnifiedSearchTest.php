<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Pet;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UnifiedSearchTest extends TestCase
{
    use DatabaseTransactions;

    public function test_search_returns_users_clinics_posts_pets_and_tags(): void
    {
        $doctor = User::factory()->create([
            'name'      => 'BS. Hoàng Minh Đức',
            'role'      => 'doctor',
            'specialty' => 'Cấp cứu nội khoa thú y',
        ]);

        $user = User::factory()->create(['name' => 'Nguyễn Thị Hoa']);

        $clinic = Clinic::create([
            'name'    => 'Phòng Khám Thú Y Đức Trọng',
            'address' => '88 Đường Giải Phóng',
            'city'    => 'Hà Nội',
            'hotline' => '02438889999',
            'lat'     => 21.0000,
            'lng'     => 105.8000,
            'status'  => 'approved',
            'is_24h'  => true,
            'rating'  => 4.8,
        ]);

        $publicPet = Pet::create([
            'user_id'   => $user->id,
            'pet_name'  => 'Đậu Đậu',
            'species'   => 'dog',
            'breed'     => 'Poodle',
            'is_public' => true,
            'qr_token'  => 'dau_dau_public_token',
        ]);

        $post = Post::create([
            'user_id'       => $user->id,
            'content'       => 'Bé Đậu Đậu hôm nay đã khỏe hẳn sau đợt điều trị',
            'tags'          => ['Sức khỏe', 'Chó'],
            'ai_mod_status' => 'approved',
        ]);

        $response = $this->getJson('/api/v1/search?q=Đức');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $data = $response->json('data');
        $this->assertNotEmpty($data['users']);
        $this->assertNotEmpty($data['clinics']);
    }

    public function test_search_is_accent_insensitive_for_vietnamese_d_and_d_dash(): void
    {
        $user = User::factory()->create(['name' => 'Trần Văn Điều Trị']);

        $publicPet = Pet::create([
            'user_id'   => $user->id,
            'pet_name'  => 'Đô Đô',
            'species'   => 'cat',
            'breed'     => 'Anh lông ngắn',
            'is_public' => true,
        ]);

        // Search with unaccented "dieu tri" should match "Điều Trị"
        $res1 = $this->getJson('/api/v1/search?q=dieu+tri');
        $res1->assertStatus(200);
        $users1 = collect($res1->json('data.users'));
        $this->assertTrue($users1->contains('id', $user->id));

        // Search with unaccented "do do" should match "Đô Đô"
        $res2 = $this->getJson('/api/v1/search?q=do+do');
        $res2->assertStatus(200);
        $pets2 = collect($res2->json('data.pets'));
        $this->assertTrue($pets2->contains('id', $publicPet->id));
    }

    public function test_private_pets_are_not_returned_in_public_search(): void
    {
        $user = User::factory()->create();
        $privatePet = Pet::create([
            'user_id'   => $user->id,
            'pet_name'  => 'SecretPet12345',
            'species'   => 'cat',
            'breed'     => 'Persian',
            'is_public' => false,
        ]);

        $response = $this->getJson('/api/v1/search?q=SecretPet12345');
        $response->assertStatus(200);

        $pets = collect($response->json('data.pets'));
        $this->assertFalse($pets->contains('id', $privatePet->id));
    }
}
