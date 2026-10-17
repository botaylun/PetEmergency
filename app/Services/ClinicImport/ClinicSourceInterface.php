<?php

namespace App\Services\ClinicImport;

interface ClinicSourceInterface
{
    /**
     * Fetch standardized clinic records from source.
     *
     * @param array $options Options like ['city' => ..., 'bbox' => ..., 'limit' => ..., 'mock' => bool, 'file' => ...]
     * @return array Array of normalized clinic data maps
     */
    public function fetchClinics(array $options = []): array;

    /**
     * Unique source identifier (osm, google, csv).
     */
    public function getSourceName(): string;
}
