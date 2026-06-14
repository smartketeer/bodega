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
            ->leftJoin('product_images', 'bodega_items.bdg_primary_image_id', '=', 'product_images.id')
            ->select('bodega_items.*', 'product_images.path as primary_image_path');

        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('bodega_items.bdg_name', 'like', '%' . $request->search . '%')
                  ->orWhere('bodega_items.bdg_sku', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('bodega_items.bdg_category_id', $request->category);
        }

        $items = $query->orderBy('bodega_items.bdg_name')->get()->map(function($item) {
            return [
                'id' => $item->bdg_id,
                'name' => $item->bdg_name,
                'sku' => $item->bdg_sku,
                'price' => $item->bdg_price,
                'cost' => $item->bdg_cost,
                'stock_qty' => $item->bdg_stock_qty,
                'is_service' => $item->bdg_is_service,
                'category_name' => $item->category ? $item->category->bdg_name : 'Uncategorized',
                'primary_image_id' => $item->bdg_primary_image_id,
                'primary_image_path' => $item->primary_image_path,
            ];
        });
        
        $categories = Category::all()->map(function($cat) {
            return [
                'id' => $cat->bdg_id,
                'name' => $cat->bdg_name,
                'description' => $cat->bdg_description
            ];
        });

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
            
            $path = $file->store('product-images/bodega-' . $item->bdg_id, 'public');
            
            $imageId = \Illuminate\Support\Facades\DB::table('product_images')->insertGetId([
                'item_id' => 0, // 0 prevents foreign key crash if any, or null if nullable
                'path' => $path,
                'mime' => $file->getClientMimeType(),
                'size_bytes' => $file->getSize(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $item->update([
                'bdg_primary_image_id' => $imageId
            ]);
        }

        return redirect()->back();
    }

    public function deleteImage($id)
    {
        $item = Item::findOrFail($id);

        if ($item->bdg_primary_image_id) {
            $image = \Illuminate\Support\Facades\DB::table('product_images')->where('id', $item->bdg_primary_image_id)->first();
            
            if ($image) {
                // Delete the file from storage
                \Illuminate\Support\Facades\Storage::disk('public')->delete($image->path);
                // Delete the record
                \Illuminate\Support\Facades\DB::table('product_images')->where('id', $image->id)->delete();
            }

            $item->update(['bdg_primary_image_id' => null]);
        }

        return redirect()->back();
    }
}
