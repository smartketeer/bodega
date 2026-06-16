import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head, Link } from '@inertiajs/react';
import { DollarSign, Inbox, AlertCircle, Activity, ArrowRightLeft, CheckCircle, Bell } from 'lucide-react';

export default function BodegaDashboard({ capitalTiedUp, pendingRequests, deadStockCount, activityStreamProp }) {
    const activityStream = activityStreamProp || [];

    const getActivityStyle = (type) => {
        switch(type) {
            case 'transfer': return { borderBg: 'border-blue-200 bg-blue-50/30', dot: 'bg-blue-500', tag: 'text-blue-600' };
            case 'restock': return { borderBg: 'border-green-200 bg-green-50/30', dot: 'bg-green-500', tag: 'text-green-600' };
            case 'alert': return { borderBg: 'border-orange-200 bg-orange-50/30', dot: 'bg-orange-500', tag: 'text-orange-600' };
            default: return { borderBg: 'border-gray-200 bg-gray-50/30', dot: 'bg-gray-500', tag: 'text-gray-600' };
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
                    <div className="p-6">
                        <div className="flex flex-col">
                            {activityStream.map(activity => {
                                const styles = getActivityStyle(activity.type);
                                return (
                                    <div key={activity.id} className={`border ${styles.borderBg} rounded-xl p-4 mb-3 transition-colors hover:bg-white`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${styles.dot}`}></div>
                                                <span className="font-bold text-gray-900 text-[15px]">{activity.actor}</span>
                                                <span className={`bg-gray-100 text-[10px] px-2.5 py-0.5 rounded-full font-bold ${styles.tag}`}>
                                                    {activity.title}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-semibold text-gray-800">{activity.timestamp}</span>
                                                <span className="text-[10px] font-medium text-gray-400">{activity.time}</span>
                                            </div>
                                        </div>
                                        <p className="text-[13px] text-gray-800 font-medium ml-4 leading-relaxed">{activity.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </BoutiqueLayout>
    );
}
