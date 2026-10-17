<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Comprehensive schema for PetEmergency & Care platform.
     */
    public function up(): void
    {
        // ──────────────────────────────────────────────
        // 1. USERS TABLE
        // ──────────────────────────────────────────────
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['user', 'doctor', 'admin'])->default('user');
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index(['role', 'verification_status']);
            $table->index(['latitude', 'longitude']);
        });

        // ──────────────────────────────────────────────
        // Laravel System Defaults
        // ──────────────────────────────────────────────
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });

        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
        });

        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });

        // ──────────────────────────────────────────────
        // 2. PETS TABLE
        // ──────────────────────────────────────────────
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('pet_name');
            $table->string('type'); // dog, cat, bird, etc.
            $table->string('breed');
            $table->date('birth_date')->nullable();
            $table->decimal('weight', 5, 2)->nullable(); // kg
            $table->text('medical_history')->nullable();
            $table->string('hardware_gps_id')->nullable()->unique();
            $table->decimal('tracking_lat', 10, 7)->nullable();
            $table->decimal('tracking_lng', 10, 7)->nullable();
            $table->timestamps();

            $table->index('hardware_gps_id');
        });

        // ──────────────────────────────────────────────
        // 3. EMERGENCY_LOGS TABLE
        // ──────────────────────────────────────────────
        Schema::create('emergency_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('pet_id')->nullable()->constrained('pets')->onDelete('set null');
            $table->decimal('sos_latitude', 10, 7);
            $table->decimal('sos_longitude', 10, 7);
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'accepted', 'completed', 'canceled'])->default('pending');
            $table->foreignId('assigned_doctor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('urgency_level', ['low', 'medium', 'high', 'critical'])->default('critical');
            $table->timestamps();

            $table->index('status');
            $table->index('assigned_doctor_id');
            $table->index(['sos_latitude', 'sos_longitude']);
        });

        // ──────────────────────────────────────────────
        // 4. POSTS TABLE (Forum)
        // ──────────────────────────────────────────────
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('content');
            $table->string('media_url')->nullable();
            $table->enum('media_type', ['image', 'video', 'none'])->default('none');
            $table->timestamps();

            $table->index('created_at');
        });

        // ──────────────────────────────────────────────
        // 5. COMMENTS TABLE
        // ──────────────────────────────────────────────
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('content');
            $table->timestamps();

            $table->index('post_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('emergency_logs');
        Schema::dropIfExists('pets');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
