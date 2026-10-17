<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicImportRun;
use App\Services\ClinicImport\ClinicImporterService;
use App\Services\ClinicImport\CsvSource;
use App\Services\ClinicImport\GooglePlacesSource;
use App\Services\ClinicImport\OsmOverpassSource;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ClinicImportTest extends TestCase
{
    use DatabaseTransactions;

    public function test_osm_source_import_and_run_record(): void
    {
        $importer = new ClinicImporterService();
        $result = $importer->import('osm', ['mock' => true]);

        $this->assertEquals('osm', $result['source']);
        $this->assertGreaterThan(0, $result['total_fetched']);
        $this->assertNotNull($result['run_id']);

        $run = ClinicImportRun::find($result['run_id']);
        $this->assertEquals('completed', $run->status);
        $this->assertEquals($result['total_fetched'], $run->total_fetched);
    }

    public function test_deduplication_by_phone_and_spatial_proximity(): void
    {
        $importer = new ClinicImporterService();

        $uniquePhone = '0988' . rand(100000, 999999);

        // 1. Initial clinic
        $initial = Clinic::create([
            'name'        => 'Phòng Khám Thú Y Test Gaia',
            'address'     => '38 Thụy Khuê',
            'city'        => 'Hà Nội',
            'lat'         => 21.0425,
            'lng'         => 105.8350,
            'hotline'     => $uniquePhone,
            'is_24h'      => true,
            'status'      => 'approved',
            'source'      => 'manual',
        ]);

        // 2. Process imported clinic with same phone and near coordinates
        $res = $importer->processClinic([
            'name'        => 'Test Gaia Veterinary Clinic',
            'address'     => '38 Thụy Khuê, Tây Hồ, Hà Nội',
            'city'        => 'Hà Nội',
            'lat'         => 21.0426,
            'lng'         => 105.8351,
            'hotline'     => $uniquePhone,
            'is_24h'      => true,
            'source'      => 'osm',
        ]);

        $this->assertEquals('updated', $res);
        $this->assertEquals('osm', $initial->fresh()->source);
    }

    public function test_csv_source_validates_coordinates(): void
    {
        $csvSource = new CsvSource();
        $clinics = $csvSource->fetchClinics(['mock' => true]);

        $this->assertNotEmpty($clinics);
        foreach ($clinics as $c) {
            $this->assertGreaterThanOrEqual(-90, $c['lat']);
            $this->assertLessThanOrEqual(90, $c['lat']);
            $this->assertGreaterThanOrEqual(-180, $c['lng']);
            $this->assertLessThanOrEqual(180, $c['lng']);
        }
    }

    public function test_artisan_command_dry_run_does_not_modify_database(): void
    {
        $countBefore = Clinic::count();

        $this->artisan('clinics:import', [
            'source'    => 'osm',
            '--mock'    => true,
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertEquals($countBefore, Clinic::count());
    }

    public function test_spatial_tiling_creates_tiles(): void
    {
        $importer = new ClinicImporterService();
        $result = $importer->import('osm', [
            'mock'      => true,
            'use_tiles' => true,
            'min_lat'   => 21.0,
            'max_lat'   => 21.2,
            'min_lng'   => 105.8,
            'max_lng'   => 106.0,
        ]);

        $run = ClinicImportRun::find($result['run_id']);
        $this->assertGreaterThan(0, $run->tiles()->count());
    }
}
