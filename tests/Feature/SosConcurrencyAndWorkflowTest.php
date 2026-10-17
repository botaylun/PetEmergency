<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SosConcurrencyAndWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Đảm bảo có users mẫu
        if (!User::find(1)) {
            User::create([
                'id' => 1,
                'name' => 'Nguyễn Minh Anh',
                'email' => 'test_owner_1@example.com',
                'password' => bcrypt('secret123'),
                'role' => 'user',
                'phone' => '0912345678',
            ]);
        }

        if (!User::find(4)) {
            User::create([
                'id' => 4,
                'name' => 'BS. Phạm Thị Mai',
                'email' => 'test_doc_4@example.com',
                'password' => bcrypt('secret123'),
                'role' => 'doctor',
                'phone' => '0987654321',
                'specialty' => 'Cấp cứu thú y',
            ]);
        }

        if (!User::find(5)) {
            User::create([
                'id' => 5,
                'name' => 'BS. Trần Quốc Bảo',
                'email' => 'test_doc_5@example.com',
                'password' => bcrypt('secret123'),
                'role' => 'doctor',
                'phone' => '0977112233',
                'specialty' => 'Nội khoa thú y',
            ]);
        }
    }

    /**
     * Test 1: Chủ nuôi tạo ca cấp cứu SOS thành công
     */
    public function test_owner_can_create_sos(): void
    {
        $payload = [
            'lat'           => 21.0285,
            'lng'           => 105.8542,
            'symptom_tags'  => ['Khó thở', 'Co giật'],
            'notes'         => 'Cún thở dốc sau khi chạy bộ',
            'pet_name'      => 'Cún Lu',
            'pet_breed'     => 'Golden Retriever',
            'urgency_level' => 'critical',
        ];

        $response = $this->withHeaders(['X-User-Id' => '1'])
            ->postJson('/api/v1/emergency/sos', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'status'  => 'finding',
            ]);

        $emergencyId = $response->json('emergency_id');
        $this->assertDatabaseHas('emergency_requests', [
            'id'       => $emergencyId,
            'user_id'  => 1,
            'status'   => 'finding',
            'pet_name' => 'Cún Lu',
        ]);
    }

    /**
     * Test 2: Bác sĩ xem danh sách các ca chờ nhận
     */
    public function test_doctor_can_view_pending_sos(): void
    {
        $id = DB::table('emergency_requests')->insertGetId([
            'user_id'       => 1,
            'pet_name'      => 'Mèo Bơ',
            'sos_latitude'  => 21.0285,
            'sos_longitude' => 105.8542,
            'status'        => 'finding',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $response = $this->withHeaders(['X-User-Id' => '4'])
            ->getJson('/api/v1/emergency/pending');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $items = collect($response->json('data'));
        $found = $items->firstWhere('id', $id);
        $this->assertNotNull($found, 'Ca SOS mới tạo phải xuất hiện trong feed bác sĩ.');
    }

    /**
     * Test 3: Concurrency Race Condition — 2 bác sĩ cùng nhận 1 ca SOS
     * Bác sĩ A nhận thành công, Bác sĩ B nhận sau phải nhận HTTP 409 Conflict.
     */
    public function test_race_condition_second_doctor_gets_conflict(): void
    {
        $emergencyId = DB::table('emergency_requests')->insertGetId([
            'user_id'       => 1,
            'pet_name'      => 'Cún Đốm',
            'sos_latitude'  => 21.0300,
            'sos_longitude' => 105.8500,
            'status'        => 'finding',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // Bác sĩ A (ID: 4) nhận ca trước
        $responseA = $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/emergency/accept/{$emergencyId}");

        $responseA->assertStatus(200)
            ->assertJson(['success' => true]);

        // Bác sĩ B (ID: 5) nhận ca ngay sau đó -> Phải bị từ chối 409 Conflict
        $responseB = $this->withHeaders(['X-User-Id' => '5'])
            ->postJson("/api/v1/emergency/accept/{$emergencyId}");

        $responseB->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Ca này đã được bác sĩ khác tiếp nhận.',
            ]);

        // Kiểm tra trong DB: Ca thuộc về Bác sĩ A, không bị ghi đè
        $record = DB::table('emergency_requests')->find($emergencyId);
        $this->assertEquals(4, $record->doctor_id);
        $this->assertEquals('accepted', $record->status);
    }

    /**
     * Test 4: Toàn bộ State Machine của Bác sĩ (accepted -> en_route -> arrived -> treating -> complete)
     */
    public function test_doctor_full_state_machine_and_medical_report(): void
    {
        $emergencyId = DB::table('emergency_requests')->insertGetId([
            'user_id'       => 1,
            'pet_name'      => 'Bé Samoyed',
            'sos_latitude'  => 21.0300,
            'sos_longitude' => 105.8500,
            'status'        => 'finding',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // 1. Accept
        $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/emergency/accept/{$emergencyId}")
            ->assertStatus(200);

        // 2. En Route
        $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/emergency/sos/{$emergencyId}/status", ['status' => 'en_route'])
            ->assertStatus(200)
            ->assertJson(['status' => 'en_route']);

        // 3. Arrived
        $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/emergency/sos/{$emergencyId}/status", ['status' => 'arrived'])
            ->assertStatus(200)
            ->assertJson(['status' => 'arrived']);

        // 4. Treating
        $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/emergency/sos/{$emergencyId}/status", ['status' => 'treating'])
            ->assertStatus(200)
            ->assertJson(['status' => 'treating']);

        // 5. Complete with Report
        $reportPayload = [
            'diagnosis'         => 'Hạ đường huyết sau vận động nặng',
            'treatment_summary' => 'Tiêm truyền glucose 5%, trợ tim nhẹ',
            'follow_up_advice'  => 'Nghỉ ngơi 24h, bổ sung dinh dưỡng',
            'prescription'      => 'Viên điện giải x 3 ngày',
        ];

        $this->withHeaders(['X-User-Id' => '4'])
            ->postJson("/api/v1/emergency/complete/{$emergencyId}", $reportPayload)
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        // Kiểm tra trong DB: Ca đã completed và có bản ghi trong sos_reports
        $record = DB::table('emergency_requests')->find($emergencyId);
        $this->assertEquals('completed', $record->status);
        $this->assertNotNull($record->completed_at);

        $this->assertDatabaseHas('sos_reports', [
            'emergency_request_id' => $emergencyId,
            'doctor_id'            => 4,
            'diagnosis'            => 'Hạ đường huyết sau vận động nặng',
        ]);
    }
}
