<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ListBoutiqueTables extends Command
{
    protected $signature = 'boutique:list-tables';
    protected $description = 'List all tables and columns in the Boutique-POS database';

    public function handle()
    {
        $this->info('==========================================');
        $this->info('Boutique-POS Database Tables');
        $this->info('==========================================');

        try {
            // Get all tables
            $tables = DB::connection('boutique_pos')->select('SHOW TABLES');

            if (empty($tables)) {
                $this->error('No tables found in Boutique-POS database!');
                return 1;
            }

            $this->info("\nAvailable tables:");
            foreach ($tables as $table) {
                $tableName = array_values((array)$table)[0];
                $this->line("  - $tableName");
            }

            // Ask which table to inspect
            $tableName = $this->ask('Which table would you like to see the columns for?');

            if ($tableName) {
                $columns = DB::connection('boutique_pos')->select("SHOW COLUMNS FROM `$tableName`");

                $this->info("\nColumns in `$tableName`:");
                $this->table(
                    ['Field', 'Type'],
                    collect($columns)->map(fn($col) => [$col->Field, $col->Type])->toArray()
                );
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }
}
