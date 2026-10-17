<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VaccineTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'species',
        'name',
        'age_from_days',
        'interval_days',
        'repeats',
        'is_core',
        'is_legal_required',
        'notes',
    ];

    protected $casts = [
        'is_core'           => 'boolean',
        'is_legal_required' => 'boolean',
        'age_from_days'     => 'integer',
        'interval_days'     => 'integer',
        'repeats'           => 'integer',
    ];
}
