<?php
$filePath = 'D:\bodega\BODEGA NEW(Sheet1).csv';
$outFile = 'D:\bodega\bodega_import.sql';

if (!file_exists($filePath)) {
    die("CSV file not found!\n");
}

$file = fopen($filePath, 'r');
fgetcsv($file); // skip header

$sql = "-- SQL Script to replace Bodega Inventory\n";
$sql .= "-- This will ONLY delete items from the bodega_items table.\n";
$sql .= "-- It will NOT affect any other data (like POS data or other tables).\n\n";

$sql .= "SET FOREIGN_KEY_CHECKS=0;\n";
$sql .= "TRUNCATE TABLE `bodega_items`;\n\n";
$sql .= "INSERT INTO `bodega_items` (`bdg_name`, `bdg_stock_qty`, `bdg_cost`, `bdg_price`, `bdg_is_service`) VALUES \n";

$values = [];
while (($row = fgetcsv($file)) !== false) {
    if (empty($row[0])) continue;
    $name = addslashes(trim($row[0]));
    $quantityString = isset($row[1]) ? trim($row[1]) : '0';
    preg_match('/^(\d+)/', $quantityString, $matches);
    $qty = isset($matches[1]) ? (int)$matches[1] : 0;

    $values[] = "('$name', $qty, 0, 0, 0)";
}
$sql .= implode(",\n", $values) . ";\n\n";
$sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

file_put_contents($outFile, $sql);
echo "SQL generated successfully at: " . $outFile . "\n";
