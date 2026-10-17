<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'day_of_week',
        'open_time',
        'close_time',
        'is_closed',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_closed'   => 'boolean',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
