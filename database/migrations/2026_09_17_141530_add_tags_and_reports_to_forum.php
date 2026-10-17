<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Thêm tags, is_flagged, ai_moderation_status vào posts
        Schema::table('posts', function (Blueprint $table) {
            $table->json('tags')->nullable()->after('content');
            $table->boolean('is_flagged')->default(false)->after('likes_count');
            $table->enum('ai_mod_status', ['pending', 'approved', 'rejected'])
                  ->default('approved')->after('is_flagged');
            $table->string('ai_mod_reason')->nullable()->after('ai_mod_status');
        });

        // Bảng báo cáo bài viết
        Schema::create('post_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->onDelete('cascade');
            $table->foreignId('reporter_id')->constrained('users')->onDelete('cascade');
            $table->enum('reason', [
                'spam', 'inappropriate', 'misinformation',
                'harassment', 'off_topic', 'other'
            ])->default('other');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'reviewed', 'dismissed'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            // Mỗi user chỉ report một bài một lần
            $table->unique(['post_id', 'reporter_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_reports');
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['tags', 'is_flagged', 'ai_mod_status', 'ai_mod_reason']);
        });
    }
};
