<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncPosItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:sync-pos-items';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync missing items from the POS items table to the bodega_items table with 0 stock.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting sync of POS items to Bodega...');

        $posItems = DB::table('items')->get();
        $syncedCount = 0;

        foreach ($posItems as $posItem) {
            $exists = DB::table('bodega_items')->where('bdg_name', $posItem->name)->exists();

            if (!$exists) {
                // Map the category ID if possible. If the categories in POS are different, we might just null it or try to match by name.
                // Assuming Bodega categories were seeded, let's try to match category names.
                $posCategory = DB::table('categories')->where('id', $posItem->category_id)->first();
                $bdgCategoryId = null;

                if ($posCategory) {
                    $bdgCategory = DB::table('bodega_categories')->where('bdg_name', $posCategory->name)->first();
                    if ($bdgCategory) {
                        $bdgCategoryId = $bdgCategory->bdg_id;
                    }
                }

                DB::table('bodega_items')->insert([
                    'bdg_category_id' => $bdgCategoryId,
                    'bdg_name' => $posItem->name,
                    'bdg_sku' => $posItem->sku,
                    'bdg_price' => $posItem->price,
                    'bdg_cost' => $posItem->cost,
                    'bdg_stock_qty' => 0, // Force 0 stock as per plan
                    'bdg_is_service' => $posItem->is_service ?? false,
                    'bdg_primary_image_id' => $posItem->primary_image_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $syncedCount++;
                $this->info("Synced: {$posItem->name}");
            }
        }

        $this->info("Sync complete. $syncedCount items added to Bodega.");
    }
}
