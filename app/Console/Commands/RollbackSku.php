<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use App\Models\Item;

class RollbackSku extends Command
{
    protected $signature = 'inventory:rollback-sku {backup-file?}';
    protected $description = 'Rollback SKU changes using a backup file';

    public function handle()
    {
        $this->info('==========================================');
        $this->info('Bodega SKU Rollback Tool');
        $this->info('==========================================');

        // Find backup files
        $backupFiles = collect(Storage::disk('local')->files())
            ->filter(fn($file) => str_starts_with($file, 'sku_backup_'))
            ->sortDesc()
            ->values();

        if ($backupFiles->isEmpty()) {
            $this->error('No SKU backup files found!');
            return 1;
        }

        // Let user choose backup file
        $backupFile = $this->argument('backup-file');
        if (!$backupFile) {
            $this->info("\n📁 Available backup files (most recent first):");
            foreach ($backupFiles as $index => $file) {
                $this->info("   [" . ($index + 1) . "] " . $file);
            }
            $choice = $this->ask("\nWhich backup would you like to restore? (Enter number)", 1);
            $backupFile = $backupFiles[$choice - 1] ?? $backupFiles[0];
        } else {
            // Verify the file exists
            if (!Storage::disk('local')->exists($backupFile)) {
                $this->error("Backup file '{$backupFile}' not found!");
                return 1;
            }
        }

        // Read and parse backup file
        $this->info("\n📥 Reading backup file: {$backupFile}");
        $backupData = json_decode(Storage::disk('local')->get($backupFile), true);

        if (!$backupData) {
            $this->error('Failed to read backup file!');
            return 1;
        }

        $this->info("   Found " . count($backupData) . " items in backup");

        // Show what will be restored
        $this->info("\n📊 Items to restore:");
        $this->table(
            ['Item', 'Original SKU', 'Current SKU'],
            collect($backupData)->map(function ($item) {
                $currentItem = Item::find($item['id']);
                return [
                    $item['name'],
                    $item['original_sku'] ?? '(none)',
                    $currentItem ? ($currentItem->bdg_sku ?? '(none)') : '(not found)',
                ];
            })->toArray()
        );

        if (!$this->confirm("\nProceed to restore original SKUs from this backup?")) {
            $this->info('Aborted.');
            return 0;
        }

        // Restore SKUs
        $this->info("\n💾 Restoring original SKUs...");
        $restored = 0;

        foreach ($backupData as $backupItem) {
            $item = Item::find($backupItem['id']);
            if (!$item) {
                $this->warn("   ⚠️  Item not found: {$backupItem['name']} (ID: {$backupItem['id']})");
                continue;
            }

            $item->bdg_sku = $backupItem['original_sku'];
            $item->save();
            $restored++;
            $this->info("   ✓ {$item->bdg_name} → SKU: " . ($item->bdg_sku ?? '(none)'));
        }

        $this->info("\n✅ Done! Restored {$restored} items' original SKUs!");

        return 0;
    }
}
