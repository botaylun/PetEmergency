<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Pivot table between posts and pets for 0-3 tagged pets.
     */
    public function up(): void
    {
        Schema::create('post_pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->onDelete('cascade');
            $table->foreignId('pet_id')->constrained('pets')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['post_id', 'pet_id']);
        });

        // Migrate existing posts that have pet_name into post_pets with no data loss
        $posts = DB::table('posts')->whereNotNull('pet_name')->get();
        foreach ($posts as $post) {
            // Find existing pet for this user or create one
            $pet = DB::table('pets')
                ->where('user_id', $post->user_id)
                ->where('pet_name', $post->pet_name)
                ->first();

            if (!$pet) {
                // If user doesn't have a pet with this name, check if any pet exists for user
                $pet = DB::table('pets')->where('user_id', $post->user_id)->first();
            }

            if (!$pet) {
                // Create pet record so post is linked to a valid pet
                $petId = DB::table('pets')->insertGetId([
                    'user_id'    => $post->user_id,
                    'pet_name'   => $post->pet_name,
                    'type'       => 'dog',
                    'breed'      => 'Thú cưng',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $petId = $pet->id;
            }

            DB::table('post_pets')->insertOrIgnore([
                'post_id'    => $post->id,
                'pet_id'     => $petId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_pets');
    }
};
