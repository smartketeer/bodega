import { Layers } from 'lucide-react';

export default function ApplicationLogo(props) {
    const isSmall = props.className?.includes('h-9');

    if (isSmall) {
        return (
            <div className="flex items-center gap-2">
                <Layers size={24} className="text-gray-900" />
                <span className="font-bold text-lg text-gray-900 leading-none">Bodega</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
                <Layers size={32} className="text-white" />
            </div>
            <div className="text-center">
                <h1 className="font-bold text-3xl text-gray-900 leading-none tracking-tight">Bodega</h1>
                <p className="font-bold text-[13px] text-gray-500 uppercase tracking-[0.2em] mt-2">Inventory System</p>
            </div>
        </div>
    );
}
