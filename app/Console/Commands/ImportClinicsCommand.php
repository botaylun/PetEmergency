<?php

namespace App\Console\Commands;

use App\Services\ClinicImport\ClinicImporterService;
use Illuminate\Console\Command;

class ImportClinicsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'clinics:import 
                            {source=osm : Data source (osm, google, csv)}
                            {--file= : CSV file path for csv source}
                            {--city= : Filter target city (e.g. "Hà Nội", "Hồ Chí Minh")}
                            {--limit= : Limit number of clinics to import}
                            {--dry-run : Simulate import without database writes}
                            {--mock : Use local mock fixture data}
                            {--tiles : Enable spatial bounding box tile subdivision}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import veterinary clinics from OpenStreetMap Overpass, Google Places, or CSV files with deduping';

    /**
     * Execute the console command.
     */
    public function handle(ClinicImporterService $importer): int
    {
        $source = strtolower($this->argument('source'));
        $this->info("🏥 Starting clinic import from source: [{$source}]");

        $options = [
            'file'      => $this->option('file'),
            'city'      => $this->option('city') ?: 'Hà Nội',
            'limit'     => $this->option('limit'),
            'dry_run'   => (bool)$this->option('dry-run'),
            'mock'      => (bool)$this->option('mock'),
            'use_tiles' => (bool)$this->option('tiles'),
        ];

        if ($options['dry_run']) {
            $this->warn("⚠️ DRY-RUN MODE: No changes will be saved to the database.");
        }

        $startTime = microtime(true);
        $result = $importer->import($source, $options);
        $duration = round(microtime(true) - $startTime, 2);

        $this->newLine();
        $this->info("✅ Clinic Import Completed in {$duration}s!");

        $headers = ['Metric', 'Value'];
        $rows = [
            ['Run ID', $result['run_id'] ?? 'N/A (Dry-Run)'],
            ['Source', $result['source']],
            ['Total Fetched', $result['total_fetched']],
            ['Inserted (New)', $result['total_inserted']],
            ['Updated (Deduped)', $result['total_updated']],
            ['Skipped', $result['total_skipped']],
        ];

        $this->table($headers, $rows);

        if (!empty($result['errors'])) {
            $this->error("Errors encountered:");
            foreach ($result['errors'] as $err) {
                $this->line(" - {$err}");
            }
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
