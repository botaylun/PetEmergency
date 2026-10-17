<?php

namespace App\Services\Routing;

class MockRoutingProvider implements RoutingProviderInterface
{
    public function calculateRoute(float $fromLat, float $fromLng, float $toLat, float $toLng, string $mode = 'driving'): array
    {
        // 1. Calculate haversine distance
        $theta = $fromLng - $toLng;
        $dist = sin(deg2rad($fromLat)) * sin(deg2rad($toLat)) + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * cos(deg2rad($theta));
        $dist = acos(max(-1.0, min(1.0, $dist)));
        $dist = rad2deg($dist);
        $meters = (int) round($dist * 60 * 1.1515 * 1609.344 * 1.25); // 1.25 winding road coefficient
        if ($meters < 200) $meters = 200;

        // 2. Duration at ~30 km/h urban speed (approx 8.3 m/s)
        $speedMps = $mode === 'motorbike' ? 9.5 : 8.0;
        $seconds = (int) round($meters / $speedMps);

        // 3. Generate waypoints between from and to with slight street bends
        $numSteps = 6;
        $coordinates = [];
        $steps = [];

        // Street names for realistic Vietnamese demo
        $streetNames = ['Trần Hưng Đạo', 'Phố Huế', 'Hai Bà Trưng', 'Lý Thường Kiệt', 'Hàng Bài', 'Tràng Tiền'];

        for ($i = 0; $i <= $numSteps; $i++) {
            $ratio = $i / $numSteps;
            // Add a small perpendicular offset to mimic street blocks
            $jitter = ($i > 0 && $i < $numSteps) ? sin($ratio * M_PI) * 0.0018 : 0;
            $ptLat = $fromLat + ($toLat - $fromLat) * $ratio + $jitter;
            $ptLng = $fromLng + ($toLng - $fromLng) * $ratio + ($jitter * 0.7);

            $coordinates[] = [round($ptLng, 6), round($ptLat, 6)]; // GeoJSON [lng, lat]
        }

        $stepDist = (int) round($meters / $numSteps);
        $stepDur = (int) round($seconds / $numSteps);

        for ($i = 0; $i < $numSteps; $i++) {
            $street = $streetNames[$i % count($streetNames)];
            $loc = [$coordinates[$i][1], $coordinates[$i][0]]; // [lat, lng]

            if ($i === 0) {
                $maneuver = 'depart';
                $instruction = "Bắt đầu xuất phát từ vị trí hiện tại, đi về hướng đường {$street}";
            } elseif ($i === $numSteps - 1) {
                $maneuver = 'arrive';
                $instruction = "Bạn đã đến nơi hiện trường cấp cứu!";
            } elseif ($i % 2 === 1) {
                $maneuver = 'turn-right';
                $instruction = "Rẽ phải vào đường {$street}, đi thẳng {$stepDist} m";
            } else {
                $maneuver = 'turn-left';
                $instruction = "Rẽ trái vào đường {$street}, đi thẳng {$stepDist} m";
            }

            $steps[] = [
                'instruction' => $instruction,
                'distance_m'  => $stepDist,
                'duration_s'  => $stepDur,
                'maneuver'    => $maneuver,
                'street_name' => $street,
                'location'    => $loc,
            ];
        }

        return [
            'geometry' => [
                'type'        => 'LineString',
                'coordinates' => $coordinates,
            ],
            'distance_m' => $meters,
            'duration_s' => $seconds,
            'steps'      => $steps,
        ];
    }
}
