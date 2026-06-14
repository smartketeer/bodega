<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'bodega_categories';
    protected $primaryKey = 'bdg_id';
    protected $guarded = [];
}
