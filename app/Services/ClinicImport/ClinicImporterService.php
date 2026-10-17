<?php

namespace App\Services\ClinicImport;

use App\Models\Clinic;
use App\Models\ClinicHour;
use App\Models\ClinicImportRun;
use App\Models\ClinicImportTile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClinicImporterService
{
    /**
     * Run clinic import from specified source.
     *
     * @param string|ClinicSourceInterface $source 'osm', 'google', 'csv' or instance
     * @param array $options Options (mock, dry_run, file, city, limit, tiles)
     * @return array Summary of import run
     */
    public function import($source, array $options = []): array
    {
        $adapter = is_string($source) ? $this->resolveSource($source) : $source;
        $sourceName = $adapter->getSourceName();
        $isDryRun = !empty($options['dry_run']);

        // 1. Create or resume Import Run Record
        $run = null;
        if (!$isDryRun) {
            $run = ClinicImportRun::create([
                'source'       => $sourceName,
                'status'       => 'running',
                'metadata'     => $options,
                'started_at'   => now(),
            ]);
        }

        $stats = [
            'run_id'         => $run ? $run->id : null,
            'source'         => $sourceName,
            'total_fetched'  => 0,
            'total_inserted' => 0,
            'total_updated'  => 0,
            'total_skipped'  => 0,
            'errors'         => [],
        ];

        try {
            // Optional: Spatial tiling breakdown for large areas
            if (!empty($options['use_tiles']) && $run && !$isDryRun) {
                $this->createSpatialTiles($run, $options);
            }

            // 2. Fetch clinics from adapter
            $rawClinics = $adapter->fetchClinics($options);
            $limit = !empty($options['limit']) ? (int)$options['limit'] : count($rawClinics);
            $clinics = array_slice($rawClinics, 0, $limit);
            $stats['total_fetched'] = count($clinics);

            // 3. Process each clinic with deduping
            foreach ($clinics as $data) {
                $result = $this->processClinic($data, $isDryRun);
                if ($result === 'inserted') {
                    $stats['total_inserted']++;
                } elseif ($result === 'updated') {
                    $stats['total_updated']++;
                } else {
                    $stats['total_skipped']++;
                }
            }

            // 4. Finalize Run
            if ($run && !$isDryRun) {
                $run->update([
                    'status'         => 'completed',
                    'total_fetched'  => $stats['total_fetched'],
                    'total_inserted' => $stats['total_inserted'],
                    'total_updated'  => $stats['total_updated'],
                    'total_skipped'  => $stats['total_skipped'],
                    'completed_at'   => now(),
                ]);
            }
        } catch (\Throwable $e) {
            $stats['errors'][] = $e->getMessage();
            Log::error("Clinic import error [{$sourceName}]: " . $e->getMessage());

            if ($run && !$isDryRun) {
                $run->update([
                    'status'       => 'failed',
                    'error_log'    => $e->getMessage() . "\n" . $e->getTraceAsString(),
                    'completed_at' => now(),
                ]);
            }
        }

        return $stats;
    }

    /**
     * Process a single clinic: check phone match or distance + name similarity.
     */
    public function processClinic(array $data, bool $dryRun = false): string
    {
        $name = trim($data['name'] ?? '');
        $lat  = (float)($data['lat'] ?? 0);
        $lng  = (float)($data['lng'] ?? 0);
        $phone = $this->normalizePhone($data['hotline'] ?? $data['phone'] ?? '');

        if (empty($name) || ($lat == 0 && $lng == 0)) {
            return 'skipped';
        }

        // --- DEDUPING CHECK 1: Phone match ---
        $existing = null;
        if (!empty($phone) && strlen($phone) >= 8) {
            $existing = Clinic::whereRaw("REGEXP_REPLACE(hotline, '[^0-9]', '') = ?", [$phone])->first();
        }

        // --- DEDUPING CHECK 2: Spatial proximity (< 50m) + Name similarity (>= 80%) ---
        if (!$existing) {
            // Check clinics within ~0.005 degrees box first (~500m)
            $nearby = Clinic::whereBetween('lat', [$lat - 0.005, $lat + 0.005])
                ->whereBetween('lng', [$lng - 0.005, $lng + 0.005])
                ->get();

            foreach ($nearby as $candidate) {
                $distanceMeters = $this->calculateHaversineDistanceMeters($lat, $lng, $candidate->lat, $candidate->lng);
                if ($distanceMeters < 50) {
                    similar_text(mb_strtolower($name), mb_strtolower($candidate->name), $percent);
                    if ($percent >= 75) {
                        $existing = $candidate;
                        break;
                    }
                }
            }
        }

        if ($dryRun) {
            return $existing ? 'updated' : 'inserted';
        }

        if ($existing) {
            // Update existing clinic info (preserve existing reviews, members, created_by)
            $existing->update([
                'address'           => $existing->address ?: ($data['address'] ?? $existing->address),
                'city'              => $existing->city ?: ($data['city'] ?? $existing->city),
                'is_24h'            => $data['is_24h'] ?? $existing->is_24h,
                'accepts_emergency' => $data['accepts_emergency'] ?? $existing->accepts_emergency,
                'source'            => $data['source'] ?? $existing->source,
                'external_id'       => $data['external_id'] ?? $existing->external_id,
            ]);
            return 'updated';
        }

        // Insert new clinic
        $clinic = Clinic::create([
            'name'              => $name,
            'type'              => $data['type'] ?? 'clinic',
            'address'           => $data['address'] ?? "{$name}, " . ($data['city'] ?? 'Hà Nội'),
            'city'              => $data['city'] ?? 'Hà Nội',
            'lat'               => $lat,
            'lng'               => $lng,
            'hotline'           => $data['hotline'] ?? '1900 1234',
            'is_24h'            => (bool)($data['is_24h'] ?? false),
            'accepts_emergency' => (bool)($data['accepts_emergency'] ?? false),
            'rating'            => (float)($data['rating'] ?? 4.5),
            'review_count'      => (int)($data['review_count'] ?? 10),
            'status'            => 'approved',
            'source'            => $data['source'] ?? 'import',
            'external_id'       => $data['external_id'] ?? null,
        ]);

        // Default clinic hours
        for ($d = 0; $d <= 6; $d++) {
            ClinicHour::create([
                'clinic_id'   => $clinic->id,
                'day_of_week' => $d,
                'open_time'   => $clinic->is_24h ? '00:00:00' : '08:00:00',
                'close_time'  => $clinic->is_24h ? '23:59:59' : '20:30:00',
                'is_closed'   => false,
            ]);
        }

        return 'inserted';
    }

    /**
     * Resolve source adapter instance from string name.
     */
    public function resolveSource(string $source): ClinicSourceInterface
    {
        return match (strtolower($source)) {
            'osm', 'overpass' => new OsmOverpassSource(),
            'google', 'places' => new GooglePlacesSource(),
            'csv' => new CsvSource(),
            default => throw new \InvalidArgumentException("Unsupported source: {$source}"),
        };
    }

    /**
     * Haversine distance in meters between two lat/lng coordinates.
     */
    public function calculateHaversineDistanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }

    /**
     * Normalize phone numbers to stripped digits.
     */
    public function normalizePhone(string $phone): string
    {
        return preg_replace('/\D/', '', $phone);
    }

    /**
     * Create grid tiles for spatial division.
     */
    protected function createSpatialTiles(ClinicImportRun $run, array $options): void
    {
        // Hanoi bounding box default: lat 20.8 to 21.3, lng 105.6 to 106.0
        $minLat = $options['min_lat'] ?? 20.8;
        $maxLat = $options['max_lat'] ?? 21.3;
        $minLng = $options['min_lng'] ?? 105.6;
        $maxLng = $options['max_lng'] ?? 106.0;

        $step = 0.1; // ~11km tiles
        for ($lat = $minLat; $lat < $maxLat; $lat += $step) {
            for ($lng = $minLng; $lng < $maxLng; $lng += $step) {
                ClinicImportTile::create([
                    'run_id'  => $run->id,
                    'min_lat' => round($lat, 4),
                    'min_lng' => round($lng, 4),
                    'max_lat' => round($lat + $step, 4),
                    'max_lng' => round($lng + $step, 4),
                    'status'  => 'pending',
                ]);
            }
        }
    }
}
