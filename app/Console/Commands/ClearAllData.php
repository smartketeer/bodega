<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearAllData extends Command
{
    protected $signature = 'db:clear-all';
    protected $description = 'Delete all data from all tables in the bodega database';

    public function handle()
    {
        $tables = DB::select('SHOW TABLES');
        $dbName = config('database.connections.mysql.database');

        $this->info("Database: {$dbName}");
        $this->info("Tables found: " . count($tables));

        // Show current row counts
        $this->table(['Table', 'Rows'], collect($tables)->map(function ($t) {
            $name = array_values((array) $t)[0];
            return [$name, DB::table($name)->count()];
        })->toArray());

        if (!$this->confirm('Delete ALL data from ALL tables? This cannot be undone.')) {
            $this->info('Aborted.');
            return 0;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ($tables as $t) {
            $name = array_values((array) $t)[0];

            // Skip migrations table to keep Laravel's migration state
            if ($name === 'migrations') {
                $this->warn("  Skipped: {$name} (migration tracking)");
                continue;
            }

            $count = DB::table($name)->count();
            DB::table($name)->truncate();
            $this->info("  Cleared: {$name} ({$count} rows deleted)");
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->info("\n✅ All data has been deleted from the bodega database.");
        return 0;
    }
}
