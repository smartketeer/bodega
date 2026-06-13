<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('stock_transfers')) {
            Schema::create('stock_transfers', function (Blueprint $table) {
                $table->id();
                $table->string('reference_number')->unique();
                $table->unsignedBigInteger('from_branch_id')->nullable(); // null = Main Bodega
                $table->unsignedBigInteger('to_branch_id')->nullable();   // null = Main Bodega
                $table->unsignedBigInteger('requested_by')->nullable();   // user who requested
                $table->unsignedBigInteger('approved_by')->nullable();    // admin who approved
                $table->enum('status', ['pending', 'completed', 'rejected'])->default('pending');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('from_branch_id')->references('id')->on('branches')->onDelete('set null');
                $table->foreign('to_branch_id')->references('id')->on('branches')->onDelete('set null');
                $table->foreign('requested_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
    }
};
