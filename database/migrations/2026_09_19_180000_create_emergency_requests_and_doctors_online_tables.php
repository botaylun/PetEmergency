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
        // ──────────────────────────────────────────────
        // 1. EMERGENCY_REQUESTS TABLE
        // ──────────────────────────────────────────────
        if (!Schema::hasTable('emergency_requests')) {
            Schema::create('emergency_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('doctor_id')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('pet_id')->nullable()->constrained('pets')->onDelete('set null');
                $table->string('pet_name')->nullable();
                $table->string('pet_breed')->nullable();
                $table->decimal('sos_latitude', 10, 7)->nullable();
                $table->decimal('sos_longitude', 10, 7)->nullable();
                $table->geometry('location', subtype: 'point', srid: 4326)->nullable();
                $table->json('symptom_tags')->nullable();
                $table->text('notes')->nullable();
                $table->string('pet_photo_url')->nullable();
                $table->text('ai_first_aid')->nullable();
                $table->enum('urgency_level', ['low', 'medium', 'high', 'critical'])->default('critical');
                $table->enum('status', ['finding', 'accepted', 'en_route', 'arrived', 'treating', 'completed', 'canceled'])->default('finding');
                $table->timestamp('accepted_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index('status');
                $table->index('doctor_id');
                $table->index('created_at');
                $table->index(['sos_latitude', 'sos_longitude']);
            });
        }

        // ──────────────────────────────────────────────
        // 2. DOCTORS_ONLINE TABLE
        // ──────────────────────────────────────────────
        if (!Schema::hasTable('doctors_online')) {
            Schema::create('doctors_online', function (Blueprint $table) {
                $table->foreignId('user_id')->primary()->constrained('users')->onDelete('cascade');
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->geometry('location', subtype: 'point', srid: 4326)->nullable();
                $table->boolean('is_online')->default(true);
                $table->boolean('is_busy')->default(false);
                $table->string('socket_id')->nullable();
                $table->timestamp('last_heartbeat')->nullable();
                $table->timestamps();

                $table->index(['is_online', 'is_busy']);
                $table->index(['latitude', 'longitude']);
            });
        }

        // ──────────────────────────────────────────────
        // 3. SOS_REPORTS TABLE
        // ──────────────────────────────────────────────
        if (!Schema::hasTable('sos_reports')) {
            Schema::create('sos_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('emergency_request_id')->constrained('emergency_requests')->onDelete('cascade');
                $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
                $table->text('diagnosis')->nullable();
                $table->text('treatment_summary')->nullable();
                $table->text('follow_up_advice')->nullable();
                $table->text('prescription')->nullable();
                $table->timestamps();

                $table->index('emergency_request_id');
                $table->index('doctor_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sos_reports');
        Schema::dropIfExists('doctors_online');
        Schema::dropIfExists('emergency_requests');
    }
};
