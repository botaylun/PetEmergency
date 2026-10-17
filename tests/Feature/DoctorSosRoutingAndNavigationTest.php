<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Routing\MockRoutingProvider;
use App\Services\Routing\RoutingService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DoctorSosRoutingAndNavigationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!User::find(1)) {
            User::create([
                'id' => 1,
                'name' => 'Nguyễn Minh Anh',
                'email' => 'test_owner_1@example.com',
                'password' => bcrypt('secret123'),
                'role' => 'user',
            ]);
        }

        if (!User::find(4)) {
            User::create([
                'id' => 4,
                'name' => 'BS. Phạm Thị Mai',
                'email' => 'test_doc_4@example.com',
                'password' => bcrypt('secret123'),
                'role' => 'doctor',
                'latitude' => 21.0285,
                'longitude' => 105.8542,
            ]);
        }
    }

    /**
     * Test 1: formatManeuverVi maps maneuvers to natural Vietnamese
     */
    public function test_format_maneuver_vietnamese_mapping(): void
    {
        $turnLeft = RoutingService::formatManeuverVi('turn', 'left', 'Hai Bà Trưng', 200);
        $this->assertStringContainsString('Rẽ trái', $turnLeft);
        $this->assertStringContainsString('Hai Bà Trưng', $turnLeft);
        $this->assertStringContainsString('200 m', $turnLeft);

        $turnRight = RoutingService::formatManeuverVi('turn', 'right', 'Trần Hưng Đạo', 150);
        $this->assertStringContainsString('Rẽ phải', $turnRight);
        $this->assertStringContainsString('Trần Hưng Đạo', $turnRight);

        $roundabout = RoutingService::formatManeuverVi('roundabout', '2', 'Quảng Trường');
        $this->assertStringContainsStringIgnoringCase('vòng xuyến', $roundabout);

        $arrive = RoutingService::formatManeuverVi('arrive', null, '');
        $this->assertStringContainsString('Bạn đã đến nơi', $arrive);
    }

    /**
     * Test 2: MockRoutingProvider returns valid GeoJSON LineString and steps
     */
    public function test_mock_routing_provider_returns_valid_structure(): void
    {
        $provider = new MockRoutingProvider();
        $route = $provider->calculateRoute(21.0285, 105.8542, 21.0350, 105.8600, 'driving');

        $this->assertArrayHasKey('geometry', $route);
        $this->assertEquals('LineString', $route['geometry']['type']);
        $this->assertNotEmpty($route['geometry']['coordinates']);
        $this->assertGreaterThan(0, $route['distance_m']);
        $this->assertGreaterThan(0, $route['duration_s']);
        $this->assertNotEmpty($route['steps']);
    }

    /**
     * Test 3: Route endpoint authorization & privacy protection before accept
     */
    public function test_route_endpoint_privacy_fuzzing_before_accept(): void
    {
        $emergencyId = DB::table('emergency_requests')->insertGetId([
            'user_id'       => 1,
            'pet_name'      => 'Cún Lu',
            'sos_latitude'  => 21.0350,
            'sos_longitude' => 105.8600,
            'status'        => 'finding',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // Non-doctor gets 403 Forbidden
        $responseUser = $this->withHeaders(['X-User-Id' => '1'])
            ->getJson("/api/v1/emergency/{$emergencyId}/route");
        $responseUser->assertStatus(403);

        // Doctor gets 200 with approximate target (is_approximate = true, radius ~500m)
        $responseDoc = $this->withHeaders(['X-User-Id' => '4'])
            ->getJson("/api/v1/emergency/{$emergencyId}/route?from_lat=21.0285&from_lng=105.8542");

        $responseDoc->assertStatus(200)
            ->assertJson([
                'success'        => true,
                'is_accepted'    => false,
                'is_approximate' => true,
            ]);

        $dest = $responseDoc->json('destination');
        $this->assertEquals(500, $dest['approximate_radius_m']);
        $this->assertNotEmpty($responseDoc->json('steps'));
    }

    /**
     * Test 4: Route endpoint returns exact coordinates after doctor accepts
     */
    public function test_route_endpoint_exact_pin_after_accept(): void
    {
        $emergencyId = DB::table('emergency_requests')->insertGetId([
            'user_id'       => 1,
            'doctor_id'     => 4,
            'pet_name'      => 'Cún Lu',
            'sos_latitude'  => 21.0350,
            'sos_longitude' => 105.8600,
            'status'        => 'accepted',
            'accepted_at'   => now(),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $responseDoc = $this->withHeaders(['X-User-Id' => '4'])
            ->getJson("/api/v1/emergency/{$emergencyId}/route?from_lat=21.0285&from_lng=105.8542");

        $responseDoc->assertStatus(200)
            ->assertJson([
                'success'        => true,
                'is_accepted'    => true,
                'is_approximate' => false,
            ]);

        $dest = $responseDoc->json('destination');
        $this->assertEquals(0, $dest['approximate_radius_m']);
        $this->assertEquals(21.0350, $dest['lat']);
        $this->assertEquals(105.8600, $dest['lng']);
    }
}
