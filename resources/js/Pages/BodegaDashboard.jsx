import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head, Link } from '@inertiajs/react';
import { DollarSign, Inbox, AlertCircle, Activity, ArrowRightLeft, CheckCircle, Bell } from 'lucide-react';

export default function BodegaDashboard({ capitalTiedUp, pendingRequests, deadStockCount, activityStreamProp }) {
    const activityStream = activityStreamProp || [];

    const getActivityIcon = (type) => {
        switch(type) {
            case 'transfer': return <ArrowRightLeft size={18} className="text-blue-600" />;
            case 'restock': return <CheckCircle size={18} className="text-green-600" />;
            case 'alert': return <Bell size={18} className="text-orange-600" />;
            default: return <Activity size={18} className="text-gray-600" />;
        }
    };

    const getActivityBg = (type) => {
        switch(type) {
            case 'transfer': return 'bg-blue-100';
            case 'restock': return 'bg-green-100';
            case 'alert': return 'bg-orange-100';
            default: return 'bg-gray-100';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    return (
        <BoutiqueLayout>
            <Head title="Bodega Dashboard" />

            <div className="max-w-7xl pb-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-medium text-gray-900 tracking-tight mb-2">Bodega Overview</h2>
                    <p className="text-gray-700 font-medium">Monitor your high-level warehouse health and metrics.</p>
                </div>

                {/* Top Grid: KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* Capital Tied Up Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center h-[160px]">
                        <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Capital Tied Up in Warehouse</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(capitalTiedUp || 0)}</h3>
                        </div>
                    </div>

                    {/* Pending Requests Card */}
                    <Link href="/stock-transfers" className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center h-[160px] hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Inbox size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pending Branch Requests</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors">{pendingRequests || 0}</h3>
                        </div>
                    </Link>

                    {/* Dead Stock Radar Card */}
                    <Link href="/dead-stock" className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center h-[160px] hover:border-red-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="bg-red-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <AlertCircle size={24} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dead Stock Items</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight group-hover:text-red-700 transition-colors">{deadStockCount || 0}</h3>
                        </div>
                    </Link>
                </div>

                {/* Activity Stream */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg">
                            <Activity size={20} className="text-gray-700" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Recent Activity Stream</h3>
                    </div>
                    <div className="p-0">
                        <ul className="divide-y divide-gray-100">
                            {activityStream.map(activity => (
                                <li key={activity.id} className="p-6 hover:bg-gray-50/50 transition-colors flex gap-4">
                                    <div className={`${getActivityBg(activity.type)} p-3 rounded-full h-fit mt-1`}>
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1 sm:gap-0">
                                            <div>
                                                <p className="font-bold text-gray-900 text-base">{activity.title}</p>
                                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">{activity.actor}</p>
                                            </div>
                                            <div className="flex flex-col sm:items-end mt-1 sm:mt-0">
                                                <span className="text-[13px] font-bold text-gray-800">{activity.timestamp}</span>
                                                <span className="text-[11px] font-medium text-gray-400">{activity.time}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 font-medium mt-1.5 leading-relaxed">{activity.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </BoutiqueLayout>
    );
}
