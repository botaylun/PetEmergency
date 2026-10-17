<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'user_id',
        'sos_id',
        'rating',
        'comment',
        'doctor_reply',
        'doctor_replied_at',
        'is_verified_treatment',
        'is_reported',
        'report_reason',
    ];

    protected $casts = [
        'rating'                => 'integer',
        'is_verified_treatment' => 'boolean',
        'is_reported'           => 'boolean',
        'doctor_replied_at'     => 'datetime',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function emergencyRequest(): BelongsTo
    {
        return $this->belongsTo(EmergencyRequest::class, 'sos_id');
    }
}
