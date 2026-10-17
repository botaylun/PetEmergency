<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'pet_name', 'pet_avatar', 'content', 'media_url', 'media_type',
        'likes_count', 'tags', 'is_flagged', 'ai_mod_status', 'ai_mod_reason',
    ];

    protected $casts = [
        'tags'       => 'array',
        'is_flagged' => 'boolean',
    ];

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'post_id');
    }

    public function pets(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'post_pets', 'post_id', 'pet_id')->withTimestamps();
    }

    // ──────────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────────

    public function getMediaFullUrlAttribute(): ?string
    {
        if ($this->media_url && $this->media_type !== 'none') {
            return asset('storage/' . $this->media_url);
        }
        return null;
    }
}
