import React, { useState, useMemo } from 'react';
import BoutiqueLayout from '@/Layouts/BoutiqueLayout';
import { Head, router } from '@inertiajs/react';
import { Search, MoreHorizontal, ArrowUp, ArrowDown, ImagePlus, X, Upload, Camera, RefreshCcw, Zap, Trash2 } from 'lucide-react';

export default function InventoryMasterlist({ itemsProp, categories }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [stockSort, setStockSort] = useState(null); // 'asc' or 'desc'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Modal state
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedItemForImage, setSelectedItemForImage] = useState(null);
    const [stagedFile, setStagedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Camera state
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [isReviewingCapture, setIsReviewingCapture] = useState(false);
    const [isDeletingImage, setIsDeletingImage] = useState(false);

    const items = itemsProp || [];

    const filteredAndSortedItems = useMemo(() => {
        let result = [...items];

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(item => 
                (item.name && item.name.toLowerCase().includes(lowerQuery)) || 
                (item.sku && item.sku.toLowerCase().includes(lowerQuery))
            );
        }

        if (selectedCategory !== 'all') {
            result = result.filter(item => item.category_name === selectedCategory || item.category_id == selectedCategory);
        }

        if (stockSort === 'asc') {
            result.sort((a, b) => a.stock_qty - b.stock_qty);
        } else if (stockSort === 'desc') {
            result.sort((a, b) => b.stock_qty - a.stock_qty);
        } else {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }, [items, searchQuery, selectedCategory, stockSort]);

    const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage) || 1;
    const paginatedItems = filteredAndSortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const formatCurrency = (amount) => {
        return `₱${parseFloat(amount).toFixed(2)}`;
    };

    const openImageModal = (item) => {
        setSelectedItemForImage(item);
        setStagedFile(null);
        setIsImageModalOpen(true);
        setIsReviewingCapture(false);
    };

    const closeImageModal = () => {
        setIsImageModalOpen(false);
    };

    const startCamera = async (mode = facingMode) => {
        setIsCameraActive(true);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: mode } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check your device permissions.");
            setIsCameraActive(false);
        }
    };

    const switchCamera = () => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        startCamera(newMode);
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
        setIsReviewingCapture(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                    setStagedFile(file);
                    setIsReviewingCapture(true);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const retakePhoto = () => {
        setStagedFile(null);
        setIsReviewingCapture(false);
    };

    const confirmCapture = () => {
        setIsReviewingCapture(false);
        stopCamera();
    };

    const handleImageSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setStagedFile(e.target.files[0]);
        }
    };

    const submitDeleteImage = () => {
        if (!selectedItemForImage || !selectedItemForImage.primary_image_path) return;
        
        if (confirm("Are you sure you want to permanently delete this photo?")) {
            setIsDeletingImage(true);
            router.delete(`/inventory-masterlist/${selectedItemForImage.id}/image`, {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updatedItem = page.props.itemsProp.find(i => i.id === selectedItemForImage.id);
                    if (updatedItem) setSelectedItemForImage(updatedItem);
                    setIsDeletingImage(false);
                },
                onError: () => {
                    setIsDeletingImage(false);
                    alert("Failed to delete the image.");
                }
            });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setStagedFile(e.dataTransfer.files[0]);
        }
    };

    const submitImageUpload = () => {
        if (!stagedFile || !selectedItemForImage) return;

        setIsUploading(true);

        router.post(`/inventory-masterlist/${selectedItemForImage.id}/image`, {
            image: stagedFile
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                setIsUploading(false);
                setStagedFile(null);
                
                // Update local selected item so image reflects immediately
                const updatedItem = page.props.itemsProp.find(i => i.id === selectedItemForImage.id);
                if (updatedItem) setSelectedItemForImage(updatedItem);
            },
            onError: () => {
                setIsUploading(false);
            }
        });
    };

    return (
        <BoutiqueLayout>
            <Head title="Inventory Masterlist" />

            <div className="flex flex-col h-full max-w-7xl mx-auto px-2 pb-6 pt-2">
                <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Inventory</h1>
                        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            READ-ONLY
                        </span>
                    </div>

                    {/* Controls Row */}
                    <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3 mb-6 w-full">

                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search inventory..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 pl-10 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-400 hover:border-gray-400 transition-colors" 
                            />
                        </div>

                        {/* Sort buttons group */}
                        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shrink-0">
                            <div className="hidden xl:block px-4 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300 bg-white">
                                SORT BY STOCK LEVEL
                            </div>
                            <button 
                                onClick={() => setStockSort('asc')}
                                title="Lowest to Highest"
                                className={`px-3 xl:px-4 py-2.5 text-xs font-bold text-gray-800 border-r border-gray-300 flex items-center justify-center gap-1.5 transition-colors ${stockSort === 'asc' ? 'bg-gray-100 text-black' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <ArrowUp size={16} className="xl:w-[14px] xl:h-[14px]" /> 
                                <span className="hidden xl:inline">Lowest to Highest</span>
                            </button>
                            <button 
                                onClick={() => setStockSort('desc')}
                                title="Highest to Lowest"
                                className={`px-3 xl:px-4 py-2.5 text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 transition-colors ${stockSort === 'desc' ? 'bg-gray-100 text-black' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <ArrowDown size={16} className="xl:w-[14px] xl:h-[14px]" /> 
                                <span className="hidden xl:inline">Highest to Lowest</span>
                            </button>
                        </div>

                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 pb-4 border-b border-gray-200 text-[11px] font-bold text-gray-800 uppercase tracking-wider px-2">
                        <div className="col-span-5 md:col-span-3">NAME</div>
                        <div className="hidden md:block col-span-2">SKU</div>
                        <div className="col-span-3 md:col-span-3">CATEGORY</div>
                        <div className="col-span-2 md:col-span-2">PRICE</div>
                        <div className="col-span-2 md:col-span-1">STOCK</div>
                        <div className="hidden md:block col-span-1 text-center">TYPE</div>
                    </div>

                    {/* Table Body (Scrollable) */}
                    <div className="flex-1 overflow-y-auto min-h-0 relative">
                        {paginatedItems.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {paginatedItems.map(item => (
                                    <div key={item.id} className="grid grid-cols-12 gap-4 py-3 items-center px-2 hover:bg-gray-50/50 transition-colors group">
                                        <div className="col-span-5 md:col-span-3 flex items-center gap-4 min-w-0">
                                            <div className="relative">
                                                <button 
                                                    onClick={() => openImageModal(item)}
                                                    className="block w-12 h-12 border border-gray-200 rounded-xl flex items-center justify-center bg-white shrink-0 text-gray-400 shadow-sm relative overflow-hidden group-hover:border-gray-300 transition-colors hover:bg-gray-50 focus:outline-none"
                                                >
                                                    {item.primary_image_path ? (
                                                        <>
                                                            <img 
                                                                src={`/storage/${item.primary_image_path}`} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextElementSibling.classList.remove('hidden');
                                                                }}
                                                            />
                                                            <div className="hidden">
                                                                <ImagePlus size={22} className="text-black" strokeWidth={1.5} />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <ImagePlus size={22} className="text-black" strokeWidth={1.5} />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="min-w-0 truncate">
                                                <h4 className="font-bold text-gray-900 text-[15px] leading-tight truncate">{item.name}</h4>
                                            </div>
                                        </div>
                                        <div className="hidden md:block col-span-2 flex items-center min-w-0">
                                            <span className="text-gray-700 text-[12px] font-bold truncate">
                                                {item.sku || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="col-span-3 md:col-span-3 flex items-center min-w-0">
                                            <span className="border border-gray-200 text-gray-700 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white truncate">
                                                {item.category_name}
                                            </span>
                                        </div>
                                        <div className="col-span-2 md:col-span-2 flex items-center">
                                            <span className="font-bold text-gray-900 text-[15px]">{formatCurrency(item.price)}</span>
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex items-center">
                                            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm font-bold w-full max-w-[60px] text-center">
                                                {item.stock_qty}
                                            </span>
                                        </div>
                                        <div className="hidden md:flex col-span-1 items-center justify-center">
                                            <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                {item.is_service ? 'SERVICE' : 'PRODUCT'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <Search size={48} className="mb-4 text-gray-300" />
                                <h4 className="text-lg font-bold text-gray-900 mb-1">No items found</h4>
                                <p className="text-sm font-medium">No items match your search criteria.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-200 mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                        <div className="text-gray-900 font-medium text-xs">
                            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-1.5 border border-gray-300 rounded-full text-gray-700 font-bold text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                            >
                                Prev
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-1.5 border border-gray-300 rounded-full text-gray-700 font-bold text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                            >
                                Next
                            </button>
                            
                            <div className="flex items-center gap-2 ml-4">
                                <span className="text-gray-600 font-bold text-xs uppercase tracking-wider">JUMP To</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={totalPages}
                                    defaultValue={currentPage}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const page = parseInt(e.target.value);
                                            if (page >= 1 && page <= totalPages) setCurrentPage(page);
                                        }
                                    }}
                                    className="w-12 h-7 px-2 text-center text-xs font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300" 
                                />
                                <button className="px-3 py-1 border border-gray-300 rounded-full text-gray-700 font-bold text-[10px] hover:bg-gray-50 transition-colors bg-white">
                                    Go
                                </button>
                                <span className="text-gray-900 font-bold text-xs ml-2">Page {currentPage}/{totalPages}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Upload Modal */}
            {isImageModalOpen && selectedItemForImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[24px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between bg-white">
                            <div>
                                <h2 className="text-[17px] font-bold text-gray-900 leading-tight">Product Images</h2>
                                <p className="text-[13px] font-medium text-gray-600 mt-0.5">{selectedItemForImage.name}</p>
                            </div>
                            <button 
                                onClick={closeImageModal}
                                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white min-h-[400px]">
                            {/* Left Side: Upload Zone */}
                            <div className="flex flex-col gap-6">
                                <div 
                                    className={`rounded-3xl p-6 border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${
                                        isDragging ? 'bg-blue-50 border-blue-400' : 'bg-[#e5e5e5]/50 border-gray-300'
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className="bg-white w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center mb-5 border border-gray-100">
                                        <Upload size={24} className="text-gray-800" strokeWidth={2} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Upload images</h3>
                                    <p className="text-sm text-gray-600 font-medium mb-6 px-4">
                                        Drag & drop or browse. JPEG,<br/>PNG, WebP up to 5MB.
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-[300px] mb-6">
                                        <label className="flex-1 w-full bg-white border border-gray-200 py-3 rounded-2xl font-bold text-sm text-gray-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-gray-200">
                                            <Upload size={18} strokeWidth={2} /> Browse
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/jpeg,image/png,image/webp" 
                                                onChange={handleImageSelect}
                                            />
                                        </label>
                                        <button 
                                            onClick={startCamera}
                                            className="flex-1 w-full bg-white border border-gray-200 py-3 rounded-2xl font-bold text-sm text-gray-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-gray-200"
                                        >
                                            <Camera size={18} strokeWidth={2} /> Take Photo
                                        </button>
                                    </div>

                                    <button 
                                        onClick={submitImageUpload}
                                        disabled={!stagedFile || isUploading}
                                        className={`w-full max-w-[300px] py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                                            stagedFile 
                                            ? 'bg-gray-300 text-gray-900 hover:bg-gray-400' 
                                            : 'bg-gray-300/50 text-gray-500 cursor-not-allowed border border-gray-200'
                                        }`}
                                    >
                                        {isUploading ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>

                                {/* Image Preview Section */}
                                {stagedFile && (
                                    <div>
                                        <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-3">Preview (1)</h4>
                                        <div className="flex gap-3">
                                            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative group">
                                                <img 
                                                    src={URL.createObjectURL(stagedFile)} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover" 
                                                />
                                                <button 
                                                    onClick={() => setStagedFile(null)}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 backdrop-blur-sm text-white rounded-full p-2 transition-colors shadow-sm focus:outline-none"
                                                    title="Remove photo"
                                                >
                                                    <X size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Images List */}
                            <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Images</h4>
                                    <button className="px-4 py-1.5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                                        Refresh
                                    </button>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center border border-transparent rounded-2xl bg-white p-2">
                                    {selectedItemForImage.primary_image_path ? (
                                        <div className="relative group w-full h-full flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                                            <img 
                                                src={`/storage/${selectedItemForImage.primary_image_path}`} 
                                                alt="Product" 
                                                className="max-w-full max-h-[300px] object-contain rounded-xl" 
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextElementSibling.classList.remove('hidden');
                                                }}
                                            />
                                            <div className="hidden text-gray-500 font-bold">Image not found</div>
                                            
                                            <button 
                                                onClick={submitDeleteImage}
                                                disabled={isDeletingImage}
                                                className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 backdrop-blur-md text-white p-2.5 rounded-xl transition-all shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                                title="Delete this photo"
                                            >
                                                {isDeletingImage ? <RefreshCcw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-[15px] font-medium text-gray-800 flex h-full items-start w-full pt-2">
                                            No images yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full-screen Camera Overlay */}
            {isCameraActive && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-200">
                    {isReviewingCapture ? (
                        <>
                            {/* Review Mode Top Bar */}
                            <div className="absolute top-0 left-0 right-0 p-6 flex justify-center items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
                                <h3 className="text-white font-bold text-sm tracking-wide">Preview</h3>
                            </div>

                            {/* Review Mode Video/Image */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                                {stagedFile && (
                                    <img 
                                        src={URL.createObjectURL(stagedFile)} 
                                        alt="Captured Preview" 
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            
                            {/* Review Mode Bottom Bar */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex justify-center items-center gap-4 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                <button 
                                    onClick={retakePhoto}
                                    className="px-8 py-3 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full font-bold transition-colors shadow-lg border border-white/40 min-w-[140px]"
                                >
                                    Retake
                                </button>
                                <button 
                                    onClick={confirmCapture}
                                    className="px-8 py-3 bg-white hover:bg-gray-100 text-black rounded-full font-bold transition-colors shadow-lg min-w-[140px]"
                                >
                                    Use Photo
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Live Camera Mode */}
                            {/* Top Controls */}
                            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
                                <button 
                                    onClick={stopCamera}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors focus:outline-none"
                                >
                                    <X size={20} />
                                </button>
                                <h3 className="text-white font-bold text-sm tracking-wide absolute left-1/2 -translate-x-1/2">Take Product Photo</h3>
                                <button 
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors focus:outline-none"
                                >
                                    <Zap size={20} />
                                </button>
                            </div>

                            {/* Video Feed */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                                ></video>
                                <canvas ref={canvasRef} className="hidden"></canvas>
                            </div>

                            {/* Bottom Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex justify-center items-center z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                <button 
                                    onClick={capturePhoto}
                                    className="w-20 h-20 bg-transparent rounded-full border-4 border-white/60 flex items-center justify-center p-1.5 focus:outline-none hover:scale-105 transition-transform"
                                >
                                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-inner text-black">
                                        <Camera size={28} />
                                    </div>
                                </button>
                                <button 
                                    onClick={switchCamera}
                                    className="absolute right-8 bottom-12 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors focus:outline-none"
                                >
                                    <RefreshCcw size={24} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            <style jsx>{`
                /* Hide scrollbar for cleaner look if requested, but left visible to show it's a scrollable list */
                .overflow-y-auto {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: transparent;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                }
            `}</style>
        </BoutiqueLayout>
    );
}
