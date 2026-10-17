<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'document_type',
        'file_url',
        'file_name',
        'notes',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
