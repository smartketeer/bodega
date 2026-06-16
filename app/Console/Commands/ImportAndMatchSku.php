<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Item;

class ImportAndMatchSku extends Command
{
    protected $signature = 'inventory:match-sku';
    protected $description = 'Import SKUs from Boutique-POS, match with bodega items using fuzzy matching, and assign SKUs';

    public function handle()
    {
        ini_set('memory_limit', '512M');
        set_time_limit(0);

        $this->info('==========================================');
        $this->info('Bodega SKU Import & Matching Tool');
        $this->info('==========================================');

        try {
            // Step 1: Get items from both databases
            $this->info("\n📥 Fetching items from Boutique-POS database...");
            $boutiqueItems = DB::connection('boutique_pos')
                ->table('items')
                ->get(['id', 'name', 'sku', 'price']);
            $this->info("   Found {$boutiqueItems->count()} items in Boutique-POS");

            $bodegaItems = Item::all(['bdg_id', 'bdg_name', 'bdg_sku', 'bdg_price'])
                ->filter(fn($item) => empty($item->bdg_sku))
                ->map(fn($item) => (object)[
                    'id' => $item->bdg_id,
                    'name' => $item->bdg_name,
                    'sku' => $item->bdg_sku,
                    'price' => $item->bdg_price
                ])
                ->values();
            $this->info("   Found " . Item::count() . " total items in Bodega, {$bodegaItems->count()} without SKU");

            // Step 2: Find best match for each Bodega item
            $this->info("\n🔍 Finding best matches for each item...");
            $matches = collect();

            foreach ($bodegaItems as $bodegaItem) {
                $bestMatch = null;
                $bestScore = 0;

                foreach ($boutiqueItems as $boutiqueItem) {
                    $score = $this->calculateSimilarity($bodegaItem->name, $boutiqueItem->name);
                    if ($score > $bestScore) {
                        $bestScore = $score;
                        $bestMatch = $boutiqueItem;
                    }
                }

                $matches->push([
                    'bodega' => $bodegaItem,
                    'boutique' => $bestMatch,
                    'score' => $bestScore
                ]);
            }

            // Sort matches by score descending
            $matches = $matches->sortByDesc('score')->values();

            // Step 3: Create backup BEFORE making any changes
            $this->info("\n💾 Creating backup of current SKUs...");
            $backupFileName = 'sku_backup_' . now()->format('Y_m_d_H_i_s') . '.json';
            $allBodegaItems = Item::all(['bdg_id', 'bdg_name', 'bdg_sku']);
            $backupData = $allBodegaItems->map(fn($item) => [
                'id' => $item->bdg_id,
                'name' => $item->bdg_name,
                'original_sku' => $item->bdg_sku,
            ]);
            Storage::disk('local')->put($backupFileName, json_encode($backupData, JSON_PRETTY_PRINT));
            $this->info("   Backup saved to: {$backupFileName}");

            // Step 4: Go through each match and ask yes/no
            $this->info("\n� Now reviewing matches one by one...");
            $this->info("   For each item, review the best match and confirm if they are the same product.\n");
            $updated = 0;

            foreach ($matches as $index => $match) {
                $this->info("--- Item " . ($index + 1) . " of " . count($matches) . " ---");
                
                if (!$match['boutique']) {
                    $this->info("⚠️  Bodega Item: {$match['bodega']->name}");
                    $this->info("   No potential match found in Boutique-POS\n");
                    continue;
                }

                $this->info("📦 Bodega Item: {$match['bodega']->name}");
                $this->info("🔍 Best Match:   {$match['boutique']->name}");
                $this->info("📊 Similarity:   {$match['score']}%");
                $this->info("🏷️ SKU:          {$match['boutique']->sku}");

                if ($this->confirm("\nAre these the same product? Do you want to apply this SKU?", true)) {
                    $item = Item::find($match['bodega']->id);
                    $item->bdg_sku = $match['boutique']->sku;
                    $item->save();
                    $updated++;
                    $this->info("✅ Applied SKU: {$item->bdg_sku}\n");
                } else {
                    $this->info("❌ Skipped this match\n");
                }
            }

            $this->info("\n✅ Done! Updated {$updated} items with SKUs!");
            $this->info("\n💡 To rollback these changes, run: php artisan inventory:rollback-sku");

            return 0;
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }

    private function calculateSimilarity($str1, $str2): int
    {
        $clean1 = $this->normalizeName($str1);
        $clean2 = $this->normalizeName($str2);

        $len1 = strlen($clean1);
        $len2 = strlen($clean2);

        if ($len1 === 0 || $len2 === 0) return 0;

        $distance = levenshtein($clean1, $clean2);
        $maxLen = max($len1, $len2);
        return (int)round((1 - ($distance / $maxLen)) * 100);
    }

    private function normalizeName($str): string
    {
        $str = strtolower(trim($str));
        $str = preg_replace('/\([^)]*\)/', '', $str);
        $str = preg_replace('/[^a-z0-9\s]/', '', $str);
        $str = preg_replace('/\s+/', ' ', $str);
        return trim($str);
    }
}
