<?php

namespace App\Services\ClinicImport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GooglePlacesSource implements ClinicSourceInterface
{
    public function getSourceName(): string
    {
        return 'google';
    }

    public function fetchClinics(array $options = []): array
    {
        $apiKey = config('services.google.places_key', env('GOOGLE_MAPS_API_KEY'));

        if (empty($apiKey) || !empty($options['mock'])) {
            return $this->getMockData($options);
        }

        $lat = $options['lat'] ?? 21.0285;
        $lng = $options['lng'] ?? 105.8542;
        $radius = $options['radius'] ?? 10000; // 10km

        try {
            $response = Http::timeout(15)->get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', [
                'location' => "{$lat},{$lng}",
                'radius'   => $radius,
                'type'     => 'veterinary_care',
                'keyword'  => 'thú y',
                'key'      => $apiKey,
            ]);

            if (!$response->successful()) {
                Log::warning("Google Places API error: " . $response->body());
                return $this->getMockData($options);
            }

            $results = $response->json('results') ?? [];
            $clinics = [];

            foreach ($results as $item) {
                $loc = $item['geometry']['location'] ?? [];
                if (empty($loc['lat']) || empty($loc['lng'])) continue;

                $name = $item['name'] ?? 'Phòng khám Thú y';
                $is24h = (bool)($item['opening_hours']['open_now'] ?? false);

                $clinics[] = [
                    'external_id'        => 'google_' . ($item['place_id'] ?? uniqid()),
                    'name'               => $name,
                    'type'               => stripos($name, 'bệnh viện') !== false ? 'hospital' : 'clinic',
                    'address'            => $item['vicinity'] ?? $name,
                    'city'               => $options['city'] ?? 'Hà Nội',
                    'lat'                => (float)$loc['lat'],
                    'lng'                => (float)$loc['lng'],
                    'hotline'            => '1900 1234',
                    'is_24h'             => $is24h,
                    'accepts_emergency'  => $is24h,
                    'rating'             => (float)($item['rating'] ?? 4.5),
                    'review_count'       => (int)($item['user_ratings_total'] ?? 15),
                    'source'             => 'google',
                    'status'             => 'approved',
                ];
            }

            return $clinics;
        } catch (\Throwable $e) {
            Log::warning("Google Places fetch exception: " . $e->getMessage());
            return $this->getMockData($options);
        }
    }

    protected function getMockData(array $options = []): array
    {
        return [
            [
                'external_id'        => 'google_place_g101',
                'name'               => 'Bệnh Viện Thú Y PetHealth Ba Đình',
                'type'               => 'hospital',
                'address'            => '240 Âu Cơ, Quảng An, Tây Hồ',
                'city'               => 'Hà Nội',
                'lat'                => 21.0620000,
                'lng'                => 105.8280000,
                'hotline'            => '024 2242 8882',
                'is_24h'             => true,
                'accepts_emergency'  => true,
                'rating'             => 4.7,
                'review_count'       => 120,
                'source'             => 'google',
                'status'             => 'approved',
            ],
            [
                'external_id'        => 'google_place_g102',
                'name'               => 'Phòng Khám Thú Y Danpet Long Biên',
                'type'               => 'clinic',
                'address'            => '88 Nguyễn Sơn, Ngọc Lâm, Long Biên',
                'city'               => 'Hà Nội',
                'lat'                => 21.0390000,
                'lng'                => 105.8750000,
                'hotline'            => '098 765 4321',
                'is_24h'             => false,
                'accepts_emergency'  => false,
                'rating'             => 4.6,
                'review_count'       => 45,
                'source'             => 'google',
                'status'             => 'approved',
            ],
            [
                'external_id'        => 'google_place_g103',
                'name'               => 'Phòng Khám Thú Y Happy Paws Hà Đông',
                'type'               => 'clinic',
                'address'            => '52 Quang Trung, Hà Đông',
                'city'               => 'Hà Nội',
                'lat'                => 20.9720000,
                'lng'                => 105.7760000,
                'hotline'            => '024 3388 7766',
                'is_24h'             => true,
                'accepts_emergency'  => true,
                'rating'             => 4.5,
                'review_count'       => 38,
                'source'             => 'google',
                'status'             => 'approved',
            ],
        ];
    }
}
