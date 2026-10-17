<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetHealthEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'type', // vaccine, deworm, flea_tick, checkup, surgery, other
        'name',
        'given_at',
        'next_due_at',
        'batch_no',
        'clinic_name',
        'doctor_id',
        'notes',
        'attachments',
        'status', // upcoming, due_soon, overdue, done
    ];

    protected $casts = [
        'given_at'    => 'date',
        'next_due_at' => 'date',
        'attachments' => 'array',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * Compute real-time status based on current date.
     */
    public function calculateStatus(): string
    {
        if ($this->given_at) {
            return 'done';
        }

        if (!$this->next_due_at) {
            return 'upcoming';
        }

        $today = now()->startOfDay();
        $dueDate = $this->next_due_at->startOfDay();

        if ($dueDate->lt($today)) {
            return 'overdue';
        }

        if ($dueDate->diffInDays($today) <= 7) {
            return 'due_soon';
        }

        return 'upcoming';
    }
}
