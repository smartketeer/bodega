import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Box, 
    ArrowLeftRight, 
    BarChart3,
    Settings,
    LogOut,
    Bell,
    Menu,
    X,
    AlertCircle,
    ArrowLeft,
    List
} from 'lucide-react';

export default function BoutiqueLayout({ user, children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const { globalNotifications } = usePage().props;
    
    const displayNotifications = globalNotifications || [];

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const navItems = [
        { name: 'Bodega Dashboard', href: '/bodega-dashboard', icon: LayoutDashboard },
        { name: 'Inventory Masterlist', href: '/inventory-masterlist', icon: List },
        { name: 'Stock Management', href: '/stock-transfers', icon: ArrowLeftRight },
        { name: 'Dead Stock Radar', href: '/dead-stock', icon: AlertCircle },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
    ];

    // Determine if current URL matches the item's href
    const isActive = (path) => {
        if (typeof window !== 'undefined') {
            return window.location.pathname === path || (path === '/bodega-dashboard' && window.location.pathname === '/');
        }
        return false;
    };

    return (
        <div className="h-screen bg-[#EBECEF] flex flex-col md:flex-row font-sans text-gray-900 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-gray-900/50 md:hidden backdrop-blur-sm transition-opacity" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                />
            )}

            {/* Sidebar (Desktop + Mobile) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                {/* Mobile Close Button */}
                <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="md:hidden absolute top-5 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
                >
                    <X size={20} />
                </button>

                {/* Logo Area */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-200 p-2.5 rounded-xl flex items-center justify-center">
                            <LayoutDashboard size={24} className="text-gray-700" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-tight text-lg">Bodega Inventory</h1>
                            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Workspace</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-4">
                    <div className="mb-2 px-3">
                        <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Main Navigation</span>
                    </div>
                    <nav className="space-y-1.5">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-3.5 md:py-3 rounded-xl text-sm font-semibold transition-colors ${
                                        active 
                                        ? 'bg-gray-200 text-gray-900' 
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <item.icon size={20} className={active ? 'text-gray-900' : 'text-gray-500'} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Profile Area */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm">
                        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                            A
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">Admin User</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Admin</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <a href="https://boutique-pos.com/admin" className="flex items-center gap-3 px-4 py-2 w-full text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors">
                            <ArrowLeft size={20} className="text-gray-500" />
                            Back to Main Inventory
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Topbar */}
                <header className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between border-b border-gray-200 bg-white md:bg-transparent md:border-transparent flex-shrink-0 relative z-10">
                    <div className="flex items-center gap-3 md:hidden">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)} 
                            className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="font-bold text-gray-900 tracking-tight">Bodega Module</div>
                    </div>
                    
                    <div className="hidden md:flex items-center bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">{formattedDate} | {formattedTime}</span>
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-colors relative z-50 ${isNotificationsOpen ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                        >
                            <Bell size={18} className="text-gray-700" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        {isNotificationsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                        <h3 className="font-bold text-gray-900">Notifications</h3>
                                        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{displayNotifications.length} New</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                        {displayNotifications.map(notification => (
                                            <Link 
                                                href={notification.type === 'alert' ? '/dead-stock' : notification.type === 'transfer' ? '/stock-transfers' : '/bodega-dashboard'}
                                                key={notification.id} 
                                                onClick={() => setIsNotificationsOpen(false)}
                                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 block"
                                            >
                                                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notification.type === 'alert' ? 'bg-red-100 text-red-600' : notification.type === 'transfer' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <Bell size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{notification.title}</p>
                                                    <p className="text-xs text-gray-600 mt-0.5 font-medium">{notification.message}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1.5 tracking-wider">{notification.time}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-gray-100 text-center bg-gray-50/50">
                                        <Link 
                                            href="/bodega-dashboard" 
                                            onClick={() => setIsNotificationsOpen(false)} 
                                            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors block w-full"
                                        >
                                            View All Activity
                                        </Link>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* Page Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pt-4 md:pt-2">
                    {children}
                </div>
            </main>
        </div>
    );
}
