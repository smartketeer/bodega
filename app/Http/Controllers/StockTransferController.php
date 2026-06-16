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
        
        $availableItems = Item::where('bdg_stock_qty', '>', 0)
            ->get(['bdg_id as id', 'bdg_name as name', 'bdg_sku as sku', 'bdg_stock_qty as stock', 'bdg_cost as capitalPrice', 'bdg_price as sellingPrice']);

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

        $transfersQuery = StockTransfer::with(['fromBranch', 'toBranch', 'requester', 'items.item'])
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();
            
        $transfers = $transfersQuery->map(function ($transfer) {
                $firstItem = $transfer->items->first();
                return [
                    'id' => $transfer->bdg_reference_number,
                    'date' => $transfer->created_at->format('M j, Y'),
                    'time' => $transfer->created_at->format('h:i A'),
                    'cashier' => $transfer->requester ? $transfer->requester->name : 'Unknown',
                    'item' => $firstItem && $firstItem->item ? $firstItem->item->bdg_name : 'Multiple Items',
                    'qty' => $firstItem ? $firstItem->bdg_quantity : 0,
                    'from' => $transfer->fromBranch ? $transfer->fromBranch->name : 'Main Bodega',
                    'to' => $transfer->toBranch ? $transfer->toBranch->name : 'Main Bodega',
                    'status' => 'Approved',
                    'sort_date' => $transfer->created_at,
                ];
            });

        $rejectedRequisitions = \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->leftJoin('branches', 'branch_requisitions.branch_id', '=', 'branches.id')
            ->leftJoin('users', 'branch_requisitions.user_id', '=', 'users.id')
            ->select(
                'branch_requisitions.*',
                'branches.name as branch_name',
                'users.name as cashier_name'
            )
            ->where('branch_requisitions.status', 'rejected')
            ->orderBy('branch_requisitions.updated_at', 'desc')
            ->take(20)
            ->get()
            ->map(function ($req) {
                $updatedAt = \Carbon\Carbon::parse($req->updated_at);
                return [
                    'id' => 'REQ-REJ-' . $req->id,
                    'date' => $updatedAt->format('M j, Y'),
                    'time' => $updatedAt->format('h:i A'),
                    'cashier' => $req->cashier_name ?? 'Unknown',
                    'item' => $req->item_name,
                    'qty' => $req->quantity,
                    'from' => 'Main Bodega',
                    'to' => $req->branch_name ?? 'Unknown Branch',
                    'status' => 'Rejected',
                    'sort_date' => $updatedAt,
                ];
            });

        $transferHistory = $transfers->concat($rejectedRequisitions)
            ->sortByDesc(function ($item) {
                return $item['sort_date']->timestamp;
            })
            ->take(20)
            ->values();

        $stockInHistory = \Illuminate\Support\Facades\DB::table('bodega_stock_logs')
            ->join('bodega_items', 'bodega_stock_logs.bdg_item_id', '=', 'bodega_items.bdg_id')
            ->select('bodega_stock_logs.*', 'bodega_items.bdg_name as item_name')
            ->where('bodega_stock_logs.bdg_reason', 'stock_in')
            ->orderBy('bodega_stock_logs.created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->bdg_id,
                    'date' => \Carbon\Carbon::parse($log->created_at)->format('n/j/Y, g:i:s A'),
                    'item' => $log->item_name,
                    'type' => 'RECEIPT',
                    'change' => '+' . $log->bdg_change_qty,
                    'new' => $log->bdg_new_qty,
                ];
            });

        $stockOutHistory = \Illuminate\Support\Facades\DB::table('bodega_stock_logs')
            ->join('bodega_items', 'bodega_stock_logs.bdg_item_id', '=', 'bodega_items.bdg_id')
            ->select('bodega_stock_logs.*', 'bodega_items.bdg_name as item_name')
            ->where('bodega_stock_logs.bdg_reason', 'like', 'stock_out%')
            ->orderBy('bodega_stock_logs.created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($log) {
                $parts = explode(':', $log->bdg_reason);
                $type = isset($parts[1]) ? strtoupper(trim($parts[1])) : 'ISSUE';
                return [
                    'id' => $log->bdg_id,
                    'date' => \Carbon\Carbon::parse($log->created_at)->format('n/j/Y, g:i:s A'),
                    'item' => $log->item_name,
                    'type' => $type,
                    'change' => $log->bdg_change_qty,
                    'new' => $log->bdg_new_qty,
                ];
            });

        $categories = \App\Models\Category::all()->map(function ($cat) {
            return [
                'id' => $cat->bdg_id,
                'name' => $cat->bdg_name,
                'type' => $cat->bdg_description,
            ];
        });

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
            // React passes back the bdg_id mapped as id
            'items.*.id' => 'required|exists:bodega_items,bdg_id',
            'items.*.transferQty' => 'required|integer|min:1',
            'requisition_id' => 'nullable|integer',
        ]);

        $transfer = StockTransfer::create([
            'bdg_reference_number' => 'TRX-' . strtoupper(uniqid()),
            'bdg_from_branch_id' => null, // Main Bodega
            'bdg_to_branch_id' => $request->to_branch_id,
            // 'bdg_requested_by' => auth()->id(), // Uncomment if auth is working
            'bdg_status' => 'completed',
        ]);

        foreach ($request->items as $reqItem) {
            $transfer->items()->create([
                'bdg_item_id' => $reqItem['id'],
                'bdg_quantity' => $reqItem['transferQty'],
            ]);

            // Adjust main bodega stock
            $item = Item::find($reqItem['id']);
            if ($item) {
                $item->decrement('bdg_stock_qty', $reqItem['transferQty']);

                // --- LIVE POS SYNCING ---
                    // Try to find the matching item in the live POS database
                    $posItemQuery = \Illuminate\Support\Facades\DB::connection('boutique_pos')->table('items');
                    if (!empty($item->bdg_sku)) {
                        $posItemQuery->where(function($q) use ($item) {
                            $q->where('sku', $item->bdg_sku)->orWhere('name', $item->bdg_name);
                        });
                    } else {
                        $posItemQuery->where('name', $item->bdg_name);
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
                        if ($item->bdg_category_id) {
                            $localCategory = \App\Models\Category::find($item->bdg_category_id);
                            if ($localCategory) $categoryName = $localCategory->bdg_name;
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
                                'name' => $item->bdg_name,
                                'sku' => $item->bdg_sku,
                                'cost' => $item->bdg_cost,
                                'price' => $item->bdg_price,
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
            'item_id' => 'required|exists:bodega_items,bdg_id',
            'quantity' => 'required|integer|min:1',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $item = Item::find($request->item_id);
        $newQty = $item->bdg_stock_qty + $request->quantity;
        
        $item->update(['bdg_stock_qty' => $newQty]);

        \Illuminate\Support\Facades\DB::table('bodega_stock_logs')->insert([
            'bdg_item_id' => $item->bdg_id,
            'bdg_change_qty' => $request->quantity,
            'bdg_new_qty' => $newQty,
            'bdg_reason' => 'stock_in',
            'bdg_reference' => $request->reference,
            'bdg_notes' => $request->notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'stock_restock',
            'description' => "Stock in: +{$request->quantity} for {$item->bdg_name}",
        ]);

        return redirect()->back()->with('success', 'Stock in successful!');
    }

    public function stockOut(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:bodega_items,bdg_id',
            'quantity' => 'required|integer|min:1',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
            'reason' => 'required|string', // Issue, Damage, etc.
        ]);

        $item = Item::find($request->item_id);
        
        if ($item->bdg_stock_qty < $request->quantity) {
            return redirect()->back()->withErrors(['quantity' => 'Insufficient stock.']);
        }

        $newQty = $item->bdg_stock_qty - $request->quantity;
        $item->update(['bdg_stock_qty' => $newQty]);

        \Illuminate\Support\Facades\DB::table('bodega_stock_logs')->insert([
            'bdg_item_id' => $item->bdg_id,
            'bdg_change_qty' => -$request->quantity,
            'bdg_new_qty' => $newQty,
            'bdg_reason' => 'stock_out: ' . $request->reason,
            'bdg_reference' => $request->reference,
            'bdg_notes' => $request->notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'stock_out',
            'description' => "Stock out: -{$request->quantity} for {$item->bdg_name} ({$request->reason})",
        ]);

        return redirect()->back()->with('success', 'Stock out successful!');
    }

    public function adjust(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:bodega_items,bdg_id',
            'name' => 'required|string',
            'capitalPrice' => 'required|numeric',
            'sellingPrice' => 'required|numeric',
        ]);

        $item = Item::find($request->item_id);
        $item->update([
            'bdg_name' => $request->name,
            'bdg_cost' => $request->capitalPrice,
            'bdg_price' => $request->sellingPrice,
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
                    $existsInLocal = \App\Models\Item::whereRaw('LOWER(bdg_name) = ?', [strtolower($value)])->exists();
                    if ($existsInLocal) {
                        $fail('This item name already exists in Bodega.');
                        return;
                    }
                    try {
                        $existsInPos = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                            ->table('items')
                            ->whereRaw('LOWER(bdg_name) = ?', [strtolower($value)])
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
            'category_id' => 'required|exists:bodega_categories,bdg_id',
            'capital_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'initial_stocks' => 'required|numeric|min:0',
        ]);

        $item = new \App\Models\Item();
        $item->bdg_name = $validated['name'];
        $item->bdg_category_id = $validated['category_id'];
        
        $sku = $validated['sku'] ?? null;
        if (empty($sku) || \App\Services\SkuGenerator::skuExists($sku)) {
            $item->bdg_sku = \App\Services\SkuGenerator::generate($item);
        } else {
            $item->bdg_sku = $sku;
        }
        
        $item->bdg_cost = $validated['capital_price'];
        $item->bdg_price = $validated['selling_price'];
        $item->bdg_stock_qty = $validated['initial_stocks'];
        $item->bdg_is_service = 0;
        $item->save();

        if ($validated['initial_stocks'] > 0) {
            \Illuminate\Support\Facades\DB::table('bodega_stock_logs')->insert([
                'bdg_item_id' => $item->bdg_id,
                'bdg_change_qty' => $validated['initial_stocks'],
                'bdg_new_qty' => $validated['initial_stocks'],
                'bdg_reason' => 'stock_in',
                'bdg_reference' => 'Initial Stock',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'item_added',
            'description' => "Added new item: {$item->bdg_name}",
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
        $category->bdg_name = $validated['name'];
        $category->bdg_description = $validated['type'];
        $category->save();

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'category_added',
            'description' => "Added new category: {$category->bdg_name}",
        ]);

        return redirect()->back();
    }

    public function rejectRequisition(Request $request, $id)
    {
        $requisition = \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->leftJoin('branches', 'branch_requisitions.branch_id', '=', 'branches.id')
            ->leftJoin('users', 'branch_requisitions.user_id', '=', 'users.id')
            ->select(
                'branch_requisitions.*',
                'branches.name as branch_name',
                'users.name as cashier_name'
            )
            ->where('branch_requisitions.id', $id)
            ->first();

        \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->where('id', $id)
            ->update([
                'status' => 'rejected',
                'is_notified' => false
            ]);

        if ($requisition) {
            $itemName = $requisition->item_name ?? 'Unknown Item';
            $branchName = $requisition->branch_name ?? 'Unknown Branch';
            $cashierName = $requisition->cashier_name ?? 'Unknown Cashier';
            $description = "Rejected {$requisition->quantity}x {$itemName} from {$branchName} requested by {$cashierName}";
        } else {
            $description = "Rejected branch requisition #{$id}";
        }

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'requisition_rejected',
            'description' => $description,
        ]);

        return redirect()->back()->with('success', 'Requisition rejected successfully.');
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:bodega_items,bdg_id',
        ]);

        \App\Models\Item::whereIn('bdg_id', $validated['ids'])->delete();

        \App\Models\ActivityLog::create([
            'actor_user_id' => auth()->id() ?? 1,
            'event_type' => 'items_deleted',
            'description' => "Deleted " . count($validated['ids']) . " item(s) from Bodega",
        ]);

        return redirect()->back()->with('success', 'Items deleted successfully.');
    }
}
