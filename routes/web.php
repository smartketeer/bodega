<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\InventoryAnalyticsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryMasterlistController;

Route::get('/', [DashboardController::class, 'bodegaDashboard']);
Route::get('/bodega-dashboard', [DashboardController::class, 'bodegaDashboard']);
Route::get('/inventory-masterlist', [InventoryMasterlistController::class, 'index']);
Route::post('/inventory-masterlist/{id}/image', [InventoryMasterlistController::class, 'uploadImage']);
Route::delete('/inventory-masterlist/{id}/image', [InventoryMasterlistController::class, 'deleteImage']);

Route::get('/stock-transfers', [\App\Http\Controllers\StockTransferController::class, 'index']);
Route::post('/stock-transfers', [\App\Http\Controllers\StockTransferController::class, 'store']);

Route::get('/dead-stock', [InventoryAnalyticsController::class, 'deadStock']);
Route::get('/reports', [InventoryAnalyticsController::class, 'reports']);

Route::get('/dashboard', [DashboardController::class, 'storeDashboard'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
