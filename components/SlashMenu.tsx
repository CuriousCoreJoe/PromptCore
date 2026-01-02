import React, { useEffect, useState } from 'react';
import { BookOpen, Newspaper, Languages, FileText, PenTool, Code2 } from 'lucide-react';

interface Command {
    id: string;
    label: string;
    icon: React.ReactNode;
    action: () => void;
}

interface SlashMenuProps {
    isVisible: boolean;
    position: { top: number; left: number };
    onSelect: (command: Command) => void;
    onClose: () => void;
    filterText: string;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({ isVisible, position, onSelect, onClose, filterText }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commands: Command[] = [
        { id: 'explain', label: 'Explain this', icon: <BookOpen size={16} />, action: () => { } },
        { id: 'press', label: 'Press release', icon: <Newspaper size={16} />, action: () => { } },
        { id: 'translate', label: 'Translate', icon: <Languages size={16} />, action: () => { } },
        { id: 'summarize', label: 'Summarize', icon: <FileText size={16} />, action: () => { } },
        { id: 'improve', label: 'Improve writing', icon: <PenTool size={16} />, action: () => { } },
        { id: 'code', label: 'Explain codes', icon: <Code2 size={16} />, action: () => { } },
    ];

    const filteredCommands = commands.filter(c =>
        c.label.toLowerCase().includes(filterText.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [filterText]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isVisible) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    onSelect(filteredCommands[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, filteredCommands, selectedIndex, onSelect, onClose]);

    if (!isVisible) return null;

    return (
        <div
            className="absolute z-50 w-64 bg-dark-900 border border-dark-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top, left: position.left, transform: 'translateY(-100%) mt-2' }}
        >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-dark-800 bg-dark-950/50">
                COMMANDS
            </div>
            <div className="py-1">
                {filteredCommands.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">No matches found</div>
                ) : (
                    filteredCommands.map((cmd, idx) => (
                        <button
                            key={cmd.id}
                            onClick={() => onSelect(cmd)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${idx === selectedIndex
                                    ? 'bg-brand-900/30 text-brand-100 border-l-2 border-brand-500'
                                    : 'text-gray-300 hover:bg-dark-800'
                                }`}
                        >
                            <span className={idx === selectedIndex ? 'text-brand-400' : 'text-gray-500'}>
                                {cmd.icon}
                            </span>
                            {cmd.label}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
