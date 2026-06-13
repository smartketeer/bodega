import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head } from '@inertiajs/react';
import { BarChart3, TrendingUp, DollarSign, Package, MapPin } from 'lucide-react';

export default function Reports({ topByStock, topByCapital, branchDistribution, totalInventoryValue, totalItemsInStock }) {
    // Data loaded from database via props

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    return (
        <BoutiqueLayout>
            <Head title="Reports & Analytics" />

            <div className="max-w-7xl pb-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-medium text-gray-900 tracking-tight mb-2">Reports & Analytics</h2>
                    <p className="text-gray-700 font-medium">Comprehensive view of inventory health, capital distribution, and top assets.</p>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                <DollarSign size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Total Inventory Value</h3>
                        </div>
                        <h2 className="text-2xl xl:text-3xl font-bold text-gray-900 tracking-tight truncate">{formatCurrency(totalInventoryValue)}</h2>
                        <p className="text-sm font-semibold text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={14}/> +4.2% from last month</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Package size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Total Items in Stock</h3>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{new Intl.NumberFormat('en-US').format(totalItemsInStock)}</h2>
                        <p className="text-sm font-semibold text-gray-500 mt-1">Across all branches</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                <MapPin size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Capital Distribution by Branch</h3>
                        </div>
                        <div className="space-y-3">
                            {branchDistribution.map(branch => (
                                <div key={branch.branch}>
                                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                        <span>{branch.branch}</span>
                                        <span>{formatCurrency(branch.value)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${branch.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top by Stock Qty */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Items with Most Stock</h3>
                            <p className="text-sm text-gray-500 font-medium">Highest volume items currently on hand.</p>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Qty</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topByStock.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <span className="text-sm font-black text-gray-300 w-4">{index + 1}</span>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                    <div className="text-[11px] font-bold text-gray-500 font-mono mt-0.5">{item.sku}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">
                                                {item.qty}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-600">
                                                {formatCurrency(item.value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top by Capital Value */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Highest Capital Items</h3>
                            <p className="text-sm text-gray-500 font-medium">Items tying up the most inventory capital.</p>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Qty</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topByCapital.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <span className="text-sm font-black text-gray-300 w-4">{index + 1}</span>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                    <div className="text-[11px] font-bold text-gray-500 font-mono mt-0.5">{item.sku}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-600">
                                                {item.qty}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900 text-[15px]">
                                                {formatCurrency(item.value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </BoutiqueLayout>
    );
}
