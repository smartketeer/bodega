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
            'sale_modifications', 'settings', 'stock_logs', 'supply_entries', 'users',
            'migrations', 'stock_transfers'
        ];

        $this->info("Fixing primary keys and auto_increments...");

        foreach ($tables as $table) {
            // Check if table exists
            if (DB::getSchemaBuilder()->hasTable($table)) {
                try {
                    // Add primary key
                    DB::statement("ALTER TABLE `{$table}` ADD PRIMARY KEY (`id`)");
                } catch (\Exception $e) {
                    // Ignore if primary key already exists
                }

                try {
                    // Add auto_increment
                    $type = $table === 'migrations' ? 'int(10)' : 'bigint(20)';
                    DB::statement("ALTER TABLE `{$table}` MODIFY `id` {$type} UNSIGNED NOT NULL AUTO_INCREMENT");
                    $this->info("Fixed auto-increment for {$table}");
                } catch (\Exception $e) {
                    $this->warn("Could not modify auto-increment for {$table}");
                }
            }
        }

        // Add specific foreign key fixes if necessary, or just primary keys are enough
        $this->info("Schema fixed successfully!");
    }
}
