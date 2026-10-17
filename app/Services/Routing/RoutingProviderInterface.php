<?php

namespace App\Services\Routing;

interface RoutingProviderInterface
{
    /**
     * Calculate route from origin to destination coordinates.
     *
     * @param float $fromLat
     * @param float $fromLng
     * @param float $toLat
     * @param float $toLng
     * @param string $mode 'driving' | 'motorbike'
     * @return array Standardized route structure:
     *   [
     *     'geometry'     => ['type' => 'LineString', 'coordinates' => [[lng, lat], ...]],
     *     'distance_m'   => int,
     *     'duration_s'   => int,
     *     'steps'        => [
     *         [
     *             'instruction' => string, // Vietnamese instruction
     *             'distance_m'  => int,
     *             'duration_s'  => int,
     *             'maneuver'    => string, // e.g. turn-left, turn-right, straight, arrive
     *             'street_name' => string,
     *             'location'    => [lat, lng],
     *         ],
     *         ...
     *     ],
     *   ]
     */
    public function calculateRoute(float $fromLat, float $fromLng, float $toLat, float $toLng, string $mode = 'driving'): array;
}
