<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Item;

class ImportBodegaInventory extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bodega:import-inventory {file?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Replace bodega inventory with a new CSV dataset';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $filePath = $this->argument('file');
        
        if (!$filePath) {
            $filePath = 'D:\bodega\BODEGA NEW(Sheet1).csv';
        }

        if (!file_exists($filePath)) {
            $this->error("File not found at: {$filePath}");
            return 1;
        }

        $this->info("Importing from {$filePath}...");

        $file = fopen($filePath, 'r');
        
        // Read header
        $header = fgetcsv($file);

        $inserted = 0;

        // Wipe the old data safely
        $this->info("Wiping old data...");
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Item::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        while (($row = fgetcsv($file)) !== false) {
            // Check if row is empty or has not enough columns
            if (empty($row[0])) {
                continue;
            }

            $name = trim($row[0]);
            $quantityString = isset($row[1]) ? trim($row[1]) : '0';
            
            // Extract numeric value from quantity (e.g. "9 pcs" -> 9, "7 Roll" -> 7)
            preg_match('/^(\d+)/', $quantityString, $matches);
            $quantity = isset($matches[1]) ? (int)$matches[1] : 0;

            // Insert new item
            $newItem = new Item();
            $newItem->bdg_name = $name;
            $newItem->bdg_stock_qty = $quantity;
            $newItem->bdg_cost = 0;
            $newItem->bdg_price = 0;
            $newItem->bdg_is_service = 0;
            $newItem->bdg_category_id = null;
            $newItem->save();

            // If SkuGenerator exists, we can try to use it if needed, but we skip to be safe from errors.
            if (class_exists('\App\Services\SkuGenerator')) {
                try {
                    $newItem->bdg_sku = \App\Services\SkuGenerator::generate($newItem);
                    $newItem->save();
                } catch (\Exception $e) {
                    // Ignore
                }
            }
            
            $inserted++;
        }

        fclose($file);

        $this->info("Replacement complete. {$inserted} items inserted into the database.");

        return 0;
    }
}
