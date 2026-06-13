<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Item;
use App\Models\Category;
use Illuminate\Http\Request;

class InventoryMasterlistController extends Controller
{
    public function index(Request $request)
    {
        $query = Item::with('category')
            ->leftJoin('product_images', 'items.primary_image_id', '=', 'product_images.id')
            ->select('items.*', 'product_images.path as primary_image_path');

        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('items.name', 'like', '%' . $request->search . '%')
                  ->orWhere('items.sku', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('items.category_id', $request->category);
        }

        $items = $query->orderBy('items.name')->get()->map(function($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'price' => $item->price,
                'cost' => $item->cost,
                'stock_qty' => $item->stock_qty,
                'is_service' => $item->is_service,
                'category_name' => $item->category ? $item->category->name : 'Uncategorized',
                'primary_image_id' => $item->primary_image_id,
                'primary_image_path' => $item->primary_image_path,
            ];
        });
        
        $categories = Category::all();

        return Inertia::render('InventoryMasterlist', [
            'itemsProp' => $items,
            'categories' => $categories
        ]);
    }

    public function uploadImage(Request $request, $id)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $item = Item::findOrFail($id);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            
            $path = $file->store('product-images/' . $item->id, 'public');
            
            $imageId = \Illuminate\Support\Facades\DB::table('product_images')->insertGetId([
                'item_id' => $item->id,
                'path' => $path,
                'mime' => $file->getClientMimeType(),
                'size_bytes' => $file->getSize(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $item->update([
                'primary_image_id' => $imageId
            ]);
        }

        return redirect()->back();
    }

    public function deleteImage($id)
    {
        $item = Item::findOrFail($id);

        if ($item->primary_image_id) {
            $image = \Illuminate\Support\Facades\DB::table('product_images')->where('id', $item->primary_image_id)->first();
            
            if ($image) {
                // Delete the file from storage
                \Illuminate\Support\Facades\Storage::disk('public')->delete($image->path);
                // Delete the record
                \Illuminate\Support\Facades\DB::table('product_images')->where('id', $image->id)->delete();
            }

            $item->update(['primary_image_id' => null]);
        }

        return redirect()->back();
    }
}
