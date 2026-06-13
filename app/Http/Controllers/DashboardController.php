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
            return $item->stock_qty * $item->price;
        });

        $pendingRequests = StockTransfer::where('status', 'Pending')->count();

        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $deadStockCount = Item::where('stock_qty', '>', 0)
            ->where('updated_at', '<', $thirtyDaysAgo)
            ->count();

        if ($deadStockCount == 0) {
            $deadStockCount = Item::where('stock_qty', '>', 0)->count(); // fallback for mock data
        }

        // Exclude POS-specific cashier activities
        $excludedEvents = [
            'Sale Completed', 'sale_completed', 
            'Auth Logout', 'auth_logout', 
            'Auth Login', 'auth_login', 
            'Sale Voided', 'sale_voided', 
            'void_transaction'
        ];

        $logs = ActivityLog::whereNotIn('event_type', $excludedEvents)
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();
        
        $activityStream = $logs->map(function ($log) {
            $type = 'activity';
            if (str_contains(strtolower($log->event_type), 'transfer')) $type = 'transfer';
            elseif (str_contains(strtolower($log->event_type), 'restock')) $type = 'restock';
            elseif (str_contains(strtolower($log->event_type), 'alert')) $type = 'alert';
            
            $timeLabel = $log->created_at->isFuture() ? 'Just now' : $log->created_at->diffForHumans();
            
            return [
                'id' => $log->id,
                'title' => ucwords(str_replace('_', ' ', $log->event_type)),
                'description' => $log->description,
                'time' => str_replace('from now', 'ago', $timeLabel),
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
