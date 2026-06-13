import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { AlertCircle, AlertTriangle, TrendingDown, Clock, Search, Filter, MoreHorizontal, Tag, Truck, X } from 'lucide-react';

export default function DeadStock({ deadStockItems, totalItemsAtRisk, capitalLocked, avgStagnation }) {
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [activeModal, setActiveModal] = useState(null); // 'clearance' | 'transfer' | null
    const [activeItem, setActiveItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [stagnantFilter, setStagnantFilter] = useState('0');

    const filteredItems = deadStockItems.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(searchLower) || 
                              item.sku.toLowerCase().includes(searchLower);
        const matchesStagnation = Math.floor(item.daysStagnant) >= parseInt(stagnantFilter);
        return matchesSearch && matchesStagnation;
    });

    // Dynamic KPIs based on filtered items
    const displayItemsAtRisk = filteredItems.length;
    const displayCapitalLocked = filteredItems.reduce((sum, item) => sum + Number(item.capitalLocked), 0);
    const displayAvgStagnation = filteredItems.length > 0 
        ? Math.round(filteredItems.reduce((sum, item) => sum + Number(item.daysStagnant), 0) / filteredItems.length) 
        : 0;

    const toggleDropdown = (id) => {
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    const handleAction = (action, item) => {
        setActiveModal(action);
        setActiveItem(item);
        setOpenDropdownId(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const getStatusStyles = (status) => {
        switch(status) {
            case 'Warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'Critical': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Severe': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <BoutiqueLayout>
            <Head title="Dead Stock Radar" />

            <div className="max-w-7xl pb-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-medium text-gray-900 tracking-tight mb-2">Dead Stock Radar</h2>
                    <p className="text-gray-700 font-medium">Identify and manage items with no outbound movement in 30+ days.</p>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Total Items at Risk</h3>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{displayItemsAtRisk}</h2>
                        <p className="text-sm font-semibold text-gray-500 mt-1">Across all categories</p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                <TrendingDown size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Capital Locked</h3>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(displayCapitalLocked)}</h2>
                        <p className="text-sm font-semibold text-gray-500 mt-1">Non-moving capital</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                <Clock size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Avg. Stagnation</h3>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{displayAvgStagnation} <span className="text-lg text-gray-500">Days</span></h2>
                        <p className="text-sm font-semibold text-gray-500 mt-1">Time since last movement</p>
                    </div>
                </div>

                {/* Dead Stock Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-gray-100 p-2 rounded-lg">
                                <AlertTriangle size={20} className="text-gray-700" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Stagnant Inventory</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            {/* Days Stagnant Filter */}
                            <div className="relative w-full sm:w-auto">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select 
                                    value={stagnantFilter}
                                    onChange={(e) => setStagnantFilter(e.target.value)}
                                    className="w-full sm:w-48 pl-9 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm py-2 font-medium appearance-none"
                                >
                                    <option value="0">All Stagnant Stocks</option>
                                    <option value="30">30+ Days Stagnant</option>
                                    <option value="60">60+ Days Stagnant</option>
                                    <option value="90">90+ Days Stagnant</option>
                                </select>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm py-2"
                                    placeholder="Search dead stock..."
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item Details & SKU</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Days Stagnant</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Qty on Hand</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Capital Locked</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                            <div className="text-[11px] font-bold tracking-wider text-gray-500 font-mono mt-1">{item.sku}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusStyles(item.status)}`}>
                                                    {Math.floor(item.daysStagnant)} Days
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-900 text-lg">
                                            {item.qty}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-gray-900">{formatCurrency(item.capitalLocked)}</div>
                                            <div className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">At Risk</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="relative inline-block text-left">
                                                <button 
                                                    onClick={() => toggleDropdown(item.id)}
                                                    className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors inline-flex items-center justify-center focus:outline-none shadow-sm border border-gray-100"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                
                                                {openDropdownId === item.id && (
                                                    <>
                                                        <div 
                                                            className="fixed inset-0 z-10" 
                                                            onClick={() => setOpenDropdownId(null)}
                                                        ></div>
                                                        <div className="absolute right-8 top-0 mt-0 w-64 rounded-xl shadow-xl border border-gray-100 bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                                                            <div className="py-1">
                                                                <button
                                                                    onClick={() => handleAction('clearance', item)}
                                                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b border-gray-50"
                                                                >
                                                                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                                                        <Tag size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-900">Create Clearance</span>
                                                                        <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Send to POS with discount</span>
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction('transfer', item)}
                                                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-purple-600 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
                                                                        <Truck size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-900">Transfer to Branch</span>
                                                                        <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Move to high-traffic location</span>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium">
                                            No dead stock found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Action Modals */}
            {activeModal && activeItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">
                                {activeModal === 'clearance' ? 'Create Clearance Promo' : 'Transfer Dead Stock'}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6">
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-sm font-bold text-gray-900">{activeItem.name}</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">{activeItem.sku}</p>
                                <div className="mt-3 flex items-center gap-4">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Available: <span className="font-bold text-gray-900">{activeItem.qty}</span></span>
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Locked: <span className="font-bold text-gray-900">{formatCurrency(activeItem.capitalLocked)}</span></span>
                                </div>
                            </div>

                            {activeModal === 'clearance' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Branch</label>
                                        <select className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm py-2.5 font-medium">
                                            <option value="">Select Branch...</option>
                                            <option value="luna">Luna Branch</option>
                                            <option value="roxas">Roxas Branch</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Discount Percentage</label>
                                        <select className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm py-2.5 font-medium">
                                            <option value="10">10% Off</option>
                                            <option value="20">20% Off</option>
                                            <option value="30">30% Off</option>
                                            <option value="50">50% Off (Recommended)</option>
                                            <option value="70">70% Off</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Internal Remarks</label>
                                        <textarea rows="3" className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors shadow-sm text-sm py-2.5 resize-none font-medium" placeholder="Reason for clearance..."></textarea>
                                    </div>
                                </div>
                            )}

                            {activeModal === 'transfer' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Destination Branch</label>
                                        <select className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-purple-500 transition-colors shadow-sm text-sm py-2.5 font-medium">
                                            <option value="">Select Destination...</option>
                                            <option value="luna">Luna Branch (High Traffic)</option>
                                            <option value="roxas">Roxas Branch (High Traffic)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Quantity to Transfer</label>
                                        <input type="number" defaultValue={activeItem.qty} max={activeItem.qty} className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-purple-500 transition-colors shadow-sm text-sm py-2.5 font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Transfer Notes</label>
                                        <textarea rows="2" className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-purple-500 transition-colors shadow-sm text-sm py-2.5 resize-none font-medium" placeholder="Optional instructions..."></textarea>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setActiveModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-sm transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => setActiveModal(null)} className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-colors flex items-center gap-2 ${activeModal === 'clearance' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                {activeModal === 'clearance' ? <><Tag size={16}/> Push to POS</> : <><Truck size={16}/> Initiate Transfer</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BoutiqueLayout>
    );
}
