<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('clinics', 'source')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->string('source', 50)->nullable()->default('manual')->after('status');
                $table->string('external_id', 100)->nullable()->after('source');
                $table->index(['source', 'external_id']);
            });
        }

        if (!Schema::hasTable('clinic_import_runs')) {
            Schema::create('clinic_import_runs', function (Blueprint $table) {
                $table->id();
                $table->string('source', 50); // osm, google, csv
                $table->string('status', 30)->default('pending'); // pending, running, completed, failed
                $table->integer('total_fetched')->default(0);
                $table->integer('total_inserted')->default(0);
                $table->integer('total_updated')->default(0);
                $table->integer('total_skipped')->default(0);
                $table->text('error_log')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('clinic_import_tiles')) {
            Schema::create('clinic_import_tiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('run_id')->constrained('clinic_import_runs')->cascadeOnDelete();
                $table->decimal('min_lat', 10, 7);
                $table->decimal('min_lng', 10, 7);
                $table->decimal('max_lat', 10, 7);
                $table->decimal('max_lng', 10, 7);
                $table->string('status', 30)->default('pending'); // pending, processing, completed, failed
                $table->integer('items_count')->default(0);
                $table->text('error_message')->nullable();
                $table->timestamps();

                $table->index(['run_id', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_import_tiles');
        Schema::dropIfExists('clinic_import_runs');

        if (Schema::hasColumn('clinics', 'source')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->dropIndex(['source', 'external_id']);
                $table->dropColumn(['source', 'external_id']);
            });
        }
    }
};
