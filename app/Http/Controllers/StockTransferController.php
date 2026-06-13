<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Item;
use App\Models\StockTransfer;
use App\Models\StockLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index()
    {
        $branches = Branch::where('is_active', 1)->get(['id', 'name']);
        
        $availableItems = Item::where('stock_qty', '>', 0)
            ->get(['id', 'name', 'sku', 'stock_qty as stock', 'cost as capitalPrice', 'price as sellingPrice']);

        $pendingRequisitions = StockTransfer::with(['toBranch', 'requester', 'items.item'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($transfer) {
                $firstItem = $transfer->items->first();
                return [
                    'id' => $transfer->id,
                    'branch' => $transfer->toBranch ? $transfer->toBranch->name : 'Unknown Branch',
                    'cashier' => $transfer->requester ? $transfer->requester->name : 'Unknown',
                    'item' => $firstItem && $firstItem->item ? $firstItem->item->name : 'Multiple Items',
                    'qty' => $firstItem ? $firstItem->quantity : 0,
                    'date' => $transfer->created_at->format('M j, Y'),
                    'time' => $transfer->created_at->format('h:i A'),
                    'requestedAt' => $transfer->created_at->diffForHumans(),
                ];
            });

        // Using stock_transfers for history, or we can use stock_logs.
        // Let's use stock_transfers for a unified history of these specific transactions.
        $transferHistory = StockTransfer::with(['fromBranch', 'toBranch', 'requester', 'items.item'])
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get()
            ->map(function ($transfer) {
                $firstItem = $transfer->items->first();
                return [
                    'id' => $transfer->reference_number,
                    'date' => $transfer->created_at->format('M j, Y'),
                    'time' => $transfer->created_at->format('h:i A'),
                    'cashier' => $transfer->requester ? $transfer->requester->name : 'Unknown',
                    'item' => $firstItem && $firstItem->item ? $firstItem->item->name : 'Multiple Items',
                    'qty' => $firstItem ? $firstItem->quantity : 0,
                    'from' => $transfer->fromBranch ? $transfer->fromBranch->name : 'Main Bodega',
                    'to' => $transfer->toBranch ? $transfer->toBranch->name : 'Main Bodega',
                    'status' => ucfirst($transfer->status),
                ];
            });

        $stockInHistory = \Illuminate\Support\Facades\DB::table('stock_logs')
            ->join('items', 'stock_logs.item_id', '=', 'items.id')
            ->select('stock_logs.*', 'items.name as item_name')
            ->where('stock_logs.reason', 'stock_in')
            ->orderBy('stock_logs.created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'date' => \Carbon\Carbon::parse($log->created_at)->format('n/j/Y, g:i:s A'),
                    'item' => $log->item_name,
                    'type' => 'RECEIPT',
                    'change' => '+' . $log->change_qty,
                    'new' => $log->new_qty,
                ];
            });

        $stockOutHistory = \Illuminate\Support\Facades\DB::table('stock_logs')
            ->join('items', 'stock_logs.item_id', '=', 'items.id')
            ->select('stock_logs.*', 'items.name as item_name')
            ->where('stock_logs.reason', 'like', 'stock_out%')
            ->orderBy('stock_logs.created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($log) {
                $parts = explode(':', $log->reason);
                $type = isset($parts[1]) ? strtoupper(trim($parts[1])) : 'ISSUE';
                return [
                    'id' => $log->id,
                    'date' => \Carbon\Carbon::parse($log->created_at)->format('n/j/Y, g:i:s A'),
                    'item' => $log->item_name,
                    'type' => $type,
                    'change' => $log->change_qty,
                    'new' => $log->new_qty,
                ];
            });

        return Inertia::render('StockTransfers', [
            'branches' => $branches,
            'availableItems' => $availableItems,
            'branchRequisitions' => $pendingRequisitions,
            'transferHistory' => $transferHistory,
            'stockInHistory' => $stockInHistory,
            'stockOutHistory' => $stockOutHistory,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'to_branch_id' => 'required|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:items,id',
            'items.*.transferQty' => 'required|integer|min:1',
        ]);

        $transfer = StockTransfer::create([
            'reference_number' => 'TRX-' . strtoupper(uniqid()),
            'from_branch_id' => null, // Main Bodega
            'to_branch_id' => $request->to_branch_id,
            // 'requested_by' => auth()->id(), // Uncomment if auth is working
            'status' => 'completed',
        ]);

        foreach ($request->items as $reqItem) {
            $transfer->items()->create([
                'item_id' => $reqItem['id'],
                'quantity' => $reqItem['transferQty'],
            ]);

            // Adjust main bodega stock
            $item = Item::find($reqItem['id']);
            if ($item) {
                $item->decrement('stock_qty', $reqItem['transferQty']);

                // --- LIVE POS SYNCING ---
                try {
                    // Try to find the matching item in the live POS database
                    $posItem = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                        ->table('items')
                        ->where('sku', $item->sku)
                        ->orWhere('name', $item->name)
                        ->first();

                    if ($posItem) {
                        // Increment total stock in the POS items table
                        \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('items')
                            ->where('id', $posItem->id)
                            ->increment('stock_qty', $reqItem['transferQty']);

                        // Increment specific branch stock in the POS
                        \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('branch_item_stocks')
                            ->where('item_id', $posItem->id)
                            ->where('branch_id', $request->to_branch_id)
                            ->increment('quantity', $reqItem['transferQty']);
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('POS Sync Failed: ' . $e->getMessage());
                }
            }
        }

        return redirect()->back()->with('success', 'Transfer sent successfully!');
    }

    public function stockIn(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:items,id',
            'quantity' => 'required|integer|min:1',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $item = Item::find($request->item_id);
        $newQty = $item->stock_qty + $request->quantity;
        
        $item->update(['stock_qty' => $newQty]);

        \Illuminate\Support\Facades\DB::table('stock_logs')->insert([
            'item_id' => $item->id,
            'change_qty' => $request->quantity,
            'new_qty' => $newQty,
            'reason' => 'stock_in',
            'reference' => $request->reference,
            'notes' => $request->notes,
            'branch_id' => null, // Bodega
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Stock in successful!');
    }

    public function stockOut(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:items,id',
            'quantity' => 'required|integer|min:1',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
            'reason' => 'required|string', // Issue, Damage, etc.
        ]);

        $item = Item::find($request->item_id);
        
        if ($item->stock_qty < $request->quantity) {
            return redirect()->back()->withErrors(['quantity' => 'Insufficient stock.']);
        }

        $newQty = $item->stock_qty - $request->quantity;
        $item->update(['stock_qty' => $newQty]);

        \Illuminate\Support\Facades\DB::table('stock_logs')->insert([
            'item_id' => $item->id,
            'change_qty' => -$request->quantity,
            'new_qty' => $newQty,
            'reason' => 'stock_out: ' . $request->reason,
            'reference' => $request->reference,
            'notes' => $request->notes,
            'branch_id' => null, // Bodega
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Stock out successful!');
    }

    public function adjust(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:items,id',
            'name' => 'required|string',
            'capitalPrice' => 'required|numeric',
            'sellingPrice' => 'required|numeric',
        ]);

        $item = Item::find($request->item_id);
        $item->update([
            'name' => $request->name,
            'cost' => $request->capitalPrice,
            'price' => $request->sellingPrice,
        ]);

        return redirect()->back()->with('success', 'Product details updated!');
    }
}
