import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChatSession, UserProfile, AppMode } from '../types';
import { ArrowLeft, Clock, Bookmark, Search, MoreHorizontal, MessageSquare, Trash2, Edit2, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

interface HistoryPageProps {
    onBack: () => void;
    onLoadChat: (chatId: string) => void;
    userProfile: UserProfile | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, onLoadChat, userProfile }) => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');

    useEffect(() => {
        fetchChats();

        if (userProfile?.id) {
            const channel = supabase
                .channel('history-page-realtime')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                    filter: `user_id=eq.${userProfile.id}`
                }, () => {
                    fetchChats(); // Refetch on any change
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [userProfile?.id]);

    const fetchChats = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('chats')
            .select('*')
            .order('updated_at', { ascending: false });

        if (data) setChats(data as unknown as ChatSession[]);
        setIsLoading(false);
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            await supabase.from('chats').delete().eq('id', chatId);
            // State will update via real-time subscription
        }
    };

    const handleRenameChat = async (e: React.MouseEvent, chatId: string, currentTitle: string) => {
        e.stopPropagation();
        const newTitle = window.prompt('Enter new chat title:', currentTitle);
        if (newTitle && newTitle.trim() !== currentTitle) {
            await supabase
                .from('chats')
                .update({ title: newTitle.trim() })
                .eq('id', chatId);
            // State will update via real-time subscription
        }
    };

    // Group chats by date
    const groupedChats = chats.reduce((acc, chat) => {
        const date = new Date(chat.updated_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let key = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

        if (date.toDateString() === today.toDateString()) key = 'Today';
        else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';

        if (!acc[key]) acc[key] = [];
        acc[key].push(chat);
        return acc;
    }, {} as Record<string, ChatSession[]>);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-100 font-sans overflow-y-auto">
            {/* Header */}
            <div className="flex-shrink-0 pt-12 pb-8 flex flex-col items-center justify-center border-b border-white/5 relative bg-gradient-to-b from-[#131314] to-[#0a0a0a]">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Profile Info */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-2xl ring-4 ring-white/5 uppercase">
                    {userProfile?.email?.charAt(0) || userProfile?.full_name?.charAt(0) || 'U'}
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">
                    {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User'}
                </h1>
                <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider font-semibold">
                    {userProfile?.subscription_status || 'Free'} Tier
                </p>

                {/* Tabs */}
                <div className="flex items-center bg-[#1E1F20] p-1 rounded-full border border-white/5">
                    <button
                        onClick={() => setActiveTab('bookmarks')} // Placeholder
                        className={clsx(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all",
                            activeTab === 'bookmarks' ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        Bookmark
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={clsx(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all",
                            activeTab === 'history' ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                {isLoading ? (
                    <div className="text-center text-gray-500 mt-20">Loading history...</div>
                ) : chats.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">No history found. Start a new chat!</div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedChats).map(([dateLabel, groupChats]) => (
                            <div key={dateLabel}>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">
                                    {dateLabel}
                                </h3>
                                <div className="space-y-1">
                                    {groupChats.map(chat => (
                                        <div
                                            key={chat.id}
                                            onClick={() => onLoadChat(chat.id)}
                                            className="group flex items-center gap-4 p-4 rounded-xl hover:bg-[#1E1F20] cursor-pointer transition-all border border-transparent hover:border-white/5"
                                        >
                                            <div className="text-xs font-mono text-gray-500 w-12 text-right">
                                                {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-dark-800 text-gray-400 group-hover:bg-brand-500/10 group-hover:text-brand-400 transition-colors">
                                                <MessageSquare size={16} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-gray-300 group-hover:text-white font-medium truncate transition-colors">
                                                    {chat.title || 'New Chat'}
                                                </h4>
                                                <p className="text-xs text-gray-600 group-hover:text-gray-500 truncate mt-0.5 capitalize">
                                                    {chat.mode ? chat.mode.replace('_', ' ').toLowerCase() : 'Everyday'}
                                                </p>
                                            </div>

                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                                <button
                                                    onClick={(e) => handleRenameChat(e, chat.id, chat.title || '')}
                                                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Rename Chat"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
