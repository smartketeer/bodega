<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $notifications = [];
        $notifId = 1;

        if (class_exists(\App\Models\BranchItemStock::class)) {
            $lowStocks = \App\Models\BranchItemStock::with(['item', 'branch'])
                ->where('quantity', '<=', 10)
                ->whereHas('item')
                ->whereHas('branch')
                ->latest('updated_at')
                ->take(3)
                ->get();

            foreach ($lowStocks as $stock) {
                $timeLabel = $stock->updated_at->isFuture() ? 'Just now' : $stock->updated_at->diffForHumans();
                $notifications[] = [
                    'id' => $notifId++,
                    'type' => 'alert',
                    'title' => 'Low Stock: ' . $stock->branch->name,
                    'message' => $stock->item->name . ' is at critical level (' . $stock->quantity . ').',
                    'time' => str_replace('from now', 'ago', $timeLabel)
                ];
            }
        }

        if (class_exists(\App\Models\StockTransfer::class)) {
            $pendingTransfers = \App\Models\StockTransfer::where('status', 'pending')
                ->with('toBranch')
                ->latest('created_at')
                ->take(2)
                ->get();
            
            foreach ($pendingTransfers as $transfer) {
                $branchName = $transfer->toBranch ? $transfer->toBranch->name : 'Branch';
                $timeLabel = $transfer->created_at->isFuture() ? 'Just now' : $transfer->created_at->diffForHumans();
                $notifications[] = [
                    'id' => $notifId++,
                    'type' => 'transfer',
                    'title' => 'Pending Transfer',
                    'message' => 'Transfer ' . $transfer->reference_number . ' awaits approval.',
                    'time' => str_replace('from now', 'ago', $timeLabel)
                ];
            }
        }

        if (empty($notifications)) {
            $notifications[] = [
                'id' => $notifId++,
                'type' => 'info',
                'title' => 'System Status',
                'message' => 'All inventory levels are healthy. No pending transfers.',
                'time' => 'Just now'
            ];
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'globalNotifications' => $notifications,
        ];
    }
}
