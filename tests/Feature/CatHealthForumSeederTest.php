<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Database\Seeders\CatHealthForumSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CatHealthForumSeederTest extends TestCase
{
    use DatabaseTransactions;

    public function test_cat_health_forum_seeder_populates_realistic_cases_with_doctor_advice(): void
    {
        // Run seeder
        $this->seed(CatHealthForumSeeder::class);

        // Check posts created by CatHealthForumSeeder
        $doctorAdviceComments = Comment::where('content', 'like', '🩺%')->get();
        $this->assertGreaterThanOrEqual(25, $doctorAdviceComments->count());

        // Check each of these comments belongs to a doctor
        foreach ($doctorAdviceComments as $comment) {
            $user = User::find($comment->user_id);
            $this->assertEquals('doctor', $user->role, "Comment {$comment->id} author is not doctor");
        }

        // Verify Paracetamol warning is present in medical advice
        $paracetamolWarningExists = Comment::where('content', 'like', '%PARACETAMOL%')
            ->orWhere('content', 'like', '%Paracetamol%')
            ->exists();
        $this->assertTrue($paracetamolWarningExists);

        // Verify seeder is idempotent
        $countBefore = Post::count();
        $this->seed(CatHealthForumSeeder::class);
        $countAfter = Post::count();
        $this->assertEquals($countBefore, $countAfter);
    }
}
