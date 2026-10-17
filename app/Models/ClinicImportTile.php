<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicImportTile extends Model
{
    protected $fillable = [
        'run_id',
        'min_lat',
        'min_lng',
        'max_lat',
        'max_lng',
        'status',
        'items_count',
        'error_message',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(ClinicImportRun::class, 'run_id');
    }
}
