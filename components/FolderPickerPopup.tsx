import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Folder, X, Check, Search, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Folder as FolderType } from '../types';

interface FolderPickerPopupProps {
    isOpen: boolean;
    onClose: () => void;
    folders: FolderType[];
    currentFolderId: string | null;
    onSelect: (folderId: string | null) => void;
    triggerRect?: DOMRect | null;
}

export const FolderPickerPopup: React.FC<FolderPickerPopupProps> = ({
    isOpen,
    onClose,
    folders,
    currentFolderId,
    onSelect,
    triggerRect
}) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [searchQuery, setSearchQuery] = useState('');
    const popupRef = useRef<HTMLDivElement>(null);
    const triggerOffsetTop = triggerRect ? triggerRect.top + window.scrollY : 0;
    const triggerOffsetLeft = triggerRect ? triggerRect.left + window.scrollX : 0;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen && !isMobile) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isMobile, onClose]);

    if (!isOpen) return null;

    const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderContent = () => (
        <div className="flex flex-col h-full max-h-[60vh] md:max-h-[300px]">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Move to Folder</h3>
                {isMobile && (
                    <button onClick={onClose} className="p-1 text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="p-2 border-b border-white/5">
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search folders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-white"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                <button
                    onClick={() => { onSelect(null); onClose(); }}
                    className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                        currentFolderId === null ? "bg-brand-500/10 text-brand-400 font-medium" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        <span>Recents (Uncategorized)</span>
                    </div>
                    {currentFolderId === null && <Check size={12} />}
                </button>

                {filteredFolders.map(folder => (
                    <button
                        key={folder.id}
                        onClick={() => { onSelect(folder.id); onClose(); }}
                        className={clsx(
                            "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                            currentFolderId === folder.id ? "bg-brand-500/10 text-brand-400 font-medium" : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folder.color }} />
                            <span className="truncate">{folder.name}</span>
                        </div>
                        {currentFolderId === folder.id && <Check size={12} />}
                    </button>
                ))}

                {filteredFolders.length === 0 && searchQuery && (
                    <p className="px-4 py-4 text-center text-[10px] text-gray-600">No folders found</p>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return createPortal(
            <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div
                    className="absolute inset-0"
                    onClick={onClose}
                />
                <div className="relative bg-[#131314] rounded-t-2xl shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom-full duration-300">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-3" />
                    {renderContent()}
                    <div className="h-safe-bottom" />
                </div>
            </div>,
            document.body
        );
    }

    // Desktop Positioning
    const top = triggerRect ? (
        triggerRect.bottom + 8 + 300 > window.innerHeight
            ? triggerRect.top - 8 - 300
            : triggerRect.bottom + 8
    ) : 0;

    const left = triggerRect ? (
        triggerRect.left + 224 > window.innerWidth
            ? triggerRect.right - 224
            : triggerRect.left
    ) : 0;

    return createPortal(
        <div
            ref={popupRef}
            style={{
                position: 'absolute',
                top: `${top + window.scrollY}px`,
                left: `${left + window.scrollX}px`,
                width: '224px'
            }}
            className="z-[100] bg-[#1e1f20] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
            {renderContent()}
        </div>,
        document.body
    );
};
