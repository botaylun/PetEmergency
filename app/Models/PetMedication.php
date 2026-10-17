<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PetMedication extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'name',
        'dosage',
        'times_per_day',
        'start_date',
        'end_date',
        'instructions',
        'is_active',
    ];

    protected $casts = [
        'start_date'    => 'date',
        'end_date'      => 'date',
        'times_per_day' => 'integer',
        'is_active'     => 'boolean',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(MedicationLog::class, 'pet_medication_id');
    }
}
