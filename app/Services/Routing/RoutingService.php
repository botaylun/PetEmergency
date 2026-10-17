<?php

namespace App\Services\Routing;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RoutingService
{
    protected RoutingProviderInterface $provider;

    public function __construct(?RoutingProviderInterface $provider = null)
    {
        if ($provider) {
            $this->provider = $provider;
            return;
        }

        $driver = env('ROUTING_PROVIDER', 'osrm');

        if ($driver === 'mock') {
            $this->provider = new MockRoutingProvider();
        } else {
            $this->provider = new OsrmRoutingProvider();
        }
    }

    /**
     * Get route with 30s cache by rounded coordinates.
     */
    public function getRoute(float $fromLat, float $fromLng, float $toLat, float $toLng, string $mode = 'driving'): array
    {
        // Round coordinates to ~100m for caching
        $rFromLat = round($fromLat, 3);
        $rFromLng = round($fromLng, 3);
        $rToLat   = round($toLat, 3);
        $rToLng   = round($toLng, 3);

        $cacheKey = "route_{$rFromLat}_{$rFromLng}_{$rToLat}_{$rToLng}_{$mode}";

        return Cache::remember($cacheKey, 30, function () use ($fromLat, $fromLng, $toLat, $toLng, $mode) {
            try {
                $route = $this->provider->calculateRoute($fromLat, $fromLng, $toLat, $toLng, $mode);
            } catch (\Throwable $e) {
                Log::warning("Primary routing provider failed, using mock fallback: {$e->getMessage()}");
                $fallback = new MockRoutingProvider();
                $route = $fallback->calculateRoute($fromLat, $fromLng, $toLat, $toLng, $mode);
            }

            // Append human-friendly distance and duration texts
            $route['distance_txt'] = self::formatDistance($route['distance_m']);
            $route['duration_txt'] = self::formatDuration($route['duration_s']);

            return $route;
        });
    }

    /**
     * Translate maneuver and modifier into natural Vietnamese instruction.
     */
    public static function formatManeuverVi(string $type, ?string $modifier, ?string $street, int $distanceM = 0): string
    {
        $streetText = $street ? " vào đường {$street}" : "";
        $distText   = $distanceM > 0 ? " ({$distanceM} m)" : "";

        switch ($type) {
            case 'depart':
                return "Bắt đầu xuất phát" . ($street ? " trên đường {$street}" : "");

            case 'arrive':
                return "Bạn đã đến nơi hiện trường cấp cứu!";

            case 'turn':
                if ($modifier === 'left')        return "Rẽ trái" . $streetText . $distText;
                if ($modifier === 'right')       return "Rẽ phải" . $streetText . $distText;
                if ($modifier === 'slight left')  return "Chếch sang trái" . $streetText . $distText;
                if ($modifier === 'slight right') return "Chếch sang phải" . $streetText . $distText;
                if ($modifier === 'sharp left')  return "Rẽ gắt sang trái" . $streetText . $distText;
                if ($modifier === 'sharp right') return "Rẽ gắt sang phải" . $streetText . $distText;
                if ($modifier === 'uturn')       return "Quay đầu xe" . $streetText;
                return "Chuyển hướng" . $streetText;

            case 'roundabout':
            case 'rotary':
                return "Vào vòng xuyến" . ($modifier ? ", rẽ theo lối {$modifier}" : "") . $streetText;

            case 'fork':
                return ($modifier === 'left' ? "Đi nhánh bên trái" : "Đi nhánh bên phải") . $streetText;

            case 'merge':
                return "Nhập làn" . $streetText;

            case 'end of road':
                return "Đi đến cuối đường, " . ($modifier === 'left' ? "rẽ trái" : "rẽ phải") . $streetText;

            case 'new name':
            case 'continue':
            default:
                if ($distanceM > 0) {
                    return "Đi thẳng {$distanceM} m" . ($street ? " trên {$street}" : "");
                }
                return "Tiếp tục di chuyển" . ($street ? " trên {$street}" : "");
        }
    }

    /**
     * Blur / Fuzz coordinates by approximate radius (~500m) for privacy before case acceptance.
     */
    public static function fuzzCoordinates(float $lat, float $lng, float $radiusMeters = 500.0): array
    {
        // Seed pseudo-random with integer coordinate hash for stability
        $seed = (int) round(($lat + $lng) * 1000);
        srand($seed);

        $angle = (rand(0, 360) * M_PI) / 180.0;
        $distance = rand(250, (int) $radiusMeters);

        // 1 deg latitude ~ 111,111 meters
        $deltaLat = ($distance * cos($angle)) / 111111.0;
        $deltaLng = ($distance * sin($angle)) / (111111.0 * cos(deg2rad($lat)));

        return [
            'lat' => round($lat + $deltaLat, 5),
            'lng' => round($lng + $deltaLng, 5),
            'approximate_radius_m' => (int) $radiusMeters,
        ];
    }

    public static function formatDistance(int $meters): string
    {
        if ($meters < 1000) return "{$meters} m";
        return round($meters / 1000, 1) . ' km';
    }

    public static function formatDuration(int $seconds): string
    {
        if ($seconds < 60) return "Dưới 1 phút";
        $minutes = (int) round($seconds / 60);
        if ($minutes < 60) return "{$minutes} phút";
        $hours = (int) floor($minutes / 60);
        $rem = $minutes % 60;
        return $rem > 0 ? "{$hours} giờ {$rem} phút" : "{$hours} giờ";
    }
}
