<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Pet extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'pet_name',
        'species',
        'type',
        'breed',
        'sex',
        'color',
        'is_neutered',
        'microchip_number',
        'birth_date',
        'weight',
        'medical_history',
        'allergies',
        'chronic_conditions',
        'photo_url',
        'is_public',
        'qr_token',
        'qr_settings',
        'hardware_gps_id',
        'tracking_lat',
        'tracking_lng',
    ];

    protected function casts(): array
    {
        return [
            'birth_date'   => 'date',
            'weight'       => 'decimal:2',
            'is_neutered'  => 'boolean',
            'is_public'    => 'boolean',
            'qr_settings'  => 'array',
            'tracking_lat' => 'decimal:7',
            'tracking_lng' => 'decimal:7',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($pet) {
            if (empty($pet->qr_token)) {
                $pet->qr_token = Str::random(32);
            }
            if (empty($pet->type)) {
                $pet->type = $pet->species ?: 'dog';
            }
            if (empty($pet->species)) {
                $pet->species = $pet->type ?: 'dog';
            }
            if (empty($pet->breed)) {
                $pet->breed = 'Thú cưng';
            }
            if (empty($pet->qr_settings)) {
                $pet->qr_settings = [
                    'show_photo'     => true,
                    'show_name'      => true,
                    'show_allergies' => true,
                    'show_contact'   => true,
                ];
            }
        });
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function emergencyLogs(): HasMany
    {
        return $this->hasMany(EmergencyLog::class, 'pet_id');
    }

    public function healthEvents(): HasMany
    {
        return $this->hasMany(PetHealthEvent::class, 'pet_id');
    }

    public function weights(): HasMany
    {
        return $this->hasMany(PetWeight::class, 'pet_id');
    }

    public function medications(): HasMany
    {
        return $this->hasMany(PetMedication::class, 'pet_id');
    }

    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_pets');
    }

    // ──────────────────────────────────────────────
    // Helper & Health Score Engine
    // ──────────────────────────────────────────────

    public function hasGpsCollar(): bool
    {
        return !empty($this->hardware_gps_id);
    }

    /**
     * Calculate 0-100 Health Score with breakdown explanations.
     */
    public function calculateHealthScore(): array
    {
        $score = 100;
        $explanations = [];

        // 1. Check overdue health events (-15 each, max -45)
        $today = now()->startOfDay();
        $overdueEvents = $this->healthEvents()
            ->whereNull('given_at')
            ->whereNotNull('next_due_at')
            ->where('next_due_at', '<', $today)
            ->get();

        if ($overdueEvents->count() > 0) {
            $penalty = min(45, $overdueEvents->count() * 15);
            $score -= $penalty;
            $names = $overdueEvents->pluck('name')->implode(', ');
            $explanations[] = "Quá hạn {$overdueEvents->count()} mục chăm sóc ({$names}): -{$penalty} điểm";
        } else {
            $explanations[] = "Lịch tiêm chủng và chăm sóc định kỳ được theo dõi tốt: +40 điểm";
        }

        // 2. Check recent weight entry in last 60 days
        $recentWeight = $this->weights()
            ->where('recorded_at', '>=', now()->subDays(60))
            ->exists();

        if (!$recentWeight && empty($this->weight)) {
            $score -= 15;
            $explanations[] = "Chưa ghi nhận cân nặng trong 60 ngày gần nhất: -15 điểm";
        } else {
            $explanations[] = "Theo dõi cân nặng đầy đủ: +15 điểm";
        }

        // 3. Check rabies vaccine compliance (legal requirement in VN)
        $rabiesDone = $this->healthEvents()
            ->where('name', 'like', '%dại%')
            ->orWhere('name', 'like', '%rabies%')
            ->whereNotNull('given_at')
            ->where('given_at', '>=', now()->subYear())
            ->exists();

        if (!$rabiesDone && in_array(strtolower($this->species ?? $this->type ?? ''), ['dog', 'cat'])) {
            $score -= 20;
            $explanations[] = "Chưa có chứng nhận tiêm phòng Dại trong 12 tháng qua (yêu cầu pháp lý): -20 điểm";
        } else {
            $explanations[] = "Đã hoàn thành tiêm phòng Dại định kỳ: +20 điểm";
        }

        $finalScore = max(10, min(100, $score));

        return [
            'score'        => $finalScore,
            'rating_text'  => $finalScore >= 85 ? 'Rất tốt' : ($finalScore >= 70 ? 'Khá' : ($finalScore >= 50 ? 'Cần lưu ý' : 'Báo động')),
            'color'        => $finalScore >= 85 ? 'emerald' : ($finalScore >= 70 ? 'blue' : ($finalScore >= 50 ? 'amber' : 'rose')),
            'explanations' => $explanations,
        ];
    }
}
