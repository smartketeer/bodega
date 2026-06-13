<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Item;
use App\Models\Category;

class ImportBalayInventory extends Command
{
    protected $signature = 'inventory:import-balay {file}';
    protected $description = 'Import Balay bodega inventory from CSV, cleaning old data first';

    public function handle()
    {
        $filePath = $this->argument('file');

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return 1;
        }

        // Parse CSV
        $rows = [];
        $handle = fopen($filePath, 'r');
        $header = fgetcsv($handle); // skip header row

        while (($data = fgetcsv($handle)) !== false) {
            $name = trim($data[0] ?? '');
            $qtyRaw = trim($data[1] ?? '0');

            if (empty($name)) continue;

            // Parse quantity - extract numeric value
            $qty = (int) preg_replace('/[^0-9]/', '', $qtyRaw);

            $rows[] = [
                'name' => $name,
                'quantity' => $qty,
                'qty_raw' => $qtyRaw,
            ];
        }
        fclose($handle);

        $this->info("Parsed " . count($rows) . " items from CSV.");

        // Categorize items
        $categoryMap = $this->categorizeItems($rows);

        $this->info("\nCategory breakdown:");
        foreach ($categoryMap as $cat => $items) {
            $this->info("  {$cat}: " . count($items) . " items");
        }

        if (!$this->confirm("\nThis will DELETE all existing items and related data, then import " . count($rows) . " new items. Continue?")) {
            $this->info("Aborted.");
            return 0;
        }

        try {
            // 1. Clean old data (order matters for foreign keys)
            $this->info("\n🗑️  Cleaning old data...");

            // Disable FK checks temporarily
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            // Delete related data
            $tables = [
                'branch_item_stocks',
                'stock_transfer_items',
                'stock_transfers',
                'product_images',
                'activity_logs',
                'stock_logs',
                'supply_entries',
            ];

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $count = DB::table($table)->count();
                    DB::table($table)->delete();
                    $this->info("  Cleared {$table} ({$count} records)");
                }
            }

            // Delete all items
            $itemCount = Item::count();
            DB::table('items')->delete();
            $this->info("  Cleared items ({$itemCount} records)");

            // Re-enable FK checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            // 2. Ensure categories exist
            $this->info("\n📦 Ensuring categories...");
            $categories = [
                'Salon Products' => null,
                'Beauty Products' => null,
                'General Merchandise' => null,
                'Other Products' => null,
            ];

            foreach ($categories as $catName => &$catId) {
                $cat = Category::firstOrCreate(
                    ['name' => $catName],
                    ['type' => 'product']
                );
                $catId = $cat->id;
                $this->info("  Category '{$catName}' => ID {$catId}");
            }
            unset($catId);

            // 3. Import new items
            $this->info("\n📥 Importing new items...");
            $imported = 0;

            foreach ($categoryMap as $catName => $items) {
                $categoryId = $categories[$catName] ?? $categories['Other Products'];

                foreach ($items as $row) {
                    $item = Item::create([
                        'name' => $row['name'],
                        'sku' => null,
                        'price' => 0,
                        'cost' => 0,
                        'stock_qty' => $row['quantity'],
                        'category_id' => $categoryId,
                        'is_service' => false,
                        'primary_image_id' => null,
                    ]);

                    // Also create branch_item_stocks for both branches (Luna=2, Roxas=3)
                    // Bodega items go to both branches with the CSV quantity
                    DB::table('branch_item_stocks')->insert([
                        [
                            'branch_id' => 2, // Luna Branch
                            'item_id' => $item->id,
                            'quantity' => $row['quantity'],
                            'location' => 'Bodega-Balay',
                            'last_restock_date' => now(),
                            'total_sold' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                        [
                            'branch_id' => 3, // Roxas Branch
                            'item_id' => $item->id,
                            'quantity' => 0,
                            'location' => null,
                            'last_restock_date' => null,
                            'total_sold' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    ]);

                    $imported++;
                }
            }

            $this->info("\n✅ Successfully imported {$imported} items!");
            $this->info("   Items table now has: " . Item::count() . " records");
            $this->info("   Branch stocks: " . DB::table('branch_item_stocks')->count() . " records");

            return 0;

        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            $this->error("Import failed: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }

    private function categorizeItems(array $rows): array
    {
        $categories = [
            'Salon Products' => [],
            'Beauty Products' => [],
            'General Merchandise' => [],
            'Other Products' => [],
        ];

        foreach ($rows as $row) {
            $name = strtolower($row['name']);

            if ($this->isSalonProduct($name)) {
                $categories['Salon Products'][] = $row;
            } elseif ($this->isBeautyProduct($name)) {
                $categories['Beauty Products'][] = $row;
            } elseif ($this->isGeneralMerchandise($name)) {
                $categories['General Merchandise'][] = $row;
            } else {
                $categories['Other Products'][] = $row;
            }
        }

        return $categories;
    }

    private function isSalonProduct(string $name): bool
    {
        $keywords = [
            'cps ', 'bremod ', 'fusion ', 'lightness milk', 'pogada', 'cold wave',
            'brazillian botox', 'brazilian botox', 'ranked',
        ];

        foreach ($keywords as $kw) {
            if (str_contains($name, $kw)) return true;
        }

        return false;
    }

    private function isBeautyProduct(string $name): bool
    {
        $keywords = [
            'beauty vault', 'hamisan', 'fairy skin', 'habibi', 'hakari',
            'love skin', 'yasuy', 'brilliant', 'beauty milk', 'collagen fit',
            'sunscreen', 'skin perfection', 'bs rejuv', 'sy glow', 'hikari',
            'a bonne', 'gluta papaya', 'pink glam', 'amazing beauty',
            'beauty smoothie', 'kiffy', 'geisha', 'rejuv', 'sunblock',
            'hair serum',
        ];

        foreach ($keywords as $kw) {
            if (str_contains($name, $kw)) return true;
        }

        return false;
    }

    private function isGeneralMerchandise(string $name): bool
    {
        $keywords = [
            'tape', 'scoth', 'scotch', 'nano', 'double sided', 'shades', 'reading glass',
            'nail file', 'glue', 'bond aid', 'pencil', 'blade', 'marker', 'ballpen',
            'sign pen', 'rays', 'alcohol', 'ethyl', 'bella miss', 'shampoo',
            'lucky talcum', 'soap',
        ];

        foreach ($keywords as $kw) {
            if (str_contains($name, $kw)) return true;
        }

        return false;
    }
}
