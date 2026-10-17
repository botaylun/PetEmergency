<?php

namespace App\Services\ClinicImport;

use Illuminate\Support\Facades\File;

class CsvSource implements ClinicSourceInterface
{
    public function getSourceName(): string
    {
        return 'csv';
    }

    public function fetchClinics(array $options = []): array
    {
        $filePath = $options['file'] ?? null;

        if (!$filePath || !File::exists($filePath)) {
            return $this->getMockData($options);
        }

        $clinics = [];
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return [];
        }

        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return [];
        }

        // Normalize header keys: trim and lowercase
        $headers = array_map(fn($h) => strtolower(trim($h)), $headers);

        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($headers)) continue;

            $record = array_combine($headers, $row);
            $name = trim($record['name'] ?? '');
            if (empty($name)) continue;

            $lat = (float)($record['lat'] ?? $record['latitude'] ?? 0);
            $lng = (float)($record['lng'] ?? $record['longitude'] ?? 0);

            // Validate lat/lng coordinates
            if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0 && $lng == 0)) {
                continue;
            }

            $is24h = filter_var($record['is_24h'] ?? false, FILTER_VALIDATE_BOOLEAN) ||
                     stripos($record['is_24h'] ?? '', '1') !== false ||
                     stripos($record['is_24h'] ?? '', 'true') !== false;

            $clinics[] = [
                'external_id'        => 'csv_' . md5($name . $lat . $lng),
                'name'               => $name,
                'type'               => $record['type'] ?? (stripos($name, 'bệnh viện') !== false ? 'hospital' : 'clinic'),
                'address'            => trim($record['address'] ?? "{$name}, " . ($record['city'] ?? 'Hà Nội')),
                'city'               => trim($record['city'] ?? 'Hà Nội'),
                'lat'                => $lat,
                'lng'                => $lng,
                'hotline'            => trim($record['hotline'] ?? $record['phone'] ?? '1900 1234'),
                'is_24h'             => $is24h,
                'accepts_emergency'  => $is24h,
                'rating'             => (float)($record['rating'] ?? 4.5),
                'review_count'       => (int)($record['review_count'] ?? 10),
                'source'             => 'csv',
                'status'             => 'approved',
            ];
        }

        fclose($handle);
        return $clinics;
    }

    protected function getMockData(array $options = []): array
    {
        return [
            [
                'external_id'        => 'csv_import_c1',
                'name'               => 'Trung Tâm Thú Y Hoàng Hoa Thám',
                'type'               => 'clinic',
                'address'            => '189 Hoàng Hoa Thám, Ba Đình',
                'city'               => 'Hà Nội',
                'lat'                => 21.0410000,
                'lng'                => 105.8190000,
                'hotline'            => '024 3845 2233',
                'is_24h'             => true,
                'accepts_emergency'  => true,
                'rating'             => 4.6,
                'review_count'       => 35,
                'source'             => 'csv',
                'status'             => 'approved',
            ],
            [
                'external_id'        => 'csv_import_c2',
                'name'               => 'Phòng Khám Thú Y Gia Lâm 24h',
                'type'               => 'clinic',
                'address'            => '45 Ngô Xuân Quảng, Gia Lâm',
                'city'               => 'Hà Nội',
                'lat'                => 21.0060000,
                'lng'                => 105.9320000,
                'hotline'            => '024 3876 1122',
                'is_24h'             => true,
                'accepts_emergency'  => true,
                'rating'             => 4.4,
                'review_count'       => 22,
                'source'             => 'csv',
                'status'             => 'approved',
            ],
        ];
    }
}
