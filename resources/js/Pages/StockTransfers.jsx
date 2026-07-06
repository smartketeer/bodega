import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { 
    Send, FileText, History, CheckCircle2, Clock, Search, Layers, X, Package, 
    ArrowDownCircle, ArrowUpCircle, Edit2, RefreshCw, Plus, Trash2, AlertCircle, Download
} from 'lucide-react';
import axios from 'axios';

export default function StockTransfers({ branches, availableItems, branchRequisitions, transferHistory, stockInHistory, stockOutHistory, categories }) {
    const [activeTab, setActiveTab] = useState('adjust'); // 'stock-in', 'stock-out', 'adjust', 'transfer'
    const [selectedBranch, setSelectedBranch] = useState(branches?.[0]?.id || '');
    
    // Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    // Bulk Selection for Transfer
    const [destination, setDestination] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [fulfillingRequisitionId, setFulfillingRequisitionId] = useState(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectingRequisition, setRejectingRequisition] = useState(null);
    
    // Add Dropdown and Modals
    const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    
    // Modal Forms State
    const [addItemForm, setAddItemForm] = useState({ name: '', sku: '', category_id: '', capital_price: '', selling_price: '', initial_stocks: '' });
    const [addCategoryForm, setAddCategoryForm] = useState({ name: '', type: 'product' });

    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateItems, setDuplicateItems] = useState([]);
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

    // Sync from Main state
    const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const checkDuplicateAndSave = async (e) => {
        e.preventDefault();
        setIsCheckingDuplicate(true);
        try {
            const response = await axios.post('/items/check-duplicate', { name: addItemForm.name });
            const duplicates = response.data.duplicates || [];
            if (duplicates.length > 0) {
                setDuplicateItems(duplicates);
                setIsDuplicateModalOpen(true);
                setIsCheckingDuplicate(false);
                return;
            }
        } catch (error) {
            console.error('Failed to check for duplicates', error);
        }
        setIsCheckingDuplicate(false);
        proceedSaveNewItem();
    };

    const proceedSaveNewItem = () => {
        setIsDuplicateModalOpen(false);
        router.post('/items', addItemForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddItemModalOpen(false);
                setAddItemForm({ name: '', sku: '', category_id: '', capital_price: '', selling_price: '', initial_stocks: '' });
                router.reload();
            },
            onError: (errors) => {
                if (errors.name) {
                    alert(errors.name);
                }
            }
        });
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        router.post('/categories', addCategoryForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddCategoryModalOpen(false);
                setAddCategoryForm({ name: '', type: 'product' });
                router.reload();
            }
        });
    };

    const handleSyncFromMain = () => {
        setIsSyncing(true);
        router.post('/sync-missing-items', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSyncConfirmOpen(false);
                setIsSyncing(false);
                router.reload();
            },
            onError: () => {
                setIsSyncing(false);
                alert('Failed to sync items. Please try again.');
            }
        });
    };
    
    // Inline Edit State
    const [editingItemId, setEditingItemId] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: '', capitalPrice: '', sellingPrice: '' });

    // Deletion State
    const [selectedItemsForDeletion, setSelectedItemsForDeletion] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [isDeletionMode, setIsDeletionMode] = useState(false);

    const toggleItemSelection = (id) => {
        setSelectedItemsForDeletion(prev => 
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = (paginatedItemsList) => {
        if (selectedItemsForDeletion.length === paginatedItemsList.length) {
            setSelectedItemsForDeletion([]);
        } else {
            setSelectedItemsForDeletion(paginatedItemsList.map(item => item.id));
        }
    };

    const handleDeleteConfirm = () => {
        router.post('/items/bulk-delete', { ids: itemsToDelete }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setItemsToDelete([]);
                setSelectedItemsForDeletion([]);
                setIsDeletionMode(false);
            }
        });
    };

    // ── SKU Automation Logic ──
    const extractNameParts = (name) => {
        const cleanName = name.replace(/[^A-Za-z0-9\s]/g, '');
        const words = cleanName.trim().split(/\s+/).filter(Boolean);
        const parts = words.slice(0, 3).map(word => word.substring(0, 3).toUpperCase());
        return parts;
    };

    const getCategoryCode = (categoryId) => {
        const category = categories?.find(cat => String(cat.id) === String(categoryId));
        if (!category) return 'GEN';
        
        const categoryName = category.name.trim();
        const cleanCatName = categoryName.replace(/[^A-Za-z0-9]/g, '');
        const code = cleanCatName.substring(0, 3).toUpperCase().padEnd(3, 'X');
        return code;
    };

    const getNextSequenceNumber = (categoryCode) => {
        const pattern = `${categoryCode}-`;
        const existingNumbers = new Set();
        
        availableItems?.forEach(item => {
            if (item.sku && item.sku.startsWith(pattern)) {
                const skuParts = item.sku.split('-');
                const lastPart = skuParts[skuParts.length - 1];
                if (/^\d{4}$/.test(lastPart)) {
                    existingNumbers.add(parseInt(lastPart, 10));
                }
            }
        });
        
        let randomNumber;
        for (let i = 0; i < 1000; i++) {
            randomNumber = Math.floor(Math.random() * 9999) + 1;
            if (!existingNumbers.has(randomNumber)) break;
        }
        
        return randomNumber;
    };

    useEffect(() => {
        if (addItemForm.name && addItemForm.category_id) {
            const categoryCode = getCategoryCode(addItemForm.category_id);
            const nameParts = extractNameParts(addItemForm.name);
            const itemSlug = nameParts.join('-');
            const sequenceNumber = getNextSequenceNumber(categoryCode);
            const sku = `${categoryCode}-${itemSlug}-${String(sequenceNumber).padStart(4, '0')}`;
            setAddItemForm(prev => ({ ...prev, sku }));
        } else {
            setAddItemForm(prev => ({ ...prev, sku: '' }));
        }
    }, [addItemForm.name, addItemForm.category_id, categories, availableItems]);

    const dropdownRef = useRef(null);
    const addDropdownRef = useRef(null);

    const filteredItems = availableItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        function handleClickOutsideAdd(event) {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
                setIsAddDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutsideAdd);
        return () => document.removeEventListener("mousedown", handleClickOutsideAdd);
    }, []);

    const handleSelectItem = (item) => {
        if (!selectedItems.find(i => i.id === item.id)) {
            setSelectedItems([...selectedItems, { ...item, transferQty: 1 }]);
        }
        setSearchQuery('');
        setIsDropdownOpen(false);
    };

    const updateBulkQty = (id, val) => {
        setSelectedItems(selectedItems.map(item => 
            item.id === id ? { ...item, transferQty: val } : item
        ));
    };

    const removeBulkItem = (id) => {
        setSelectedItems(selectedItems.filter(item => item.id !== id));
    };

    const handleTransferSubmit = (e) => {
        e.preventDefault();
        if (!destination) {
            alert('Please select a destination branch.');
            return;
        }
        if (selectedItems.length === 0) {
            alert('Please add at least one item to transfer.');
            return;
        }

        router.post('/stock-transfers', {
            to_branch_id: destination,
            items: selectedItems,
            requisition_id: fulfillingRequisitionId
        }, {
            onSuccess: () => {
                setDestination('');
                setSearchQuery('');
                setSelectedItems([]);
                setFulfillingRequisitionId(null);
                alert('Transfer sent successfully!');
            }
        });
    };

    const handleApproveRequest = (req) => {
        const matchedItem = availableItems.find(i => 
            i.name.toLowerCase() === req.item.toLowerCase()
        );

        if (!matchedItem) {
            alert(`Item '${req.item}' not found in Bodega inventory! Please check the name.`);
            return;
        }

        if (matchedItem.stock < req.qty) {
            alert(`Insufficient stock! Bodega only has ${matchedItem.stock}x of ${matchedItem.name}.`);
            return;
        }

        setDestination(req.branch_id);
        setSelectedItems([{ ...matchedItem, transferQty: req.qty }]);
        setFulfillingRequisitionId(req.id);
        setActiveTab('transfer');
    };

    const handleMovementSubmit = (e) => {
        e.preventDefault();
        
        const url = activeTab === 'stock-in' ? '/stock-in' : '/stock-out';
        
        router.post(url, {
            item_id: selectedItem,
            quantity: quantity,
            reason: activeTab === 'stock-out' ? reason : undefined,
            reference: reference,
            notes: notes
        }, {
            onSuccess: () => {
                setSelectedItem('');
                setQuantity('');
                setReason('');
                setReference('');
                setNotes('');
                setSearchQuery('');
                alert(`${tabDetails[activeTab].title} saved successfully!`);
            }
        });
    };

    const handleEditClick = (item) => {
        setEditingItemId(item.id);
        setEditFormData({
            name: item.name,
            capitalPrice: item.capitalPrice || '0.00',
            sellingPrice: item.sellingPrice || '0.00'
        });
    };

    const handleSaveEdit = () => {
        router.post('/stock-adjust', {
            item_id: editingItemId,
            name: editFormData.name,
            capitalPrice: editFormData.capitalPrice,
            sellingPrice: editFormData.sellingPrice
        }, {
            onSuccess: () => {
                setEditingItemId(null);
            },
            onError: (errors) => {
                if (errors.name) {
                    alert(errors.name);
                }
            }
        });
    };

    const tabDetails = {
        'stock-in': { title: 'Stock In', description: 'Record stocks bought or received from supplier.', icon: ArrowDownCircle },
        'stock-out': { title: 'Stock Out', description: 'Record stock used, transferred, or dispatched.', icon: ArrowUpCircle },
        'adjust': { title: 'Adjust', description: 'Edit product name, capital price, or selling price.', icon: Edit2 },
        'transfer': { title: 'Transfer', description: 'Move stock between branches.', icon: Send },
    };

    return (
        <BoutiqueLayout>
            <Head title="Stock Management" />

            <div className="max-w-7xl pb-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden flex flex-col">
                    {/* Header Section */}
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Stock Management</h2>
                                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase">Movements</span>
                            </div>
                            <p className="text-gray-700 font-medium">Record stock changes here. Inventory is read-only and shows snapshots.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">

                            <div className="relative w-full sm:w-auto" ref={addDropdownRef}>
                                <button 
                                    onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                                    className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                                >
                                    <Plus size={16} /> Add
                                </button>
                                {isAddDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1">
                                        <button 
                                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-900"
                                            onClick={() => { setIsAddDropdownOpen(false); setIsAddItemModalOpen(true); }}
                                        >
                                            <Package size={16} /> Add Item
                                        </button>
                                        <button 
                                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-900"
                                            onClick={() => { setIsAddDropdownOpen(false); setIsAddCategoryModalOpen(true); }}
                                        >
                                            <Plus size={16} /> Add Category
                                        </button>
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button 
                                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-blue-700"
                                            onClick={() => { setIsAddDropdownOpen(false); setIsSyncConfirmOpen(true); }}
                                        >
                                            <Download size={16} /> Sync from Main
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs Section */}
                    <div className="p-6 pb-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-100">
                        <div className="flex items-center gap-2 overflow-x-auto pb-6 xl:pb-6 no-scrollbar">
                            {Object.entries(tabDetails).map(([key, { title, icon: Icon }]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
                                        activeTab === key 
                                        ? 'bg-gray-200 text-gray-900 border border-gray-300 shadow-inner' 
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon size={18} className={activeTab === key ? 'text-gray-900' : 'text-gray-500'} />
                                    {title}
                                </button>
                            ))}
                        </div>
                        <div className="text-sm font-medium text-gray-600 pb-6 xl:text-right">
                            {tabDetails[activeTab].description}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 bg-gray-50/50 flex-1">
                        {activeTab === 'transfer' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                                {/* Transfer Outbound Form */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                                    <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                            <Send size={20} className="text-blue-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">Transfer Outbound</h3>
                                    </div>

                                    <form onSubmit={handleTransferSubmit} className="space-y-6 flex-1 flex flex-col">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Destination Branch</label>
                                            <select 
                                                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm"
                                                value={destination}
                                                onChange={e => setDestination(e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>Select Branch</option>
                                                {branches.map(branch => (
                                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Item(s) to Transfer</label>
                                            </div>

                                            <div className="relative" ref={dropdownRef}>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                    <input 
                                                        type="text"
                                                        className="w-full pl-9 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm"
                                                        placeholder="Search item by name..."
                                                        value={searchQuery}
                                                        onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                                                        onFocus={() => setIsDropdownOpen(true)}
                                                    />
                                                </div>

                                                {isDropdownOpen && searchQuery && (
                                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                        {filteredItems.length > 0 ? filteredItems.map(item => (
                                                            <button 
                                                                key={item.id}
                                                                type="button"
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                                                                onClick={() => handleSelectItem(item)}
                                                            >
                                                                <div>
                                                                    <div className="font-semibold text-gray-900 text-sm">{item.name}</div>

                                                                </div>
                                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-md">
                                                                    {item.stock} IN STOCK
                                                                </div>
                                                            </button>
                                                        )) : (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">No items found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selected Items List */}
                                            {selectedItems.length > 0 && (
                                                <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 sticky top-0 bg-white z-10">Selected Items ({selectedItems.length})</label>
                                                    {selectedItems.map(item => (
                                                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                                <p className="text-xs font-semibold text-gray-500 mt-0.5">Avail: {item.stock}</p>
                                                            </div>
                                                            <div className="w-20">
                                                                <input 
                                                                    type="number"
                                                                    min="1"
                                                                    max={item.stock}
                                                                    className="w-full rounded-lg border-gray-200 text-sm py-1.5 px-2 text-center focus:ring-blue-500 focus:border-blue-500"
                                                                    value={item.transferQty}
                                                                    onChange={(e) => updateBulkQty(item.id, e.target.value)}
                                                                    required
                                                                />
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeBulkItem(item.id)} 
                                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors absolute -top-2 -right-2 bg-white border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-6">
                                            <button 
                                                type="submit" 
                                                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2"
                                            >
                                                Send Transfer <Send size={16} />
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Branch Requisitions Column */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                                    <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                                        <div className="bg-orange-50 p-2 rounded-lg">
                                            <FileText size={20} className="text-orange-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">Branch Requisitions</h3>
                                        <span className="ml-auto bg-red-100 text-red-800 text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full">{branchRequisitions.length} Pending</span>
                                    </div>

                                    <div className="space-y-4 overflow-y-auto pr-2 flex-1" style={{ maxHeight: '420px' }}>
                                        {branchRequisitions.map(req => (
                                            <div key={req.id} className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between p-5 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors gap-4">
                                                <div className="flex-1 w-full min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <span className="font-bold text-gray-900 text-base whitespace-nowrap">{req.branch}</span>
                                                        <span className="text-xs text-gray-600 font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-200 rounded-md whitespace-nowrap">Req: {req.cashier}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-700 mb-2 bg-white px-3 py-2 rounded-lg border border-gray-100 inline-block shadow-sm w-full xl:w-auto">
                                                        <Package size={14} className="inline mr-1.5 text-gray-400 -mt-0.5" />
                                                        <span className="whitespace-nowrap">Requested <span className="font-black text-gray-900">{req.qty}x</span> {req.item}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-medium flex flex-wrap items-center gap-1.5">
                                                        <Clock size={12} className="text-gray-400 flex-shrink-0" />
                                                        <span className="whitespace-nowrap">{req.date} at {req.time}</span> <span className="text-gray-300">•</span> <span className="text-blue-600 whitespace-nowrap">{req.requestedAt}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full 2xl:w-auto">
                                                    <button 
                                                        onClick={() => {
                                                            setRejectingRequisition(req);
                                                            setIsRejectModalOpen(true);
                                                        }}
                                                        className="flex-1 2xl:flex-none border border-red-200 text-red-600 hover:bg-red-50 font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm whitespace-nowrap">
                                                        Reject
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApproveRequest(req)}
                                                        className="flex-1 2xl:flex-none bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all text-sm flex-shrink-0 whitespace-nowrap">
                                                        Approve & Transfer
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'adjust' ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-lg font-bold text-gray-900">Adjust Product Details</h3>
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                        <div className="relative w-full sm:w-72 flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input 
                                                    type="text"
                                                    className="w-full pl-9 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm"
                                                    placeholder="Search by name..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            {isDeletionMode ? (
                                                <button 
                                                    onClick={() => {
                                                        setIsDeletionMode(false);
                                                        setSelectedItemsForDeletion([]);
                                                    }}
                                                    className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold py-2 px-4 rounded-xl shadow-sm transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
                                                >
                                                    <X size={16} /> Cancel
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => setIsDeletionMode(true)}
                                                    className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 font-bold py-2 px-4 rounded-xl shadow-sm transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
                                                >
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-left border-collapse min-w-full">
                                        <thead>
                                            {isDeletionMode && (
                                                <tr className="bg-gray-100 border-b border-gray-200">
                                                    <td colSpan="6" className="px-5 py-3">
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="text-red-500 font-bold text-sm">Tap items to mark for deletion</span>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => toggleAllSelection(paginatedItems)}
                                                                    className="bg-white text-red-500 border border-gray-200 hover:bg-gray-50 font-bold py-1.5 px-4 rounded-full text-xs shadow-sm"
                                                                >
                                                                    Select All
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (selectedItemsForDeletion.length > 0) {
                                                                            setItemsToDelete(selectedItemsForDeletion);
                                                                            setIsDeleteModalOpen(true);
                                                                        }
                                                                    }}
                                                                    disabled={selectedItemsForDeletion.length === 0}
                                                                    className={`font-bold py-1.5 px-4 rounded-full text-xs shadow-sm flex items-center gap-1 transition-opacity ${selectedItemsForDeletion.length > 0 ? 'bg-red-400 hover:bg-red-500 text-white' : 'bg-red-400/50 text-white cursor-not-allowed'}`}
                                                                >
                                                                    <Trash2 size={14} /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="bg-white border-b border-gray-100">
                                                {isDeletionMode && (
                                                    <th className="px-5 py-4 w-12">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={paginatedItems.length > 0 && selectedItemsForDeletion.length === paginatedItems.length}
                                                            onChange={() => toggleAllSelection(paginatedItems)}
                                                        />
                                                    </th>
                                                )}
                                                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Product Name</th>

                                                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider w-40">Capital Price</th>
                                                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider w-40">Selling Price</th>
                                                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-right w-48">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedItems.map((item) => {
                                                if (editingItemId === item.id) {
                                                    return (
                                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors bg-gray-50/30">
                                                            {isDeletionMode && <td className="px-5 py-3"></td>}
                                                            <td className="px-5 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full rounded-xl border-gray-200 bg-white text-sm focus:ring-blue-500 focus:border-blue-500 py-2.5 px-3 shadow-sm font-medium" 
                                                                    value={editFormData.name} 
                                                                    onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                                                                />
                                                            </td>
                                                            <td className="px-5 py-3 text-sm font-bold text-gray-900">—</td>
                                                            <td className="px-5 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full rounded-xl border-gray-200 bg-white text-sm focus:ring-blue-500 focus:border-blue-500 py-2.5 px-3 shadow-sm font-medium" 
                                                                    value={editFormData.capitalPrice} 
                                                                    onChange={e => setEditFormData({...editFormData, capitalPrice: e.target.value})} 
                                                                />
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full rounded-xl border-gray-200 bg-white text-sm focus:ring-blue-500 focus:border-blue-500 py-2.5 px-3 shadow-sm font-medium" 
                                                                    value={editFormData.sellingPrice} 
                                                                    onChange={e => setEditFormData({...editFormData, sellingPrice: e.target.value})} 
                                                                />
                                                            </td>
                                                            <td className="px-5 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button 
                                                                        onClick={handleSaveEdit}
                                                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-xl text-sm font-bold transition-colors shadow-sm"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingItemId(null)}
                                                                        className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-xl text-sm font-bold transition-colors shadow-sm"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                        {isDeletionMode && (
                                                            <td className="px-5 py-4">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                    checked={selectedItemsForDeletion.includes(item.id)}
                                                                    onChange={() => toggleItemSelection(item.id)}
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="px-5 py-4 font-bold text-gray-900 text-sm">{item.name}</td>

                                                        <td className="px-5 py-4 font-bold text-gray-900 text-sm">₱{item.capitalPrice}</td>
                                                        <td className="px-5 py-4 font-bold text-gray-900 text-sm">₱{item.sellingPrice}</td>
                                                        <td className="px-5 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingItemId(item.id);
                                                                        setEditFormData({ name: item.name, capitalPrice: item.capitalPrice, sellingPrice: item.sellingPrice });
                                                                    }}
                                                                    className="px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                                                                >
                                                                    <Edit2 size={14} /> Edit
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                                        <span className="text-sm text-gray-500 font-medium">
                                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
                                        </span>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Prev
                                            </button>
                                            <button 
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
                                {/* Form Column */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Add {tabDetails[activeTab].title}</h3>
                                    </div>
                                    <form onSubmit={handleMovementSubmit} className="p-5 space-y-5 flex-1 flex flex-col">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Find Item</label>
                                            <input 
                                                type="text"
                                                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 shadow-sm text-sm px-4 py-2.5"
                                                placeholder="Search by name..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Item</label>
                                            <select 
                                                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 shadow-sm text-sm px-4 py-2.5 font-medium"
                                                value={selectedItem}
                                                onChange={e => setSelectedItem(e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>Select item</option>
                                                {filteredItems.slice(0, 500).map(item => (
                                                    <option key={item.id} value={item.id}>{item.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1.5 font-medium">Showing first 500 matches. Refine your search.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                                                {activeTab === 'stock-in' ? 'QUANTITY RECEIVED' : 'QUANTITY ISSUED'}
                                            </label>
                                            <input 
                                                type="number"
                                                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 shadow-sm text-sm px-4 py-2.5"
                                                value={quantity}
                                                onChange={e => setQuantity(e.target.value)}
                                                required
                                            />
                                        </div>
                                        {activeTab === 'stock-out' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Reason</label>
                                                    <select 
                                                        className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 shadow-sm text-sm px-4 py-2.5"
                                                        value={reason}
                                                        onChange={e => setReason(e.target.value)}
                                                        required
                                                    >
                                                        <option value="" disabled>Select reason</option>
                                                        <option value="Issue">Issue (Branch Request)</option>
                                                        <option value="Damage">Damage / Spoilage</option>
                                                        <option value="Loss">Loss / Missing</option>
                                                        <option value="Return">Return to Supplier</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Reference (Optional)</label>
                                                    <input 
                                                        type="text"
                                                        className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 shadow-sm text-sm px-4 py-2.5"
                                                        value={reference}
                                                        onChange={e => setReference(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Notes (Optional)</label>
                                                    <input 
                                                        type="text"
                                                        className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 shadow-sm text-sm px-4 py-2.5"
                                                        value={notes}
                                                        onChange={e => setNotes(e.target.value)}
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="pt-2 mt-auto">
                                            <button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm">
                                                Save {tabDetails[activeTab].title}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Recent Entries Column */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-base font-bold text-gray-900">Recent entries</h3>
                                        <button 
                                            onClick={() => router.reload({ only: ['stockInHistory', 'stockOutHistory'] })}
                                            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                        >
                                            <RefreshCw size={14} /> Refresh
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto flex-1 bg-white">
                                        <table className="w-full text-left border-collapse min-w-full">
                                            <thead>
                                                <tr className="bg-white border-b border-gray-100">
                                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/4">Time</th>
                                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-2/4">Item</th>
                                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Change</th>
                                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">New</th>
                                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Ref</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {activeTab === 'stock-in' ? (
                                                    stockInHistory && stockInHistory.length > 0 ? stockInHistory.map((log) => (
                                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-5 py-4 text-xs text-gray-700 font-medium">{log.date}</td>
                                                            <td className="px-5 py-4">
                                                                <div className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{log.item}</div>
                                                                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">{log.type}</div>
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-200 text-gray-800">
                                                                    {log.change}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-center font-bold text-gray-900 text-sm">{log.new}</td>
                                                            <td className="px-5 py-4 text-center text-gray-400 font-medium">{log.reference || '—'}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan="5" className="text-center py-4 text-gray-500 font-medium">No recent stock-in entries</td></tr>
                                                    )
                                                ) : (
                                                    stockOutHistory && stockOutHistory.length > 0 ? stockOutHistory.map((log) => (
                                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-5 py-4 text-xs text-gray-700 font-medium">{log.date}</td>
                                                            <td className="px-5 py-4">
                                                                <div className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{log.item}</div>
                                                                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">{log.type}</div>
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-200 text-gray-800">
                                                                    {log.change}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-center font-bold text-gray-900 text-sm">{log.new}</td>
                                                            <td className="px-5 py-4 text-center text-gray-400 font-medium">{log.reference || '—'}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan="5" className="text-center py-4 text-gray-500 font-medium">No recent stock-out entries</td></tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Ledger Below */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <div className="bg-purple-50 p-2 rounded-lg">
                            <History size={20} className="text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">History Ledger</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & ID</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Qty</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Route/Action</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transferHistory.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 text-sm">{record.date}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{record.time}</div>
                                            <div className="text-[10px] font-bold tracking-wider text-gray-400 font-mono mt-1">{record.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 text-sm">{record.item}</div>
                                            <div className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                Req by: {record.cashier}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-900 text-lg">
                                            {record.qty}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-600 font-medium">{record.from}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="text-gray-900 font-bold">{record.to}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {record.status === 'Completed' || record.status === 'Approved' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                    <CheckCircle2 size={12} /> {record.status}
                                                </span>
                                            ) : record.status === 'Rejected' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                                    <X size={12} /> {record.status}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                                    <Clock size={12} /> {record.status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isAddItemModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Add Item</h3>
                            <button onClick={() => setIsAddItemModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">ITEM NAME</label>
                                <input type="text" className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 transition-colors" value={addItemForm.name} onChange={e => setAddItemForm({...addItemForm, name: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">CATEGORY</label>
                                <select className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 font-medium transition-colors" value={addItemForm.category_id} onChange={e => setAddItemForm({...addItemForm, category_id: e.target.value})}>
                                    <option value="">Select Category</option>
                                    {categories?.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">PRICE (₱)</label>
                                    <input type="number" className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 transition-colors" value={addItemForm.selling_price} onChange={e => setAddItemForm({...addItemForm, selling_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">COST (₱)</label>
                                    <input type="number" className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 transition-colors" value={addItemForm.capital_price} onChange={e => setAddItemForm({...addItemForm, capital_price: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">INITIAL STOCKS</label>
                                <input type="number" className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 transition-colors" value={addItemForm.initial_stocks} onChange={e => setAddItemForm({...addItemForm, initial_stocks: e.target.value})} />
                            </div>
                        </div>
                        <div className="p-6 pt-2">
                            <button onClick={checkDuplicateAndSave} disabled={isCheckingDuplicate} className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm tracking-wide disabled:opacity-50">
                                {isCheckingDuplicate ? 'CHECKING...' : 'SAVE ITEM'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Duplicate Item Modal ── */}
            {isDuplicateModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="bg-orange-50 p-6 pb-5 border-b border-orange-100 flex flex-col items-center justify-center text-center">
                            <div className="bg-orange-100 p-3 rounded-full mb-3 text-orange-600">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Similar Item Detected</h3>
                            <p className="text-sm text-gray-600">We found existing items with similar names in the Bodega inventory. Please review them before proceeding.</p>
                        </div>
                        <div className="p-6 space-y-4 max-h-60 overflow-y-auto">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Existing Similar Items</label>
                            {duplicateItems.map((item, idx) => (
                                <div key={idx} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => {
                                    setIsDuplicateModalOpen(false);
                                    setIsAddItemModalOpen(false);
                                    setActiveTab('adjust');
                                    setSearchQuery(item.name);
                                }}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900">{item.name}</span>
                                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{item.similarity}% Match</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Capital: ₱{item.cost} • Selling: ₱{item.price} • Stock: {item.stock_qty}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 pt-0 space-y-3 bg-gray-50 border-t border-gray-100">
                            <button 
                                onClick={proceedSaveNewItem} 
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm tracking-wide mt-6"
                            >
                                PROCEED AS NEW ITEM
                            </button>
                            <button 
                                onClick={() => setIsDuplicateModalOpen(false)} 
                                className="w-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm tracking-wide"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAddCategoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Add Category</h3>
                            <button onClick={() => setIsAddCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">CATEGORY NAME</label>
                                <input type="text" className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 transition-colors" value={addCategoryForm.name} onChange={e => setAddCategoryForm({...addCategoryForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">TYPE</label>
                                <select className="w-full rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-0 shadow-sm text-sm px-4 py-2.5 font-medium transition-colors" value={addCategoryForm.type} onChange={e => setAddCategoryForm({...addCategoryForm, type: e.target.value})}>
                                    <option value="product">Product</option>
                                    <option value="service">Service</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 pt-2">
                            <button onClick={handleAddCategory} className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm tracking-wide">
                                SAVE CATEGORY
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reject Requisition Confirmation Modal */}
            {isRejectModalOpen && rejectingRequisition && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                        <button 
                            onClick={() => setIsRejectModalOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Request?</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            Are you sure you want to reject the request for <span className="font-bold text-gray-900">{rejectingRequisition.qty}x {rejectingRequisition.item}</span> from <span className="font-bold">{rejectingRequisition.branch}</span>? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsRejectModalOpen(false)}
                                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    router.post(`/stock-transfers/reject-requisition/${rejectingRequisition.id}`, {}, {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setIsRejectModalOpen(false);
                                            setRejectingRequisition(null);
                                        }
                                    });
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                            >
                                Yes, Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Item Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Item{itemsToDelete.length > 1 ? 's' : ''}?</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            Are you sure you want to permanently delete {itemsToDelete.length > 1 ? `these ${itemsToDelete.length} items` : 'this item'} from Bodega? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteConfirm}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync from Main Confirmation Modal */}
            {isSyncConfirmOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                        <button 
                            onClick={() => setIsSyncConfirmOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                            disabled={isSyncing}
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-100 p-2 rounded-xl">
                                <Download size={20} className="text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Sync from Main POS</h3>
                        </div>
                        <p className="text-gray-600 mb-6 text-sm">
                            This will import all product <strong>names</strong> from the Main POS that don't exist yet in Bodega. Items will be added with <strong>zero stock</strong>, and their capital and selling prices will be included. Duplicates will be skipped.
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsSyncConfirmOpen(false)}
                                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                                disabled={isSyncing}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSyncFromMain}
                                disabled={isSyncing}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSyncing ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    'Yes, Sync'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </BoutiqueLayout>
    );
}
