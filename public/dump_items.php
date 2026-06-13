<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

try {
    $items = \Illuminate\Support\Facades\DB::connection('boutique_pos')
        ->table('items')
        ->orderBy('id', 'desc')
        ->take(5)
        ->get();
        
    $stocks = \Illuminate\Support\Facades\DB::connection('boutique_pos')
        ->table('branch_item_stocks')
        ->orderBy('id', 'desc')
        ->take(5)
        ->get();
        
    echo "<h1>Recent Items in POS</h1>";
    echo "<pre>" . json_encode($items, JSON_PRETTY_PRINT) . "</pre>";
    
    echo "<h1>Recent Branch Stocks in POS</h1>";
    echo "<pre>" . json_encode($stocks, JSON_PRETTY_PRINT) . "</pre>";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
