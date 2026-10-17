<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicImportRun extends Model
{
    protected $fillable = [
        'source',
        'status',
        'total_fetched',
        'total_inserted',
        'total_updated',
        'total_skipped',
        'error_log',
        'metadata',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'metadata'     => 'array',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function tiles(): HasMany
    {
        return $this->hasMany(ClinicImportTile::class, 'run_id');
    }
}
