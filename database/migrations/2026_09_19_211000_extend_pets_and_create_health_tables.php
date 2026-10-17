<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Part B: Extend pets model and create pet health event tables.
     */
    public function up(): void
    {
        // 1. Extend pets table
        Schema::table('pets', function (Blueprint $table) {
            if (!Schema::hasColumn('pets', 'species')) {
                $table->string('species')->default('dog')->after('pet_name');
            }
            if (!Schema::hasColumn('pets', 'sex')) {
                $table->enum('sex', ['male', 'female', 'unknown'])->default('unknown')->after('breed');
            }
            if (!Schema::hasColumn('pets', 'color')) {
                $table->string('color')->nullable()->after('sex');
            }
            if (!Schema::hasColumn('pets', 'is_neutered')) {
                $table->boolean('is_neutered')->default(false)->after('color');
            }
            if (!Schema::hasColumn('pets', 'microchip_number')) {
                $table->string('microchip_number')->nullable()->after('is_neutered');
            }
            if (!Schema::hasColumn('pets', 'allergies')) {
                $table->text('allergies')->nullable()->after('medical_history');
            }
            if (!Schema::hasColumn('pets', 'chronic_conditions')) {
                $table->text('chronic_conditions')->nullable()->after('allergies');
            }
            if (!Schema::hasColumn('pets', 'photo_url')) {
                $table->text('photo_url')->nullable()->after('chronic_conditions');
            }
            if (!Schema::hasColumn('pets', 'is_public')) {
                $table->boolean('is_public')->default(true)->after('photo_url');
            }
            if (!Schema::hasColumn('pets', 'qr_token')) {
                $table->string('qr_token', 64)->nullable()->unique()->after('is_public');
            }
            if (!Schema::hasColumn('pets', 'qr_settings')) {
                $table->json('qr_settings')->nullable()->after('qr_token');
            }
            if (!Schema::hasColumn('pets', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });

        // Initialize qr_token for existing pets
        $existingPets = DB::table('pets')->whereNull('qr_token')->get();
        foreach ($existingPets as $ep) {
            DB::table('pets')->where('id', $ep->id)->update([
                'qr_token' => Str::random(32),
                'species'  => $ep->type ?? 'dog',
                'qr_settings' => json_encode([
                    'show_photo'     => true,
                    'show_name'      => true,
                    'show_allergies' => true,
                    'show_contact'   => true,
                ]),
            ]);
        }

        // 2. Vaccine templates table
        Schema::create('vaccine_templates', function (Blueprint $table) {
            $table->id();
            $table->string('species'); // dog, cat, rabbit, etc.
            $table->string('name');
            $table->integer('age_from_days')->default(0);
            $table->integer('interval_days')->default(0);
            $table->integer('repeats')->default(1);
            $table->boolean('is_core')->default(true);
            $table->boolean('is_legal_required')->default(false); // Bắt buộc theo luật thú y VN (Dại)
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('species');
        });

        // 3. Pet health events table
        Schema::create('pet_health_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained('pets')->onDelete('cascade');
            $table->enum('type', ['vaccine', 'deworm', 'flea_tick', 'checkup', 'surgery', 'other'])->default('vaccine');
            $table->string('name');
            $table->date('given_at')->nullable();
            $table->date('next_due_at')->nullable();
            $table->string('batch_no')->nullable();
            $table->string('clinic_name')->nullable();
            $table->foreignId('doctor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable();
            $table->enum('status', ['upcoming', 'due_soon', 'overdue', 'done'])->default('upcoming');
            $table->timestamps();

            $table->index(['pet_id', 'type', 'status']);
            $table->index('next_due_at');
        });

        // 4. Pet weights table
        Schema::create('pet_weights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained('pets')->onDelete('cascade');
            $table->decimal('weight', 5, 2);
            $table->date('recorded_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['pet_id', 'recorded_at']);
        });

        // 5. Pet medications table
        Schema::create('pet_medications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained('pets')->onDelete('cascade');
            $table->string('name');
            $table->string('dosage');
            $table->integer('times_per_day')->default(1);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['pet_id', 'is_active']);
        });

        // 6. Medication logs table
        Schema::create('medication_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_medication_id')->constrained('pet_medications')->onDelete('cascade');
            $table->timestamp('given_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['pet_medication_id', 'given_at']);
        });

        // 7. Notifications table
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('type')->default('pet_reminder'); // pet_reminder, vaccine_due, med_due, emergency
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // pet_id, event_id, etc.
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('medication_logs');
        Schema::dropIfExists('pet_medications');
        Schema::dropIfExists('pet_weights');
        Schema::dropIfExists('pet_health_events');
        Schema::dropIfExists('vaccine_templates');

        Schema::table('pets', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'species',
                'sex',
                'color',
                'is_neutered',
                'microchip_number',
                'allergies',
                'chronic_conditions',
                'photo_url',
                'is_public',
                'qr_token',
                'qr_settings',
            ]);
        });
    }
};
