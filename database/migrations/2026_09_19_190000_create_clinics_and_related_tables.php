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
        if (!Schema::hasTable('clinics')) {
            Schema::create('clinics', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type')->default('clinic'); // hospital | clinic | pet_shop
                $table->text('description')->nullable();
                $table->string('address');
                $table->string('city')->nullable();
                $table->decimal('lat', 10, 7);
                $table->decimal('lng', 10, 7);
                $table->geometry('location', subtype: 'point', srid: 4326)->nullable();
                $table->string('hotline');
                $table->string('zalo')->nullable();
                $table->string('website')->nullable();
                $table->string('facebook')->nullable();
                $table->boolean('is_24h')->default(false);
                $table->boolean('accepts_emergency')->default(true);
                $table->json('species')->nullable();
                $table->json('services')->nullable();
                $table->enum('status', ['draft', 'pending_review', 'approved', 'rejected', 'suspended'])->default('approved');
                $table->text('reject_reason')->nullable();
                $table->json('pending_edits')->nullable();
                $table->decimal('rating', 3, 2)->default(4.80);
                $table->unsignedInteger('review_count')->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();

                $table->index('status');
                $table->index('type');
                $table->index('is_24h');
                $table->index('accepts_emergency');
                $table->index(['lat', 'lng']);
                $table->index('created_by');
            });
        }

        if (!Schema::hasTable('clinic_members')) {
            Schema::create('clinic_members', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->enum('role', ['owner', 'member'])->default('member');
                $table->enum('status', ['active', 'pending'])->default('active');
                $table->timestamps();

                $table->unique(['clinic_id', 'user_id']);
                $table->index(['user_id', 'status']);
            });
        }

        if (!Schema::hasTable('clinic_hours')) {
            Schema::create('clinic_hours', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->onDelete('cascade');
                $table->unsignedTinyInteger('day_of_week'); // 0 = Sunday, 1-6 = Mon-Sat
                $table->time('open_time')->nullable();
                $table->time('close_time')->nullable();
                $table->boolean('is_closed')->default(false);
                $table->timestamps();

                $table->index(['clinic_id', 'day_of_week']);
            });
        }

        if (!Schema::hasTable('clinic_photos')) {
            Schema::create('clinic_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->onDelete('cascade');
                $table->string('url');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('clinic_documents')) {
            Schema::create('clinic_documents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->onDelete('cascade');
                $table->string('document_type'); // veterinary_license, business_permit, certification
                $table->string('file_url');
                $table->string('file_name');
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('clinic_reviews')) {
            Schema::create('clinic_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->unsignedTinyInteger('rating');
                $table->text('comment')->nullable();
                $table->timestamps();

                $table->index('clinic_id');
            });
        }

        if (!Schema::hasTable('clinic_reports')) {
            Schema::create('clinic_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->onDelete('cascade');
                $table->foreignId('reporter_id')->constrained('users')->onDelete('cascade');
                $table->string('reason');
                $table->text('details')->nullable();
                $table->enum('status', ['pending', 'resolved', 'dismissed'])->default('pending');
                $table->timestamps();

                $table->index(['clinic_id', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_reports');
        Schema::dropIfExists('clinic_reviews');
        Schema::dropIfExists('clinic_documents');
        Schema::dropIfExists('clinic_photos');
        Schema::dropIfExists('clinic_hours');
        Schema::dropIfExists('clinic_members');
        Schema::dropIfExists('clinics');
    }
};
