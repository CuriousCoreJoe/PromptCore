import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FeedbackItem, FeedbackComment } from '../types';
import { MessageSquare, ThumbsUp, Plus, Bug, Check, Filter, MessageCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

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

        // Process upvotes count and user vote status
        const processedItems: FeedbackItem[] = data.map((item: any) => ({
            ...item,
            vote_count: item.feedback_upvotes?.length || 0,
            user_has_voted: item.feedback_upvotes?.some((v: any) => v.user_id === userId),
        }));

        // Sort by votes (optional default) or keep chronological
        // Let's sort by votes desc, then date
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
                () => fetchItems() // Refresh to update counts
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId]);

    const handleVote = async (itemId: string, hasVoted: boolean) => {
        if (hasVoted) {
            await supabase.from('feedback_upvotes').delete().match({ user_id: userId, feedback_id: itemId });
        } else {
            await supabase.from('feedback_upvotes').insert({ user_id: userId, feedback_id: itemId });
        }
        // Optimistic update
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
            user_id: userId,
            content: newItemContent,
            type: newItemType,
            status: 'open',
            tags: [newItemType === 'bug' ? 'bug' : 'user-feedback'] // Simple auto-tag
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
            user_id: userId,
            content: newComment
        });

        if (!error) {
            setNewComment('');
            fetchComments(itemId);
        }
    };

    const filteredItems = items.filter(item => filter === 'all' || item.type === filter);

    return (
        <div className="h-full flex flex-col bg-dark-950 text-gray-100 p-4 relative">
            <div className="flex justify-end items-center mb-6">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> New Feedback
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(['all', 'bug', 'suggestion', 'feedback', 'complaint'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize whitespace-nowrap ${filter === f
                            ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                            : 'bg-dark-900 border-dark-800 text-gray-400 hover:border-brand-500/50'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading feedback...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-dark-900/50 rounded-xl border border-dashed border-dark-800">
                        <MessageSquare className="mx-auto mb-3 opacity-20" size={48} />
                        <p className="text-gray-400">No feedback found. Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="bg-dark-900/50 border border-dark-800 rounded-2xl p-5 transition-all hover:border-brand-500/30 hover:bg-dark-900 group shadow-lg">
                            <div className="flex gap-4">
                                {/* Vote Column */}
                                <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                    <button
                                        onClick={() => handleVote(item.id, item.user_has_voted || false)}
                                        className={`p-2 rounded-lg transition-colors ${item.user_has_voted
                                            ? 'bg-brand-500/20 text-brand-400'
                                            : 'bg-dark-950 text-gray-500 hover:bg-dark-800 hover:text-gray-300'
                                            }`}
                                    >
                                        <ChevronUp size={20} className={item.user_has_voted ? 'fill-current' : ''} />
                                    </button>
                                    <span className={`font-bold ${item.user_has_voted ? 'text-brand-400' : 'text-gray-400'}`}>
                                        {item.vote_count}
                                    </span>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${item.type === 'bug' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                            item.type === 'suggestion' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                                'bg-gray-800 border-gray-700 text-gray-400'
                                            }`}>
                                            {item.type}
                                        </span>
                                        <span className="text-xs text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-200 leading-relaxed mb-3">{item.content}</p>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleExpand(item.id)}
                                            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors"
                                        >
                                            <MessageCircle size={14} />
                                            {comments[item.id]?.length || 0} Comments
                                        </button>
                                    </div>

                                    {/* Expanded Comments Section */}
                                    {expandedItem === item.id && (
                                        <div className="mt-4 pt-4 border-t border-dark-800 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                                {comments[item.id]?.map(comment => (
                                                    <div key={comment.id} className="bg-dark-950 p-3 rounded-lg text-sm">
                                                        <p className="text-gray-300">{comment.content}</p>
                                                        <span className="text-[10px] text-gray-600 mt-1 block">
                                                            {new Date(comment.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))}
                                                {comments[item.id]?.length === 0 && (
                                                    <p className="text-gray-600 text-sm italic">No comments yet.</p>
                                                )}
                                            </div>
                                            <form onSubmit={(e) => handleCommentSubmit(e, item.id)} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Add a comment..."
                                                    className="flex-1 bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                                                />
                                                <button type="submit" disabled={!newComment.trim()} className="bg-dark-800 hover:bg-dark-700 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                                                    Post
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                        <div className="p-4 border-b border-dark-800 flex justify-between items-center">
                            <h3 className="font-bold text-white">Submit Feedback</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['suggestion', 'bug', 'feedback', 'complaint'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewItemType(t)}
                                            className={`p-2 rounded-lg text-sm font-medium border capitalize ${newItemType === t
                                                ? 'bg-brand-600 border-brand-500 text-white'
                                                : 'bg-dark-950 border-dark-800 text-gray-400 hover:bg-dark-800'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Details</label>
                                <textarea
                                    value={newItemContent}
                                    onChange={(e) => setNewItemContent(e.target.value)}
                                    placeholder={newItemType === 'bug' ? "Describe the bug and steps to reproduce..." : "Share your idea..."}
                                    className="w-full h-32 bg-dark-950 border border-dark-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg transition-colors">
                                Submit Feedback
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
