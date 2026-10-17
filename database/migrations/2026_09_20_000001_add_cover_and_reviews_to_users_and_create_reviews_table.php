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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'cover_url')) {
                $table->string('cover_url', 500)->nullable()->after('avatar_url');
            }
            if (!Schema::hasColumn('users', 'clinic_id')) {
                $table->unsignedBigInteger('clinic_id')->nullable()->after('clinic_name');
            }
            if (!Schema::hasColumn('users', 'average_rating')) {
                $table->decimal('average_rating', 3, 2)->default(5.00)->after('specialty');
            }
            if (!Schema::hasColumn('users', 'reviews_count')) {
                $table->unsignedInteger('reviews_count')->default(0)->after('average_rating');
            }
        });

        if (!Schema::hasTable('doctor_reviews')) {
            Schema::create('doctor_reviews', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('doctor_id');
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('sos_id')->nullable();
                $table->unsignedTinyInteger('rating'); // 1-5
                $table->text('comment')->nullable();
                $table->text('doctor_reply')->nullable();
                $table->timestamp('doctor_replied_at')->nullable();
                $table->boolean('is_verified_treatment')->default(false);
                $table->boolean('is_reported')->default(false);
                $table->string('report_reason', 255)->nullable();
                $table->timestamps();

                $table->foreign('doctor_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('sos_id')->references('id')->on('emergency_requests')->onDelete('set null');

                $table->unique(['doctor_id', 'user_id']);
                $table->index(['doctor_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_reviews');

        Schema::table('users', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('users', 'cover_url')) $cols[] = 'cover_url';
            if (Schema::hasColumn('users', 'clinic_id')) $cols[] = 'clinic_id';
            if (Schema::hasColumn('users', 'average_rating')) $cols[] = 'average_rating';
            if (Schema::hasColumn('users', 'reviews_count')) $cols[] = 'reviews_count';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
