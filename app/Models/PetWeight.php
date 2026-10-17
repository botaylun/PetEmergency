<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetWeight extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'weight',
        'recorded_at',
        'notes',
    ];

    protected $casts = [
        'weight'      => 'decimal:2',
        'recorded_at' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
