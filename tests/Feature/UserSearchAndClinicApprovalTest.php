<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserSearchAndClinicApprovalTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Ensure admin user exists
        if (!User::where('role', 'admin')->first()) {
            User::create([
                'name'     => 'Quản Trị Viên',
                'email'    => 'admin@petcare.vn',
                'password' => bcrypt('admin123'),
                'role'     => 'admin',
            ]);
        }

        // Ensure doctor user exists
        if (!User::find(4)) {
            User::create([
                'id'                  => 4,
                'name'                => 'BS. Phạm Thị Mai',
                'email'               => 'test_doc_4@example.com',
                'password'            => bcrypt('secret123'),
                'role'                => 'doctor',
                'verification_status' => 'verified',
                'latitude'            => 21.0285,
                'longitude'           => 105.8542,
            ]);
        }
    }

    /**
     * Test 1: User search by keyword and filter by role.
     */
    public function test_user_search_by_keyword_and_role(): void
    {
        $response = $this->getJson('/api/v1/users/search?role=doctor&q=Mai');
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals('doctor', $data[0]['role']);
        $this->assertStringContainsString('Mai', $data[0]['name']);
    }

    /**
     * Test 2: Public profile returns doctor details and clinic affiliations.
     */
    public function test_public_profile_returns_doctor_details(): void
    {
        $response = $this->getJson('/api/v1/users/4');
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data'    => [
                'id'   => 4,
                'name' => 'BS. Phạm Thị Mai',
                'role' => 'doctor',
            ],
        ]);

        $data = $response->json('data');
        $this->assertArrayHasKey('clinics', $data);
        $this->assertArrayHasKey('recent_posts', $data);
        $this->assertArrayHasKey('pets', $data);
    }

    /**
     * Test 3: Doctor submits clinic, admin approves it.
     */
    public function test_doctor_clinic_create_submit_and_admin_approve_flow(): void
    {
        $admin = User::where('role', 'admin')->first();
        $uniqueHotline = '090' . rand(1000000, 9999999);

        // Clean up previous run if any
        Clinic::where('name', 'LIKE', 'Phòng Khám Test Tự Động%')->delete();

        // 1. Doctor creates draft clinic
        $createRes = $this->withHeaders(['X-User-Id' => '4'])
            ->postJson('/api/v1/doctor/clinics', [
                'name'              => 'Phòng Khám Test Tự Động Round 2',
                'type'              => 'clinic',
                'address'           => '123 Phố Huế, Hà Nội',
                'city'              => 'Hà Nội',
                'lat'               => 21.0150,
                'lng'               => 105.8520,
                'hotline'           => $uniqueHotline,
                'is_24h'            => true,
                'accepts_emergency' => true,
            ]);

        $createRes->assertStatus(201);
        $clinicId = $createRes->json('data.id');
        $this->assertNotNull($clinicId);

        // 2. Doctor submits clinic for review
        $submitRes = $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/doctor/clinics/{$clinicId}/submit");
        $submitRes->assertStatus(200);
        $this->assertEquals('pending_review', $submitRes->json('data.status'));

        // 3. Admin lists pending clinics
        $adminListRes = $this->withHeaders(['X-User-Id' => (string)$admin->id])
            ->getJson('/api/v1/admin/clinics?status=pending_review');
        $adminListRes->assertStatus(200);
        $this->assertTrue(collect($adminListRes->json('data.data'))->contains('id', $clinicId));

        // 4. Admin approves clinic
        $approveRes = $this->withHeaders(['X-User-Id' => (string)$admin->id])
            ->postJson("/api/v1/admin/clinics/{$clinicId}/approve");
        $approveRes->assertStatus(200);
        $this->assertEquals('approved', $approveRes->json('data.status'));

        // 5. Clinic is now visible on public Vet Map
        $publicListRes = $this->getJson('/api/v1/clinics?per_page=100');
        $publicListRes->assertStatus(200);
        $this->assertTrue(collect($publicListRes->json('data.data'))->contains('id', $clinicId));

        // Cleanup
        Clinic::destroy($clinicId);
    }
}
