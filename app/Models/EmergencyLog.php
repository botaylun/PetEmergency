<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmergencyLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'pet_id',
        'sos_latitude',
        'sos_longitude',
        'description',
        'status',
        'assigned_doctor_id',
        'urgency_level',
    ];

    protected function casts(): array
    {
        return [
            'sos_latitude'  => 'decimal:7',
            'sos_longitude' => 'decimal:7',
        ];
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class, 'pet_id');
    }

    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_doctor_id');
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'accepted']);
    }
}
