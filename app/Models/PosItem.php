<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosItem extends Model
{
    protected $table = 'items';
    protected $guarded = [];

    public function category()
    {
        return $this->belongsTo(PosCategory::class, 'category_id', 'id');
    }
}
