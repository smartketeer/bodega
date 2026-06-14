<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\BranchItemStock;
use App\Models\Item;
use App\Models\Branch;
use Illuminate\Http\Request;
use Carbon\Carbon;

class InventoryAnalyticsController extends Controller
{


    public function reports()
    {
        $items = Item::all();
        $branchStocks = BranchItemStock::with(['branch', 'item'])->get();

        $totalInventoryValue = $items->sum(function ($item) {
            return $item->bdg_stock_qty * $item->bdg_price;
        });

        $totalItemsInStock = $items->sum('bdg_stock_qty');

        $topByStock = $items->sortByDesc('bdg_stock_qty')->take(5)->map(function ($item) {
            return [
                'id' => $item->bdg_id,
                'name' => $item->bdg_name,
                'sku' => $item->bdg_sku,
                'qty' => $item->bdg_stock_qty,
                'value' => $item->bdg_stock_qty * $item->bdg_price
            ];
        })->values();

        $topByCapital = $items->map(function ($item) {
            $value = $item->bdg_stock_qty * $item->bdg_price;
            return [
                'id' => $item->bdg_id,
                'name' => $item->bdg_name,
                'sku' => $item->bdg_sku,
                'qty' => $item->bdg_stock_qty,
                'value' => $value
            ];
        })->sortByDesc('value')->take(5)->values();

        // Branch Distribution
        $branchDistribution = [];
        $totalBranchValue = 0;
        
        foreach ($branchStocks as $stock) {
            if (!$stock->branch || !$stock->item) continue;
            
            $branchName = $stock->branch->name;
            $value = $stock->quantity * $stock->item->price;
            
            if (!isset($branchDistribution[$branchName])) {
                $branchDistribution[$branchName] = 0;
            }
            
            $branchDistribution[$branchName] += $value;
            $totalBranchValue += $value;
        }
        
        $branchDistResult = [];
        foreach ($branchDistribution as $name => $value) {
            $branchDistResult[] = [
                'branch' => $name,
                'value' => $value,
                'percentage' => $totalBranchValue > 0 ? round(($value / $totalBranchValue) * 100) : 0
            ];
        }

        return Inertia::render('Reports', [
            'topByStock' => $topByStock,
            'topByCapital' => $topByCapital,
            'branchDistribution' => collect($branchDistResult)->sortByDesc('value')->values(),
            'totalInventoryValue' => $totalInventoryValue,
            'totalItemsInStock' => $totalItemsInStock
        ]);
    }

    public function deadStock()
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        
        $deadStocks = Item::with('category')
            ->where('bdg_stock_qty', '>', 0)
            ->where('updated_at', '<', $thirtyDaysAgo)
            ->get();

        $deadStockItems = $deadStocks->map(function ($item) {
            $daysStagnant = Carbon::parse($item->updated_at)->diffInDays(Carbon::now());
            
            $status = 'Warning';
            if ($daysStagnant > 60) $status = 'Severe';
            elseif ($daysStagnant > 45) $status = 'Critical';
            
            return [
                'id' => $item->bdg_id,
                'name' => $item->bdg_name,
                'sku' => $item->bdg_sku,
                'daysStagnant' => $daysStagnant,
                'qty' => $item->bdg_stock_qty,
                'capitalLocked' => $item->bdg_stock_qty * $item->bdg_price,
                'category' => $item->category ? $item->category->bdg_name : 'Uncategorized',
                'status' => $status
            ];
        })->values();

        $totalItemsAtRisk = $deadStockItems->count();
        $capitalLocked = $deadStockItems->sum('capitalLocked');
        $avgStagnation = $deadStockItems->count() > 0 ? round($deadStockItems->avg('daysStagnant')) : 0;

        return Inertia::render('DeadStock', [
            'deadStockItems' => $deadStockItems,
            'totalItemsAtRisk' => $totalItemsAtRisk,
            'capitalLocked' => $capitalLocked,
            'avgStagnation' => $avgStagnation
        ]);
    }
}
