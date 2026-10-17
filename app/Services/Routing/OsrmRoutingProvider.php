<?php

namespace App\Services\Routing;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OsrmRoutingProvider implements RoutingProviderInterface
{
    protected string $baseUrl;

    public function __construct(?string $baseUrl = null)
    {
        $this->baseUrl = rtrim($baseUrl ?: env('OSRM_BASE_URL', 'https://router.project-osrm.org'), '/');
    }

    public function calculateRoute(float $fromLat, float $fromLng, float $toLat, float $toLng, string $mode = 'driving'): array
    {
        $url = "{$this->baseUrl}/route/v1/driving/{$fromLng},{$fromLat};{$toLng},{$toLat}?overview=full&geometries=geojson&steps=true";

        try {
            $response = Http::timeout(4)->get($url);
            if ($response->successful()) {
                $json = $response->json();
                $route = $json['routes'][0] ?? null;

                if ($route && !empty($route['geometry']['coordinates'])) {
                    $steps = [];
                    $legs = $route['legs'][0] ?? null;
                    if ($legs && !empty($legs['steps'])) {
                        foreach ($legs['steps'] as $s) {
                            $type = $s['maneuver']['type'] ?? 'straight';
                            $modifier = $s['maneuver']['modifier'] ?? null;
                            $street = $s['name'] ?? '';
                            $dist = (int) round($s['distance'] ?? 0);
                            $dur = (int) round($s['duration'] ?? 0);
                            $loc = $s['maneuver']['location'] ?? [$fromLng, $fromLat]; // [lng, lat]

                            $instruction = RoutingService::formatManeuverVi($type, $modifier, $street, $dist);

                            $steps[] = [
                                'instruction' => $instruction,
                                'distance_m'  => $dist,
                                'duration_s'  => $dur,
                                'maneuver'    => $modifier ? "{$type}-{$modifier}" : $type,
                                'street_name' => $street,
                                'location'    => [$loc[1], $loc[0]], // convert to [lat, lng]
                            ];
                        }
                    }

                    return [
                        'geometry'   => $route['geometry'], // GeoJSON LineString [lng, lat]
                        'distance_m' => (int) round($route['distance']),
                        'duration_s' => (int) round($route['duration']),
                        'steps'      => $steps,
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning("OSRM Routing Provider offline: {$e->getMessage()}");
        }

        throw new \RuntimeException("Không thể kết nối dịch vụ định tuyến OSRM.");
    }
}
