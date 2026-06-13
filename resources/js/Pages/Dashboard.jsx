import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head } from '@inertiajs/react';
import { AlertTriangle, TrendingUp, Activity, Package, Box } from 'lucide-react';

export default function Dashboard({ lowStockAlerts, overallRevenue, overallTransactions, lunaBranchValue }) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    return (
        <BoutiqueLayout>
            <Head title="Dashboard" />

            <div className="max-w-7xl pb-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-medium text-gray-900 tracking-tight mb-2">Welcome back, Admin User!</h2>
                    <p className="text-gray-700 font-medium">Here's what's happening with your operations today.</p>
                </div>

                {/* Alert Banner */}
                <div className="bg-[#FAF6EE] border border-[#EBE4D5] rounded-2xl p-5 flex items-center justify-between mb-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-200/80 p-3 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={24} className="text-gray-700" />
                        </div>
                        <div>
                            <h3 className="text-[#D32F2F] font-semibold">Inventory Attention Required</h3>
                            <p className="text-[#D32F2F] text-sm font-medium">{lowStockAlerts || 0} items have fallen below their minimum stock threshold.</p>
                        </div>
                    </div>
                    <button className="bg-white border border-[#D32F2F] text-[#D32F2F] px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors shadow-sm">
                        Review Inventory
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Card 1 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-48">
                        <div className="flex items-start justify-between">
                            <div className="bg-gray-200 p-3 rounded-xl">
                                <TrendingUp size={24} className="text-gray-800" />
                            </div>
                            <div className="border border-gray-200 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest leading-none">Tap to<br/>switch</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Overall Revenue</p>
                            <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(overallRevenue || 0)}</h3>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-48">
                        <div className="flex items-start justify-between">
                            <div className="bg-gray-200 p-3 rounded-xl">
                                <Activity size={24} className="text-gray-800" />
                            </div>
                            <div className="border border-gray-200 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest leading-none">Tap to<br/>switch</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Overall Transactions</p>
                            <h3 className="text-3xl font-bold text-gray-900">{overallTransactions || 0}</h3>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-48 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        <div className="flex items-start justify-between relative z-10">
                            <div className="bg-pink-100/50 p-3 rounded-xl">
                                <Box size={24} className="text-gray-800" />
                            </div>
                            <div className="border border-gray-200 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm bg-white">
                                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest leading-none">Tap to<br/>switch</span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 leading-tight">Luna Branch Est.<br/>Retail Value</p>
                            <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(lunaBranchValue || 0)}</h3>
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-48">
                        <div className="flex items-start justify-between">
                            <div className="bg-gray-200 p-3 rounded-xl">
                                <AlertTriangle size={24} className="text-gray-800" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                            <h3 className="text-3xl font-bold text-gray-900">{lowStockAlerts || 0}</h3>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Stream</h3>
                        {/* Placeholder for activity stream */}
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Box size={20} className="text-gray-500" /> Access Requests
                        </h3>
                        {/* Placeholder for access requests */}
                    </div>
                </div>
            </div>
        </BoutiqueLayout>
    );
}
