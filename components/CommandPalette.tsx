import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
    Search, Command, Zap, LayoutDashboard, Settings,
    Layers, MessageSquare, MonitorPlay, FileText, Factory, Plus
} from 'lucide-react';
import { AppMode, AppView } from '../types';

interface CommandPaletteProps {
    onNavigate: (view: AppView) => void;
    onSelectMode: (mode: AppMode) => void;
    onNewChat?: (prompt: string) => void;
    onOpenThemeSettings?: () => void;
    onOpenChangelog?: () => void;
    isOpen?: boolean; // Optional prop if controlled externally
    onClose?: () => void;
}

interface CommandItem {
    id: string;
    title: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
    category: 'Modes' | 'Navigation' | 'Actions';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    onNavigate,
    onSelectMode,
    onNewChat,
    onOpenThemeSettings,
    onOpenChangelog
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle with Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const close = () => {
        setIsOpen(false);
        setQuery('');
    };

    const handleModeSwitch = (mode: AppMode) => {
        onSelectMode(mode);
        onNavigate('workspace');
        close();
    };

    const commands: CommandItem[] = [
        // Static New Chat
        {
            id: 'action-new-chat-static',
            title: 'New Chat',
            icon: <Plus size={18} />,
            category: 'Actions' as const,
            action: () => {
                if (onNewChat) onNewChat('');
                close();
            }
        },
        // Dynamic "New Chat" command
        ...(() => {
            const match = query.match(/^new chat\s+["'](.+)["']$/i);
            if (match && match[1]) {
                const prompt = match[1];
                return [{
                    id: 'action-new-chat-prompt',
                    title: `Start New Chat with: "${prompt}"`,
                    icon: <Plus size={18} className="text-brand-400" />,
                    category: 'Actions' as const,
                    action: () => {
                        if (onNewChat) onNewChat(prompt);
                        close();
                    }
                }];
            }
            // Also suggest "new chat" if typing it but no quotes yet
            if (query.toLowerCase().startsWith('new chat')) {
                return [{
                    id: 'action-new-chat-hint',
                    title: 'New Chat (type "new chat \"prompt\"" to start)',
                    icon: <Plus size={18} />,
                    category: 'Actions' as const,
                    action: () => {
                        setQuery('new chat ""');
                        setTimeout(() => {
                            inputRef.current?.setSelectionRange(10, 10);
                            inputRef.current?.focus();
                        }, 0);
                    }
                }];
            }
            return [];
        })(),
        // Modes
        {
            id: 'mode-everyday',
            title: 'Switch to Everyday Mode',
            icon: <MessageSquare size={18} />,
            category: 'Modes',
            action: () => handleModeSwitch(AppMode.EVERYDAY)
        },
        {
            id: 'mode-vibe',
            title: 'Switch to Vibe Code',
            icon: <Zap size={18} />,
            category: 'Modes',
            action: () => handleModeSwitch(AppMode.VIBE_CODE)
        },
        {
            id: 'mode-media',
            title: 'Switch to Media Gen',
            icon: <MonitorPlay size={18} />,
            category: 'Modes',
            action: () => handleModeSwitch(AppMode.MEDIA_GEN)
        },
        {
            id: 'mode-source',
            title: 'Switch to Talk to Source',
            icon: <FileText size={18} />,
            category: 'Modes',
            action: () => handleModeSwitch(AppMode.TALK_TO_SOURCE)
        },
        // Navigation
        {
            id: 'nav-dashboard',
            title: 'Go to Dashboard',
            icon: <LayoutDashboard size={18} />,
            category: 'Navigation',
            action: () => { onNavigate('dashboard'); close(); }
        },
        {
            id: 'nav-factory',
            title: 'Go to Prompt Factory',
            icon: <Factory size={18} />,
            category: 'Navigation',
            action: () => { onNavigate('factory'); close(); }
        },
        {
            id: 'nav-history',
            title: 'Go to History',
            icon: <Layers size={18} />,
            category: 'Navigation',
            action: () => { onNavigate('history'); close(); }
        },
        {
            id: 'nav-settings',
            title: 'Go to Settings',
            icon: <Settings size={18} />,
            category: 'Navigation',
            action: () => { onNavigate('settings'); close(); }
        },
        // Actions
        {
            id: 'action-theme',
            title: 'Customize Theme',
            icon: <Zap size={18} />, // Reusing Zap or maybe Palette
            category: 'Actions',
            action: () => {
                if (onOpenThemeSettings) onOpenThemeSettings();
                close();
            }
        },
        {
            id: 'action-changelog',
            title: 'View Changelog',
            icon: <FileText size={18} />,
            category: 'Actions',
            action: () => {
                if (onOpenChangelog) onOpenChangelog();
                close();
            }
        }
    ];

    const filteredCommands = commands.filter(cmd => {
        const lowerQuery = query.toLowerCase();
        const lowerTitle = cmd.title.toLowerCase();

        // Show dynamic prompt commands only if query starts with 'new chat "' or is specifically the hint
        if (cmd.id.startsWith('action-new-chat-prompt') || cmd.id.startsWith('action-new-chat-hint')) {
            return lowerQuery.startsWith('new chat');
        }

        // Standard behavior: show if title matches query
        return lowerTitle.includes(lowerQuery);
    });

    // Keyboard navigation for list
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={close}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[60vh]"
                        style={{
                            backgroundColor: 'var(--bg-search-palette)',
                            border: '1px solid var(--border-search-palette)'
                        }}
                    >
                        {/* Header / Input */}
                        <div className="flex items-center px-4 py-3 border-b gap-3" style={{ borderColor: 'var(--border-search-palette)' }}>
                            <Search className="text-gray-500" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent border-none outline-none placeholder-gray-500 text-lg"
                                style={{ color: 'var(--text-app)' }}
                            />
                            <div className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: 'var(--bg-kbd)', color: 'var(--text-kbd)' }}>ESC</div>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                            {filteredCommands.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredCommands.map((cmd, index) => (
                                        <button
                                            key={cmd.id}
                                            onClick={() => cmd.action()}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={clsx(
                                                "w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors",
                                                index === selectedIndex
                                                    ? 'bg-brand-600/20 text-brand-500 dark:text-brand-100'
                                                    : 'text-gray-500 hover:bg-black/5 dark:hover:bg-dark-800'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded-md" style={{ backgroundColor: index === selectedIndex ? 'rgba(var(--color-brand-600), 0.3)' : 'var(--bg-sidebar-alt)' }}>
                                                    {cmd.icon}
                                                </div>
                                                <span className={clsx("font-medium", index === selectedIndex ? "text-brand-600 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
                                                    {cmd.title}
                                                </span>
                                            </div>
                                            {index === selectedIndex && (
                                                <span className="text-xs text-brand-300 font-medium">Enter</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-500">
                                    <Command className="mx-auto mb-2 opacity-50" size={32} />
                                    <p>No results found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 flex items-center justify-between text-xs border-t" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-search-palette)', color: 'var(--text-sidebar-dim)' }}>
                            <div className="flex gap-4">
                                <span><kbd className="font-sans px-1 rounded" style={{ backgroundColor: 'var(--bg-kbd)', color: 'var(--text-kbd)' }}>↑↓</kbd> to navigate</span>
                                <span><kbd className="font-sans px-1 rounded" style={{ backgroundColor: 'var(--bg-kbd)', color: 'var(--text-kbd)' }}>↵</kbd> to select</span>
                            </div>
                            <span className="opacity-70">PromptOrigin Command Palette</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
