<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Item;

class ImportAndMatchSku extends Command
{
    protected $signature = 'inventory:match-sku';
    protected $description = 'Import SKUs from Boutique-POS, match with bodega items using fuzzy matching, and assign SKUs';

    public function handle()
    {
        $this->info('==========================================');
        $this->info('Bodega SKU Import & Matching Tool');
        $this->info('==========================================');

        try {
            // Step 1: Get items from both databases
            $this->info("\n📥 Fetching items from Boutique-POS database...");
            $boutiqueItems = DB::connection('boutique_pos')->table('items')->get(['id', 'name', 'sku', 'price'])->keyBy('id');
            $this->info("   Found {$boutiqueItems->count()} items in Boutique-POS");

            $bodegaItems = Item::all(['id', 'name', 'sku', 'price'])->keyBy('id');
            $this->info("   Found {$bodegaItems->count()} items in Bodega");

            // Step 2: Match items
            $this->info("\n🔍 Matching items using fuzzy string matching...");
            $matches = $this->matchItems($bodegaItems, $boutiqueItems);

            $this->info("\n📊 Matching summary:");
            $this->table(
                ['Status', 'Count'],
                [
                    ['Perfect matches (exact name)', $matches['perfect']->count()],
                    ['Fuzzy matches (similar names)', $matches['fuzzy']->count()],
                    ['No match found', $matches['no_match']->count()],
                ]
            );

            // Step 3: Show matches and confirm
            if (!$this->confirm("\nWould you like to review the matches before applying SKUs?")) {
                $this->info('Aborted.');
                return 0;
            }

            $this->info("\n🔍 Reviewing matches:");

            // Review perfect matches
            if ($matches['perfect']->count() > 0) {
                $this->info("\n✅ Perfect matches (exact name):");
                $this->table(
                    ['Bodega Item', 'Boutique-POS Item', 'SKU'],
                    $matches['perfect']->map(fn($m) => [
                        $m['bodega']->name,
                        $m['boutique']->name,
                        $m['boutique']->sku ?? '(none)',
                    ])->toArray()
                );
            }

            // Review fuzzy matches
            if ($matches['fuzzy']->count() > 0) {
                $this->info("\n⚠️  Fuzzy matches (similar names):");
                $this->table(
                    ['Bodega Item', 'Boutique-POS Item', 'Match Score', 'SKU'],
                    $matches['fuzzy']->map(fn($m) => [
                        $m['bodega']->name,
                        $m['boutique']->name,
                        $m['score'] . '%',
                        $m['boutique']->sku ?? '(none)',
                    ])->toArray()
                );
            }

            // Review no matches
            if ($matches['no_match']->count() > 0) {
                $this->info("\n❌ No matches found:");
                $this->table(
                    ['Bodega Item'],
                    $matches['no_match']->map(fn($b) => [$b->name])->toArray()
                );
            }

            if (!$this->confirm("\nProceed to apply SKUs from matches?")) {
                $this->info('Aborted.');
                return 0;
            }

            // Step 4: Create backup of current SKUs
            $this->info("\n💾 Creating backup of current SKUs...");
            $backupFile = storage_path('app/sku_backup_' . now()->format('Y_m_d_H_i_s') . '.json');
            $backupData = $bodegaItems->map(fn($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'original_sku' => $item->sku,
            ]);
            file_put_contents($backupFile, json_encode($backupData, JSON_PRETTY_PRINT));
            $this->info("   Backup saved to: {$backupFile}");

            // Step 5: Apply SKUs
            $this->info("\n💾 Applying SKUs...");
            $updated = 0;
            $changes = collect();

            // Process perfect matches
            foreach ($matches['perfect'] as $match) {
                if ($match['boutique']->sku) {
                    $item = Item::find($match['bodega']->id);
                    $originalSku = $item->sku;
                    $item->sku = $match['boutique']->sku;
                    $item->save();
                    $changes->push([
                        'id' => $item->id,
                        'name' => $item->name,
                        'original_sku' => $originalSku,
                        'new_sku' => $item->sku,
                    ]);
                    $updated++;
                    $this->info("   ✓ {$item->name} → SKU: {$item->sku}");
                }
            }

            // Process fuzzy matches (ask for confirmation per match)
            foreach ($matches['fuzzy'] as $match) {
                if (!$match['boutique']->sku) continue;

                $confirm = $this->confirm(
                    "\nApply SKU '{$match['boutique']->sku}' to '{$match['bodega']->name}' (matched with '{$match['boutique']->name}' at {$match['score']}% similarity)?",
                    true
                );

                if ($confirm) {
                    $item = Item::find($match['bodega']->id);
                    $originalSku = $item->sku;
                    $item->sku = $match['boutique']->sku;
                    $item->save();
                    $changes->push([
                        'id' => $item->id,
                        'name' => $item->name,
                        'original_sku' => $originalSku,
                        'new_sku' => $item->sku,
                    ]);
                    $updated++;
                    $this->info("   ✓ {$item->name} → SKU: {$item->sku}");
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

    private function matchItems($bodegaItems, $boutiqueItems)
    {
        $perfectMatches = collect();
        $fuzzyMatches = collect();
        $noMatches = collect();
        $usedBoutiqueIds = collect();

        foreach ($bodegaItems as $bodegaItem) {
            $bodegaNameLower = strtolower(trim($bodegaItem->name));
            $bestMatch = null;
            $bestScore = 0;
            $foundPerfectMatch = false;

            // First check for exact match
            foreach ($boutiqueItems as $boutiqueItem) {
                if ($usedBoutiqueIds->contains($boutiqueItem->id)) continue;

                $boutiqueNameLower = strtolower(trim($boutiqueItem->name));

                if ($bodegaNameLower === $boutiqueNameLower) {
                    $perfectMatches->push([
                        'bodega' => $bodegaItem,
                        'boutique' => $boutiqueItem,
                    ]);
                    $usedBoutiqueIds->push($boutiqueItem->id);
                    $foundPerfectMatch = true;
                    break;
                }

                // Calculate fuzzy match score
                $score = $this->calculateSimilarity($bodegaNameLower, $boutiqueNameLower);
                if ($score > $bestScore && $score >= 60) { // 60% similarity threshold
                    $bestScore = $score;
                    $bestMatch = $boutiqueItem;
                }
            }

            if ($foundPerfectMatch) {
                continue;
            }

            // If we found a fuzzy match
            if ($bestMatch) {
                $fuzzyMatches->push([
                    'bodega' => $bodegaItem,
                    'boutique' => $bestMatch,
                    'score' => $bestScore,
                ]);
                $usedBoutiqueIds->push($bestMatch->id);
            } else {
                $noMatches->push($bodegaItem);
            }
        }

        return [
            'perfect' => $perfectMatches,
            'fuzzy' => $fuzzyMatches,
            'no_match' => $noMatches,
        ];
    }

    private function calculateSimilarity($str1, $str2): int
    {
        // Remove common punctuation and extra spaces
        $clean1 = preg_replace('/[^a-z0-9\s]/', '', $str1);
        $clean2 = preg_replace('/[^a-z0-9\s]/', '', $str2);
        $clean1 = preg_replace('/\s+/', ' ', trim($clean1));
        $clean2 = preg_replace('/\s+/', ' ', trim($clean2));

        $len1 = strlen($clean1);
        $len2 = strlen($clean2);

        if ($len1 === 0 || $len2 === 0) return 0;

        // Calculate Levenshtein distance
        $distance = levenshtein($clean1, $clean2);
        $maxLen = max($len1, $len2);

        // Convert to percentage similarity (0-100)
        $similarity = (int) round((1 - ($distance / $maxLen)) * 100);

        return $similarity;
    }
}
