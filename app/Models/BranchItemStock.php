<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BranchItemStock extends Model
{
    protected $guarded = [];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
