<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTransferItem extends Model
{
    use HasFactory;

    protected $table = 'bodega_stock_transfer_items';
    protected $primaryKey = 'bdg_id';
    protected $guarded = [];

    public function transfer()
    {
        return $this->belongsTo(StockTransfer::class, 'bdg_transfer_id', 'bdg_id');
    }

    public function item()
    {
        return $this->belongsTo(Item::class, 'bdg_item_id', 'bdg_id');
    }
}
