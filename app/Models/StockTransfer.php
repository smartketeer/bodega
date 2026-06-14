<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTransfer extends Model
{
    use HasFactory;

    protected $table = 'bodega_stock_transfers';
    protected $primaryKey = 'bdg_id';
    protected $guarded = [];

    public function items()
    {
        return $this->hasMany(StockTransferItem::class, 'bdg_transfer_id', 'bdg_id');
    }

    public function fromBranch()
    {
        // Bodega doesn't strictly have a fromBranch anymore since it's the master storage, 
        // but if it points to POS branches we can map it, or leave it if unused.
        return $this->belongsTo(Branch::class, 'bdg_from_branch_id'); 
    }

    public function toBranch()
    {
        // Uses the POS database branches table!
        return $this->belongsTo(Branch::class, 'bdg_to_branch_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'bdg_requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'bdg_approved_by');
    }
}
