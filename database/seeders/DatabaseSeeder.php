<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $categories = [
            'Salon Products' => 'product',
            'Beauty Products' => 'product',
            'General Merchandise' => 'product',
            'Other Products' => 'product',
        ];

        foreach ($categories as $name => $type) {
            \App\Models\Category::firstOrCreate(
                ['bdg_name' => $name],
                ['bdg_description' => $type]
            );
        }
    }
}
