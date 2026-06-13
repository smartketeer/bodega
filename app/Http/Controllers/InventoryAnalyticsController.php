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
            return $item->stock_qty * $item->price;
        });

        $totalItemsInStock = $items->sum('stock_qty');

        $topByStock = $items->sortByDesc('stock_qty')->take(5)->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'qty' => $item->stock_qty,
                'value' => $item->stock_qty * $item->price
            ];
        })->values();

        $topByCapital = $items->map(function ($item) {
            $value = $item->stock_qty * $item->price;
            return [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'qty' => $item->stock_qty,
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
            ->where('stock_qty', '>', 0)
            ->where('updated_at', '<', $thirtyDaysAgo)
            ->get();

        $deadStockItems = $deadStocks->map(function ($item) {
            $daysStagnant = Carbon::parse($item->updated_at)->diffInDays(Carbon::now());
            
            $status = 'Warning';
            if ($daysStagnant > 60) $status = 'Severe';
            elseif ($daysStagnant > 45) $status = 'Critical';
            
            return [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'daysStagnant' => $daysStagnant,
                'qty' => $item->stock_qty,
                'capitalLocked' => $item->stock_qty * $item->price,
                'category' => $item->category ? $item->category->name : 'Uncategorized',
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
