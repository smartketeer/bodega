$logs = \App\Models\ActivityLog::where('event_type', 'requisition_rejected')->get();

foreach ($logs as $log) {
    if (preg_match('/Rejected branch requisition #(\d+)/', $log->description, $matches)) {
        $id = $matches[1];
        
        $requisition = \Illuminate\Support\Facades\DB::connection('boutique_pos')
            ->table('branch_requisitions')
            ->leftJoin('branches', 'branch_requisitions.branch_id', '=', 'branches.id')
            ->leftJoin('users', 'branch_requisitions.user_id', '=', 'users.id')
            ->select(
                'branch_requisitions.*',
                'branches.name as branch_name',
                'users.name as cashier_name'
            )
            ->where('branch_requisitions.id', $id)
            ->first();
            
        if ($requisition) {
            $itemName = $requisition->item_name ?? 'Unknown Item';
            $branchName = $requisition->branch_name ?? 'Unknown Branch';
            $cashierName = $requisition->cashier_name ?? 'Unknown Cashier';
            $log->description = "Rejected {$requisition->quantity}x {$itemName} from {$branchName} requested by {$cashierName}";
            $log->save();
        }
    }
}
echo "Done!\n";
