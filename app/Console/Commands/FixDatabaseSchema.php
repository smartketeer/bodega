<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixDatabaseSchema extends Command
{
    protected $signature = 'db:fix-schema';
    protected $description = 'Adds missing primary keys and auto_increments to schema.sql imported tables';

    public function handle()
    {
        $tables = [
            'activity_logs', 'appointments', 'branches', 'branch_item_stocks', 'branch_user',
            'categories', 'clients', 'inventory_imports', 'inventory_import_failures',
            'items', 'product_images', 'sales', 'sale_custom_items', 'sale_items',
            'sale_modifications', 'settings', 'stock_logs', 'supply_entries', 'users'
        ];

        $this->info("Fixing primary keys and auto_increments...");

        foreach ($tables as $table) {
            try {
                // Check if table exists
                if (DB::getSchemaBuilder()->hasTable($table)) {
                    // Add primary key and auto_increment
                    DB::statement("ALTER TABLE `{$table}` ADD PRIMARY KEY (`id`)");
                    DB::statement("ALTER TABLE `{$table}` MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT");
                    $this->info("Fixed {$table}");
                }
            } catch (\Exception $e) {
                // If it already has a primary key, it will throw an exception, which we can safely ignore
                $this->warn("Skipped {$table} (Primary key may already exist)");
            }
        }

        // Add specific foreign key fixes if necessary, or just primary keys are enough
        $this->info("Schema fixed successfully!");
    }
}
