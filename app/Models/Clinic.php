<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Clinic extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'description',
        'address',
        'city',
        'lat',
        'lng',
        'location',
        'hotline',
        'zalo',
        'website',
        'facebook',
        'is_24h',
        'accepts_emergency',
        'species',
        'services',
        'status',
        'reject_reason',
        'pending_edits',
        'rating',
        'review_count',
        'source',
        'external_id',
        'created_by',
    ];

    protected $casts = [
        'lat'               => 'float',
        'lng'               => 'float',
        'is_24h'            => 'boolean',
        'accepts_emergency' => 'boolean',
        'species'           => 'array',
        'services'          => 'array',
        'pending_edits'     => 'array',
        'rating'            => 'float',
        'review_count'      => 'integer',
    ];

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(ClinicMember::class, 'clinic_id');
    }

    public function doctors(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'clinic_members', 'clinic_id', 'user_id')
            ->withPivot('role', 'status')
            ->withTimestamps();
    }

    public function hours(): HasMany
    {
        return $this->hasMany(ClinicHour::class, 'clinic_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ClinicPhoto::class, 'clinic_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ClinicDocument::class, 'clinic_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ClinicReview::class, 'clinic_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ClinicReport::class, 'clinic_id');
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope for spatial query using Haversine formula (km)
     */
    public function scopeNearby($query, float $latitude, float $longitude, float $radiusKm = 20)
    {
        $haversine = "(6371 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat))))";
        return $query->select('*')
            ->selectRaw("{$haversine} AS distance_km", [$latitude, $longitude, $latitude])
            ->having('distance_km', '<=', $radiusKm)
            ->orderBy('distance_km', 'asc');
    }
}
