<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Branch;

use Illuminate\Support\Facades\DB;

class SeedBranches extends Command
{
    protected $signature = 'bodega:sync-branches';
    protected $description = 'Sync branches from the main Boutique POS database into Bodega';

    public function handle()
    {
        $this->info('Connecting to boutique-pos.com database...');
        
        try {
            // Attempt to fetch from POS database 'locations' table
            $posLocations = DB::connection('boutique_pos')->table('locations')->whereNull('deleted_at')->get();
            
            if ($posLocations->isEmpty()) {
                $this->warn('No locations found in boutique_pos database. Defaulting to Roxas and Luna Branch...');
                $this->seedDefaults();
                return 0;
            }

            foreach ($posLocations as $location) {
                Branch::updateOrCreate(
                    ['name' => $location->name],
                    ['is_active' => 1]
                );
                $this->info("Synced: " . $location->name);
            }
            
            $this->info('Branches successfully synced from boutique-pos.com!');
        } catch (\Exception $e) {
            $this->error('Failed to connect to boutique_pos database: ' . $e->getMessage());
            $this->warn('Falling back to default branches (Roxas Branch, Luna Branch)...');
            
            $this->seedDefaults();
        }

        return 0;
    }

    private function seedDefaults()
    {
        Branch::updateOrCreate(['name' => 'Roxas Branch'], ['is_active' => 1]);
        Branch::updateOrCreate(['name' => 'Luna Branch'], ['is_active' => 1]);
        $this->info('Default Branches (Roxas Branch, Luna Branch) have been successfully aligned and connected to the database!');
    }
}
