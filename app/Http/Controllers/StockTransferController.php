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

        $pendingRequisitions = \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->leftJoin('branches', 'branch_requisitions.branch_id', '=', 'branches.id')
            ->leftJoin('users', 'branch_requisitions.user_id', '=', 'users.id')
            ->select(
                'branch_requisitions.*',
                'branches.name as branch_name',
                'users.name as cashier_name'
            )
            ->where('branch_requisitions.status', 'pending')
            ->orderBy('branch_requisitions.created_at', 'desc')
            ->get()
            ->map(function ($req) {
                $createdAt = \Carbon\Carbon::parse($req->created_at);
                return [
                    'id' => $req->id,
                    'branch' => $req->branch_name ?? 'Unknown Branch',
                    'branch_id' => $req->branch_id,
                    'cashier' => $req->cashier_name ?? 'Unknown',
                    'item' => $req->item_name,
                    'sku' => $req->sku,
                    'qty' => $req->quantity,
                    'date' => $createdAt->format('M j, Y'),
                    'time' => $createdAt->format('h:i A'),
                    'requestedAt' => $createdAt->diffForHumans(),
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

        $categories = \App\Models\Category::all();

        return Inertia::render('StockTransfers', [
            'branches' => $branches,
            'availableItems' => $availableItems,
            'branchRequisitions' => $pendingRequisitions,
            'transferHistory' => $transferHistory,
            'stockInHistory' => $stockInHistory,
            'stockOutHistory' => $stockOutHistory,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'to_branch_id' => 'required|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:items,id',
            'items.*.transferQty' => 'required|integer|min:1',
            'requisition_id' => 'nullable|integer',
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
                    // Try to find the matching item in the live POS database
                    $posItemQuery = \Illuminate\Support\Facades\DB::connection('boutique_pos')->table('items');
                    if (!empty($item->sku)) {
                        $posItemQuery->where(function($q) use ($item) {
                            $q->where('sku', $item->sku)->orWhere('name', $item->name);
                        });
                    } else {
                        $posItemQuery->where('name', $item->name);
                    }
                    $posItem = $posItemQuery->first();

                    // Resolve correct POS branch ID by name
                    $bodegaBranch = \App\Models\Branch::find($request->to_branch_id);
                    $posBranch = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                        ->table('branches')
                        ->where('name', $bodegaBranch->name)
                        ->first();
                    $posBranchId = $posBranch ? $posBranch->id : $request->to_branch_id;

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
                            ->where('branch_id', $posBranchId)
                            ->increment('quantity', $reqItem['transferQty']);
                    } else {
                        // Item doesn't exist in POS yet, let's create it!
                        $categoryName = 'Uncategorized';
                        if ($item->category_id) {
                            $localCategory = \App\Models\Category::find($item->category_id);
                            if ($localCategory) $categoryName = $localCategory->name;
                        }

                        $posCategory = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('categories')
                            ->where('name', $categoryName)
                            ->first();
                            
                        if (!$posCategory) {
                            $posCategoryId = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                                ->table('categories')
                                ->insertGetId([
                                    'name' => $categoryName,
                                    'type' => 'product',
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                        } else {
                            $posCategoryId = $posCategory->id;
                        }

                        $posItemId = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('items')
                            ->insertGetId([
                                'name' => $item->name,
                                'sku' => $item->sku,
                                'cost' => $item->cost,
                                'price' => $item->price,
                                'stock_qty' => $reqItem['transferQty'],
                                'category_id' => $posCategoryId,
                                'is_service' => 0,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                            
                        \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('branch_item_stocks')
                            ->insert([
                                'item_id' => $posItemId,
                                'branch_id' => $posBranchId,
                                'quantity' => $reqItem['transferQty'],
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                    }
                // Let the error bubble up natively
            }
        }

        if ($request->has('requisition_id') && $request->requisition_id) {
            \Illuminate\Support\Facades\DB::connection('boutique_pos')
                ->table('branch_requisitions')
                ->where('id', $request->requisition_id)
                ->update(['status' => 'fulfilled']);
        }

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'stock_transfer',
            'description' => 'Transferred ' . count($request->items) . ' item(s) to ' . \App\Models\Branch::find($request->to_branch_id)->name,
        ]);

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

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'stock_restock',
            'description' => "Stock in: +{$request->quantity} for {$item->name}",
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

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'stock_out',
            'description' => "Stock out: -{$request->quantity} for {$item->name} ({$request->reason})",
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

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'item_adjusted',
            'description' => "Adjusted details for {$request->name}",
        ]);

        return redirect()->back()->with('success', 'Product details updated!');
    }

    public function storeItem(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $existsInLocal = \App\Models\Item::whereRaw('LOWER(name) = ?', [strtolower($value)])->exists();
                    if ($existsInLocal) {
                        $fail('This item name already exists in Bodega.');
                        return;
                    }
                    try {
                        $existsInPos = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('items')
                            ->whereRaw('LOWER(name) = ?', [strtolower($value)])
                            ->exists();
                        if ($existsInPos) {
                            $fail('This item name already exists in the POS system.');
                        }
                    } catch (\Exception $e) {
                        // ignore connection failure
                    }
                }
            ],
            'sku' => 'nullable|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'capital_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'initial_stocks' => 'required|numeric|min:0',
        ]);

        $item = new \App\Models\Item();
        $item->name = $validated['name'];
        $item->category_id = $validated['category_id'];
        
        $sku = $validated['sku'] ?? null;
        if (empty($sku) || \App\Services\SkuGenerator::skuExists($sku)) {
            $item->sku = \App\Services\SkuGenerator::generate($item);
        } else {
            $item->sku = $sku;
        }
        
        $item->cost = $validated['capital_price'];
        $item->price = $validated['selling_price'];
        $item->stock_qty = $validated['initial_stocks'];
        $item->is_service = 0;
        $item->save();

        if ($validated['initial_stocks'] > 0) {
            \Illuminate\Support\Facades\DB::table('stock_logs')->insert([
                'item_id' => $item->id,
                'change_qty' => $validated['initial_stocks'],
                'new_qty' => $validated['initial_stocks'],
                'reason' => 'stock_in',
                'reference' => 'Initial Stock',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'item_added',
            'description' => "Added new item: {$item->name}",
        ]);

        return redirect()->back();
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:product,service',
        ]);

        $category = new \App\Models\Category();
        $category->name = $validated['name'];
        $category->type = $validated['type'];
        $category->save();

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'category_added',
            'description' => "Added new category: {$category->name}",
        ]);

        return redirect()->back();
    }

    public function rejectRequisition(Request $request, $id)
    {
        \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->where('id', $id)
            ->update([
                'status' => 'rejected',
                'is_notified' => false
            ]);

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'requisition_rejected',
            'description' => "Rejected branch requisition #{$id}",
        ]);

        return redirect()->back()->with('success', 'Requisition rejected successfully.');
    }
}
