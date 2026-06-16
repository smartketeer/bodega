<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Item;
use App\Models\BranchItemStock;
use App\Models\StockTransfer;
use App\Models\Sale;
use App\Models\ActivityLog;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function bodegaDashboard()
    {
        $items = Item::all();
        $capitalTiedUp = $items->sum(function($item) {
            return $item->bdg_stock_qty * $item->bdg_price;
        });

        $pendingRequests = \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->where('status', 'pending')
            ->count();

        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $deadStockCount = Item::where('bdg_stock_qty', '>', 0)
            ->where('updated_at', '<', $thirtyDaysAgo)
            ->count();

        // Only include Bodega-specific events, and Admin Auth logs. Exclude any POS or mock data.
        $bodegaEvents = [
            'stock_transfer',
            'stock_restock',
            'stock_out',
            'item_adjusted',
            'item_added',
            'category_added',
            'requisition_rejected',
            'items_deleted'
        ];

        $logs = ActivityLog::with('actor')
            ->where(function ($query) use ($bodegaEvents) {
                $query->whereIn('event_type', $bodegaEvents)
                      ->orWhere(function ($q) {
                          $q->whereIn('event_type', ['Auth Login', 'Auth Logout', 'login', 'logout'])
                            ->whereHas('actor', function ($actorQuery) {
                                $actorQuery->where('role', 'admin');
                            });
                      });
            })
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get();
        
        $activityStream = $logs->map(function ($log) {
            $type = 'activity';
            $eventTypeLower = strtolower($log->event_type);

            if (str_contains($eventTypeLower, 'transfer')) $type = 'transfer';
            elseif (str_contains($eventTypeLower, 'restock') || str_contains($eventTypeLower, 'added') || str_contains($eventTypeLower, 'created')) $type = 'restock';
            elseif (str_contains($eventTypeLower, 'alert') || str_contains($eventTypeLower, 'revoked') || str_contains($eventTypeLower, 'rejected') || str_contains($eventTypeLower, 'deleted')) $type = 'alert';
            
            $actorName = $log->actor ? $log->actor->name : 'Admin User';
            $timestamp = $log->created_at->format('M d, Y | h:i A');
            $timeAgo = $log->created_at->isFuture() ? 'Just now' : $log->created_at->diffForHumans();
            
            $description = $log->description;
            if ($log->event_type === 'Auth Login' || str_contains($description, 'logged into')) {
                $description = "Logged into the Bodega system.";
            } elseif ($log->event_type === 'Auth Logout' || str_contains($description, 'logged out')) {
                $description = "Logged out of the Bodega system.";
            } elseif ($log->event_type === 'requisition_rejected') {
                if (preg_match('/Rejected branch requisition #(\d+)/i', $description, $matches)) {
                    $id = $matches[1];
                    $requisition = \Illuminate\Support\Facades\DB::connection('boutique_pos')
                        ->table('branch_requisitions')
                        ->leftJoin('branches', 'branch_requisitions.branch_id', '=', 'branches.id')
                        ->leftJoin('users', 'branch_requisitions.user_id', '=', 'users.id')
                        ->select('branch_requisitions.*', 'branches.name as branch_name', 'users.name as cashier_name')
                        ->where('branch_requisitions.id', $id)
                        ->first();
                    
                    if ($requisition) {
                        $itemName = $requisition->item_name ?? 'Unknown Item';
                        $branchName = $requisition->branch_name ?? 'Unknown Branch';
                        $cashierName = $requisition->cashier_name ?? 'Unknown Cashier';
                        $description = "rejected {$requisition->quantity}x {$itemName} from {$branchName} requested by {$cashierName}";
                    } else {
                        $description = lcfirst($description);
                    }
                } else {
                    $description = lcfirst($description);
                }
                // Prepend actor name to make it "Admin User rejected..."
                $description = "{$actorName} {$description}";
            }
            
            return [
                'id' => $log->id,
                'title' => ucwords(str_replace('_', ' ', $log->event_type)),
                'description' => $description,
                'time' => str_replace('from now', 'ago', $timeAgo),
                'timestamp' => $timestamp,
                'actor' => $actorName,
                'type' => $type
            ];
        });

        if ($activityStream->isEmpty()) {
            // Provide a graceful empty state since activity logs might not exist yet
            $activityStream = collect([]);
        }

        return Inertia::render('BodegaDashboard', [
            'capitalTiedUp' => $capitalTiedUp,
            'pendingRequests' => $pendingRequests,
            'deadStockCount' => $deadStockCount,
            'activityStreamProp' => $activityStream
        ]);
    }

    public function storeDashboard()
    {
        $lowStockAlerts = BranchItemStock::where('quantity', '<', 10)->count();

        $overallRevenue = Sale::sum('total_amount');
        $overallTransactions = Sale::count();

        // Luna Branch Est. Retail Value
        $lunaValue = 0;
        $lunaStocks = BranchItemStock::with('item')->whereHas('branch', function($q) {
            $q->where('name', 'like', '%Luna%');
        })->get();

        foreach ($lunaStocks as $stock) {
            if ($stock->item) {
                $lunaValue += ($stock->quantity * $stock->item->price);
            }
        }

        return Inertia::render('Dashboard', [
            'lowStockAlerts' => $lowStockAlerts,
            'overallRevenue' => $overallRevenue,
            'overallTransactions' => $overallTransactions,
            'lunaBranchValue' => $lunaValue
        ]);
    }
}
