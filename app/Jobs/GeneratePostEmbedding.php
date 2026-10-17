<?php

namespace App\Jobs;

use App\Models\Post;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * GeneratePostEmbedding
 * =====================
 * Queue Job: Tự động sinh embedding khi Admin duyệt bài viết forum.
 *
 * Cách dispatch:
 *   GeneratePostEmbedding::dispatch($post);
 *
 * Hoặc với delay:
 *   GeneratePostEmbedding::dispatch($post)->delay(now()->addSeconds(5));
 */
class GeneratePostEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Số lần retry nếu thất bại */
    public int $tries = 3;

    /** Timeout mỗi lần chạy (giây) */
    public int $timeout = 60;

    /** Backoff giữa các lần retry (giây) */
    public array $backoff = [10, 30, 60];

    public function __construct(private readonly Post $post) {}

    /**
     * Gọi Python RAG Service để sinh embedding cho bài viết.
     */
    public function handle(): void
    {
        $ragServiceUrl = config('services.rag.url', 'http://localhost:8002');

        try {
            Log::info("GeneratePostEmbedding: Bắt đầu embed post_id={$this->post->id}");

            $response = Http::timeout(30)
                ->retry(2, 500)
                ->post("{$ragServiceUrl}/embed-post", [
                    'post_id' => $this->post->id,
                    'title'   => $this->post->title ?? null,
                    'content' => $this->post->content,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info(
                    "✅ Embed thành công post_id={$this->post->id}: " .
                    "{$data['chunks_saved']} chunks"
                );
            } else {
                Log::warning(
                    "⚠️ RAG Service lỗi post_id={$this->post->id}: " .
                    $response->status() . ' ' . $response->body()
                );
                $this->fail(new \RuntimeException("RAG Service trả về {$response->status()}"));
            }

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // RAG Service chưa chạy — không ảnh hưởng luồng chính
            Log::warning("RAG Service không khả dụng, bỏ qua embedding: {$e->getMessage()}");

        } catch (\Throwable $e) {
            Log::error("GeneratePostEmbedding thất bại post_id={$this->post->id}: {$e->getMessage()}");
            throw $e; // Cho phép retry
        }
    }

    /**
     * Khi hết lần retry, ghi log thay vì crash app.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error(
            "GeneratePostEmbedding thất bại hoàn toàn post_id={$this->post->id}: " .
            $exception->getMessage()
        );
    }
}
