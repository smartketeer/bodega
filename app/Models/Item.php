<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $table = 'bodega_items';
    protected $primaryKey = 'bdg_id';
    
    // Disable default timestamps if they don't match or map them
    const CREATED_AT = 'created_at'; // We used standard created_at in the migration! Wait, let me check the migration.
    // In my migration I used $table->timestamps(); which creates 'created_at' and 'updated_at'.
    // So I don't need to change timestamp constants!

    protected $guarded = [];

    public function category()
    {
        return $this->belongsTo(Category::class, 'bdg_category_id', 'bdg_id');
    }
}
