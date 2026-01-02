import React from 'react';
import { Minimize2, Maximize2, Briefcase, Coffee, List, FileText, RotateCw, X } from 'lucide-react';

interface RefineOption {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface RefineMenuProps {
    isVisible: boolean;
    position: { top: number; left: number };
    onSelect: (option: string) => void;
    onClose: () => void;
}

export const RefineMenu: React.FC<RefineMenuProps> = ({ isVisible, position, onSelect, onClose }) => {
    const options: RefineOption[] = [
        { id: 'shorten', label: 'Shorten', icon: <Minimize2 size={14} /> },
        { id: 'elaborate', label: 'Elaborate', icon: <Maximize2 size={14} /> },
        { id: 'formal', label: 'More formal', icon: <Briefcase size={14} /> },
        { id: 'casual', label: 'More casual', icon: <Coffee size={14} /> },
        { id: 'bulletize', label: 'Bulletize', icon: <List size={14} /> },
        { id: 'summarize', label: 'Summarize', icon: <FileText size={14} /> },
        { id: 'retry', label: 'Retry', icon: <RotateCw size={14} /> },
    ];

    if (!isVisible) return null;

    return (
        <div
            className="absolute z-50 bg-dark-900 border border-dark-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[180px]"
            style={{ top: position.top, left: position.left }}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-dark-800 bg-dark-950/50">
                <span className="text-xs font-semibold text-gray-500">REFINE</span>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
                    <X size={12} />
                </button>
            </div>
            <div className="py-1">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => onSelect(opt.id)}
                        className="w-full text-left px-3 py-2 flex items-center gap-3 text-sm text-gray-300 hover:bg-dark-800 hover:text-white transition-colors"
                    >
                        <span className="text-gray-500">{opt.icon}</span>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
