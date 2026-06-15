<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\InventoryAnalyticsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryMasterlistController;

Route::middleware('auth')->group(function () {
    Route::get('/', [DashboardController::class, 'bodegaDashboard']);
    Route::get('/bodega-dashboard', [DashboardController::class, 'bodegaDashboard']);
    Route::get('/inventory-masterlist', [InventoryMasterlistController::class, 'index']);
    Route::post('/inventory-masterlist/{id}/image', [InventoryMasterlistController::class, 'uploadImage']);
    Route::delete('/inventory-masterlist/{id}/image', [InventoryMasterlistController::class, 'deleteImage']);

    Route::get('/stock-transfers', [\App\Http\Controllers\StockTransferController::class, 'index']);
    Route::post('/stock-transfers', [\App\Http\Controllers\StockTransferController::class, 'store']);
    Route::post('/stock-transfers/reject-requisition/{id}', [\App\Http\Controllers\StockTransferController::class, 'rejectRequisition']);
    Route::post('/stock-in', [\App\Http\Controllers\StockTransferController::class, 'stockIn']);
    Route::post('/stock-out', [\App\Http\Controllers\StockTransferController::class, 'stockOut']);
    Route::post('/stock-adjust', [\App\Http\Controllers\StockTransferController::class, 'adjust']);
    Route::post('/items', [\App\Http\Controllers\StockTransferController::class, 'storeItem']);
    Route::post('/items/bulk-delete', [\App\Http\Controllers\StockTransferController::class, 'bulkDelete']);
    Route::post('/categories', [\App\Http\Controllers\StockTransferController::class, 'storeCategory']);

    Route::get('/dead-stock', [InventoryAnalyticsController::class, 'deadStock']);
    Route::get('/reports', [InventoryAnalyticsController::class, 'reports']);

    Route::get('/dashboard', [DashboardController::class, 'storeDashboard'])->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

Route::get('/debug-session', function () {
    return response()->json([
        'expected_cookie_name' => config('session.cookie'),
        'received_cookie' => request()->cookie(config('session.cookie')) ? 'YES' : 'NO',
        'all_cookies' => array_keys(request()->cookies->all()),
        'database_connection' => config('database.connections.mysql.database'),
        'session_driver' => config('session.driver'),
        'app_key_match' => config('app.key') === 'base64:T3xyyd+wBc0cVlb7WA+yp57wAethBCvAZ5XcnAI1aeo=' ? 'YES' : 'NO'
    ]);
});
