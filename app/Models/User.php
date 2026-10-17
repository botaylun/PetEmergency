<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'verification_status',
        'latitude',
        'longitude',
        'phone',
        'avatar_url',
        'cover_url',
        'clinic_name',
        'clinic_id',
        'specialty',
        'bio',
        'average_rating',
        'reviews_count',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'latitude'          => 'decimal:7',
            'longitude'         => 'decimal:7',
        ];
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class, 'user_id');
    }

    public function emergencyLogs(): HasMany
    {
        return $this->hasMany(EmergencyLog::class, 'user_id');
    }

    public function doctorAssignedEmergencies(): HasMany
    {
        return $this->hasMany(EmergencyLog::class, 'assigned_doctor_id');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'user_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'user_id');
    }

    // ──────────────────────────────────────────────
    // Helper Methods
    // ──────────────────────────────────────────────

    public function isDoctor(): bool
    {
        return $this->role === 'doctor';
    }

    public function isVerifiedDoctor(): bool
    {
        return $this->role === 'doctor' && $this->verification_status === 'verified';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
