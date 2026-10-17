<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add likes_count to posts table
        Schema::table('posts', function (Blueprint $table) {
            $table->unsignedInteger('likes_count')->default(0)->after('media_type');
        });

        // Add avatar_url and profile fields to users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_url')->nullable()->after('phone');
            $table->string('clinic_name')->nullable()->after('avatar_url');
            $table->string('specialty')->nullable()->after('clinic_name');
            $table->string('bio')->nullable()->after('specialty');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('likes_count');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_url', 'clinic_name', 'specialty', 'bio']);
        });
    }
};
