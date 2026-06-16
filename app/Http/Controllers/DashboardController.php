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

        // Exclude POS-specific cashier activities
        $excludedEvents = [
            'Sale Completed', 'sale_completed', 
            'transaction_completed',
            'stock_restock',
            'void_transaction'
        ];

        // ActivityLog uses POS activity_logs table for now, since Bodega shares the POS database natively.
        $logs = ActivityLog::with('actor')
            ->whereNotIn('event_type', $excludedEvents)
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get();
        
        $activityStream = $logs->map(function ($log) {
            $type = 'activity';
            $eventTypeLower = strtolower($log->event_type);

            if (str_contains($eventTypeLower, 'transfer')) $type = 'transfer';
            elseif (str_contains($eventTypeLower, 'restock') || str_contains($eventTypeLower, 'added') || str_contains($eventTypeLower, 'created')) $type = 'restock';
            elseif (str_contains($eventTypeLower, 'alert') || str_contains($eventTypeLower, 'revoked') || str_contains($eventTypeLower, 'rejected')) $type = 'alert';
            
            $actorName = $log->actor ? $log->actor->name : 'Admin User';
            $timestamp = $log->created_at->format('M d, Y | h:i A');
            $timeAgo = $log->created_at->isFuture() ? 'Just now' : $log->created_at->diffForHumans();
            
            // Refine generic descriptions to be more specific based on live events
            $description = $log->description;
            if ($log->event_type === 'Auth Login' || str_contains($description, 'logged into')) {
                $description = "Logged into the system.";
            } elseif ($log->event_type === 'Auth Logout' || str_contains($description, 'logged out')) {
                $description = "Logged out of the system.";
            } elseif (str_contains($description, 'inventory item via approved inventory management access')) {
                // Remove generic part if it's too long, or leave it as is
                $description = "Modified inventory via management access.";
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
