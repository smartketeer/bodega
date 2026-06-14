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
        // Points to the POS retail item instead of the Bodega item
        return $this->belongsTo(PosItem::class, 'item_id', 'id');
    }
}
