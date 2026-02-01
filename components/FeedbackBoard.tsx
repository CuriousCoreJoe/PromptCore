import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FeedbackItem, FeedbackComment } from '../types';
import { MessageSquare, Plus, MessageCircle, X, ChevronUp } from 'lucide-react';

interface FeedbackBoardProps {
    userId: string;
}

export const FeedbackBoard: React.FC<FeedbackBoardProps> = ({ userId }) => {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [filter, setFilter] = useState<'all' | 'bug' | 'suggestion' | 'feedback' | 'complaint'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemType, setNewItemType] = useState<FeedbackItem['type']>('suggestion');
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [comments, setComments] = useState<{ [key: string]: FeedbackComment[] }>({});
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchItems = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('feedback_items')
            .select('*, feedback_upvotes(user_id)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching feedback:', error);
            setIsLoading(false);
            return;
        }

        const processedItems: FeedbackItem[] = data.map((item: any) => ({
            ...item,
            vote_count: item.feedback_upvotes?.length || 0,
            user_has_voted: item.feedback_upvotes?.some((v: any) => v.user_id === userId),
        }));

        processedItems.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setItems(processedItems);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchItems();

        const subscription = supabase
            .channel('feedback_board')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'feedback_items' },
                () => fetchItems()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'feedback_upvotes' },
                () => fetchItems()
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId]);

    const handleVote = async (itemId: string, hasVoted: boolean) => {
        if (!userId) return;

        if (hasVoted) {
            await supabase.from('feedback_upvotes').delete().match({ user_id: userId, feedback_id: itemId });
        } else {
            await supabase.from('feedback_upvotes').insert({ user_id: userId, feedback_id: itemId });
        }

        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    vote_count: (item.vote_count || 0) + (hasVoted ? -1 : 1),
                    user_has_voted: !hasVoted
                };
            }
            return item;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemContent.trim()) return;

        const { error } = await supabase.from('feedback_items').insert({
            user_id: userId || null,
            content: newItemContent,
            type: newItemType,
            status: 'open',
            tags: [newItemType === 'bug' ? 'bug' : 'user-feedback']
        });

        if (!error) {
            setIsModalOpen(false);
            setNewItemContent('');
            setNewItemType('suggestion');
            fetchItems();
        }
    };

    const fetchComments = async (itemId: string) => {
        const { data } = await supabase
            .from('feedback_comments')
            .select('*')
            .eq('feedback_id', itemId)
            .order('created_at', { ascending: true });

        if (data) {
            setComments(prev => ({ ...prev, [itemId]: data }));
        }
    };

    const toggleExpand = (itemId: string) => {
        if (expandedItem === itemId) {
            setExpandedItem(null);
        } else {
            setExpandedItem(itemId);
            if (!comments[itemId]) {
                fetchComments(itemId);
            }
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent, itemId: string) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const { error } = await supabase.from('feedback_comments').insert({
            feedback_id: itemId,
            user_id: userId || null,
            content: newComment
        });

        if (!error) {
            setNewComment('');
            fetchComments(itemId);
        }
    };

    const filteredItems = items.filter(item => filter === 'all' || item.type === filter);

    return (
        <div className="h-full flex flex-col bg-dark-950 text-gray-100 p-6 relative overflow-hidden">
            {/* Submit Feedback Prompt */}
            <div className="bg-gradient-to-r from-brand-600/10 to-violet-600/10 border border-brand-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Have an idea or found a bug?</h3>
                    <p className="text-gray-400 text-sm">Your feedback helps us build the ultimate prompt staging ground.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-brand-500/20 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={18} /> Submit Feedback
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {(['all', 'bug', 'suggestion', 'feedback', 'complaint'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-5 py-2 rounded-full text-sm font-bold border transition-all capitalize whitespace-nowrap ${filter === f
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'bg-dark-900 border-dark-800 text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500">Loading...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-dark-900/30 rounded-2xl border border-dashed border-dark-800">
                        <MessageSquare className="mx-auto mb-4 text-gray-700" size={32} />
                        <h4 className="text-white font-bold mb-2">No feedback yet</h4>
                        <p className="text-gray-400 text-sm mb-6">Be the first to share your thoughts!</p>
                        <button onClick={() => setIsModalOpen(true)} className="text-brand-400 font-bold hover:text-brand-300 transition-colors">
                            Submit a report
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-dark-900/50 border border-dark-800 rounded-2xl p-5 hover:border-brand-500/30 transition-all">
                                <div className="flex gap-5">
                                    <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                        <button
                                            onClick={() => handleVote(item.id, item.user_has_voted || false)}
                                            className={`p-2 rounded-xl transition-all ${item.user_has_voted ? 'bg-brand-600 text-white' : 'bg-dark-950 text-gray-500 border border-dark-800'}`}
                                        >
                                            <ChevronUp size={20} />
                                        </button>
                                        <span className="font-bold text-gray-400">{item.vote_count}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-dark-800 text-gray-400 border border-dark-700">
                                                {item.type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-200 mb-3">{item.content}</p>
                                        <button onClick={() => toggleExpand(item.id)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                                            <MessageCircle size={14} /> {comments[item.id]?.length || 0} Comments
                                        </button>

                                        {expandedItem === item.id && (
                                            <div className="mt-4 pt-4 border-t border-dark-800">
                                                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                                                    {comments[item.id]?.map(c => (
                                                        <div key={c.id} className="bg-dark-950 p-2 rounded shadow-sm">
                                                            <p className="text-sm text-gray-300">{c.content}</p>
                                                            <span className="text-[10px] text-gray-600">{new Date(c.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    ))}
                                                    {(!comments[item.id] || comments[item.id].length === 0) && (
                                                        <p className="text-xs text-gray-600 italic">No comments yet.</p>
                                                    )}
                                                </div>
                                                <form onSubmit={(e) => handleCommentSubmit(e, item.id)} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Add a comment..."
                                                        className="flex-1 bg-dark-950 border border-dark-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
                                                    />
                                                    <button type="submit" className="bg-brand-600 text-white px-3 py-1.5 rounded text-sm font-bold">Post</button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Share your thoughts</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {(['suggestion', 'bug', 'feedback', 'complaint'] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setNewItemType(t)}
                                        className={`py-2 rounded-lg text-sm font-bold border capitalize transition-all ${newItemType === t ? 'bg-brand-600 border-brand-500 text-white' : 'bg-dark-950 border-dark-800 text-gray-500'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={newItemContent}
                                onChange={(e) => setNewItemContent(e.target.value)}
                                placeholder="Details..."
                                className="w-full h-32 bg-dark-950 border border-dark-700 rounded-xl p-4 text-white focus:border-brand-500 outline-none resize-none"
                                required
                            />
                            <button type="submit" className="w-full bg-brand-600 py-3 rounded-xl text-white font-bold hover:bg-brand-500 transition-colors">
                                Submit
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
