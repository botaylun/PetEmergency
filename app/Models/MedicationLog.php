<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_medication_id',
        'given_at',
        'notes',
    ];

    protected $casts = [
        'given_at' => 'datetime',
    ];

    public function medication(): BelongsTo
    {
        return $this->belongsTo(PetMedication::class, 'pet_medication_id');
    }
}
