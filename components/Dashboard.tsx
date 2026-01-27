import React, { useState, useEffect } from 'react';
import { CreditCard, Package, FileText, Clock, TrendingUp, Shield, Trash2, ExternalLink, Plus, X, Upload, Youtube, FileType, File } from 'lucide-react';
import { UserProfile, Document, AppView } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { Helmet } from 'react-helmet-async';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}



// Mock Data for Display Purposes
const MOCK_USER: UserProfile = {
    id: 'u1',
    credits: 850,
    subscriptionTier: 'free',
    wizardMode: 'iterative',
    defaultModel: 'google/gemini-3-pro-preview',
    monthly_usage: 0,
    last_usage_reset: new Date().toISOString(),
    createdAt: Date.now()
};

interface DashboardProps {
    credits: number;
    isDev: boolean;
    onNavigate: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ credits, isDev, onNavigate }) => {
    const [recentPacks, setRecentPacks] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [showAddSource, setShowAddSource] = useState(false);
    const [newSourceType, setNewSourceType] = useState<'paste' | 'pdf' | 'txt'>('paste');
    const [newSourceContent, setNewSourceContent] = useState('');
    const [newSourceTitle, setNewSourceTitle] = useState('');
    const [isBusinessContext, setIsBusinessContext] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [statMode, setStatMode] = useState<'generations' | 'credits'>('generations');

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (profile) setUserProfile(profile);

            // Fetch Packs
            const { data: packs } = await supabase
                .from('packs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3);
            if (packs) setRecentPacks(packs);

            // Fetch Documents
            const { data: docs } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (docs) setDocuments(docs);
        };
        fetchData();
    }, []);

    const getPlanName = (tier: UserProfile['subscriptionTier']) => {
        switch (tier) {
            case 'pro': return 'Creator Pro';
            default: return 'Starter';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Security Check: File Type
        const allowedTypes = ['text/plain', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert("Invalid file type. Only .txt and .pdf files are allowed.");
            return;
        }

        // Security Check: File Size (e.g., 5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB.");
            return;
        }

        // For now, we'll just read text files directly. PDF parsing would require a backend function or library.
        if (file.type === 'text/plain') {
            const text = await file.text();
            setNewSourceContent(text);
            setNewSourceTitle(file.name);
            setNewSourceType('txt');
        } else {
            alert("PDF upload is currently a placeholder. Please copy/paste text for now.");
            // In a real implementation, you'd upload to storage and trigger a parsing function
        }
    };

    const handleAddSource = async () => {
        if (!userProfile) return;
        if (!newSourceTitle.trim()) {
            alert("Please enter a title");
            return;
        }

        // Check Limits
        const isFree = userProfile.subscription_status === 'free';
        const isLite = userProfile.subscription_status === 'lite';
        const isPro = userProfile.subscription_status === 'pro';

        const hasBoughtCredits = credits >= 1500;

        let limit = 0;
        if (isFree) limit = hasBoughtCredits ? 5 : 0;
        if (isLite) limit = 5;
        if (isPro) limit = 15;

        // Business Context is +1 extra slot
        const businessContextDocs = documents.filter(d => d.is_business_context);
        const regularDocs = documents.filter(d => !d.is_business_context);

        if (isBusinessContext) {
            if (businessContextDocs.length >= 1) {
                alert("You already have a Business Context document. Please delete it first to add a new one.");
                return;
            }
        } else {
            if (regularDocs.length >= limit && !isDev) {
                alert(`You have reached your document limit (${limit}). Upgrade your plan to add more.`);
                return;
            }
        }

        setIsUploading(true);
        try {
            // Sanitize content (basic check)
            if (newSourceContent.includes('<script>') || newSourceContent.includes('javascript:')) {
                throw new Error("Invalid content detected.");
            }

            const { error } = await supabase.from('documents').insert({
                user_id: userProfile.id,
                title: newSourceTitle,
                source_type: newSourceType,
                content: newSourceContent,
                is_business_context: isBusinessContext
            });

            if (error) throw error;

            // Refresh
            const { data: docs } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', userProfile.id)
                .order('created_at', { ascending: false });
            if (docs) setDocuments(docs);

            setShowAddSource(false);
            setNewSourceTitle('');
            setNewSourceContent('');
            setIsBusinessContext(false);
        } catch (err: any) {
            alert(`Error adding source: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSource = async (id: string) => {
        if (!confirm("Are you sure you want to delete this source?")) return;
        try {
            await supabase.from('documents').delete().eq('id', id);
            setDocuments(prev => prev.filter(d => d.id !== id));

            // Update profile count
            const currentTotal = userProfile?.total_pdfs_uploaded || 0;
            await supabase.from('profiles').update({
                total_pdfs_uploaded: Math.max(0, currentTotal - 1)
            }).eq('id', userProfile.id);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto relative">
            <Helmet>
                <title>Dashboard | Prompt Origin</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Manage your credits, generated assets, and knowledge sources.</p>
            </div>


            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    icon={<CreditCard className="text-brand-500" />}
                    label="Credits Available"
                    value={isDev ? 'Unlimited' : credits}
                    subtext={isDev ? 'Developer Account' : 'Top up to generate more'}
                />
                <StatCard
                    icon={<Shield className="text-purple-500" />}
                    label="Current Plan"
                    value={isDev ? 'Developer' : getPlanName(MOCK_USER.subscriptionTier)}
                    subtext={isDev ? 'Full Access' : 'Upgrade for more power'}
                />
                <div
                    className="bg-dark-900 border border-dark-800 p-6 rounded-xl shadow-lg flex items-center gap-4 cursor-pointer hover:border-brand-500/30 transition-colors group"
                    onClick={() => setStatMode(prev => prev === 'generations' ? 'credits' : 'generations')}
                >
                    <div className="w-12 h-12 bg-dark-950 rounded-full flex items-center justify-center border border-dark-800 shadow-sm">
                        <TrendingUp className="text-green-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium group-hover:text-brand-400 transition-colors">
                            {statMode === 'generations' ? 'Total Generations' : 'Total Credits Spent'}
                        </p>
                        <p className="text-2xl font-bold text-white">
                            {statMode === 'generations'
                                ? (userProfile?.lifetime_prompts || 0)
                                : (userProfile?.monthly_usage || 0) // Using monthly usage as proxy for now, ideally lifetime_usage
                            }
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Click to switch view</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PDF Library (Talk to Source Mode Only) */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                    <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-950/50">
                        <div className="flex flex-col">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <FileText size={18} className="text-orange-400" />
                                PDF Library (Talk to Source)
                            </h2>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                                {documents.filter(d => d.source_type === 'pdf' && !d.is_business_context).length} / {
                                    (userProfile?.subscription_status === 'pro' ? 100 :
                                        userProfile?.subscription_status === 'lite' ? 30 : 10)
                                } PDFs Used
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setIsBusinessContext(false);
                                setShowAddSource(true);
                                setNewSourceType('pdf');
                            }}
                            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-gray-300 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                        >
                            <Plus size={14} /> Upload
                        </button>
                    </div>
                    <div className="p-4">
                        {documents.filter(d => d.source_type === 'pdf' && !d.is_business_context).length === 0 ? (
                            <div className="text-center text-gray-500 py-12 bg-dark-950/30 rounded-lg border border-dashed border-dark-800">
                                <FileText size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Your Talk to Source library is empty.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documents.filter(d => d.source_type === 'pdf' && !d.is_business_context).map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-dark-950 border border-dark-800 rounded-xl group transition-all hover:border-orange-500/30">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-orange-900/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                                                <FileText size={14} />
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="font-medium text-gray-200 text-sm truncate">{doc.title}</span>
                                                <span className="text-[10px] text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSource(doc.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Knowledge Base (Global Platform Enrichment) */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                    <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-950/50">
                        <div className="flex flex-col">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <Shield size={18} className="text-brand-400" />
                                Knowledge Base
                            </h2>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Enriches Prompt Origin Context</span>
                        </div>
                        <button
                            onClick={() => {
                                setIsBusinessContext(true);
                                setShowAddSource(true);
                            }}
                            className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-400 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                        >
                            <Plus size={14} /> Add Context
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[400px]">
                        {documents.filter(d => d.is_business_context).length === 0 ? (
                            <div className="text-center text-gray-500 py-12 bg-dark-950/30 rounded-lg border border-dashed border-dark-800">
                                <Shield size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No business context added yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documents.filter(d => d.is_business_context).map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-dark-950 border border-brand-500/30 rounded-xl group transition-all">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                                                <Shield size={14} />
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="font-medium text-gray-200 text-sm truncate">{doc.title}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Business Context</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSource(doc.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddSource && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-900 border border-dark-800 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-dark-800 flex justify-between items-center">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                {isBusinessContext ? <Shield size={18} className="text-brand-500" /> : <Plus size={18} />}
                                {isBusinessContext ? 'Add Business Context' : 'Add Knowledge Source'}
                            </h3>
                            <button onClick={() => setShowAddSource(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newSourceTitle}
                                    onChange={e => setNewSourceTitle(e.target.value)}
                                    className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="e.g. Q3 Financial Report"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Source Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewSourceType('paste')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newSourceType === 'paste' ? 'bg-brand-600 border-brand-500 text-white' : 'bg-dark-950 border-dark-700 text-gray-400 hover:bg-dark-800'}`}
                                    >
                                        Paste Text
                                    </button>
                                    <button
                                        onClick={() => setNewSourceType('txt')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newSourceType === 'txt' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-dark-950 border-dark-700 text-gray-400 hover:bg-dark-800'}`}
                                    >
                                        Upload File
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    {newSourceType === 'txt' ? 'Upload File (.txt, .pdf)' : 'Content'}
                                </label>
                                {newSourceType === 'txt' ? (
                                    <div className="border-2 border-dashed border-dark-700 rounded-lg p-8 text-center hover:border-brand-500 transition-colors relative">
                                        <input
                                            type="file"
                                            accept=".txt,.pdf"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Upload className="mx-auto text-gray-500 mb-2" />
                                        <p className="text-sm text-gray-400">Click or drag to upload</p>
                                        <p className="text-xs text-gray-600 mt-1">Max 5MB. .txt or .pdf</p>
                                        {newSourceTitle && <p className="text-brand-400 text-sm mt-2 font-medium">{newSourceTitle}</p>}
                                    </div>
                                ) : (
                                    <textarea
                                        value={newSourceContent}
                                        onChange={e => setNewSourceContent(e.target.value)}
                                        className="w-full h-32 bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                        placeholder="Paste your text content here..."
                                    />
                                )}
                            </div>

                            <button
                                onClick={handleAddSource}
                                disabled={isUploading}
                                className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {isUploading ? 'Adding...' : 'Add Source'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, subtext: string }> = ({ icon, label, value, subtext }) => (
    <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
        <div className="w-12 h-12 bg-dark-950 rounded-full flex items-center justify-center border border-dark-800 shadow-sm">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400 font-medium">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{subtext}</p>
        </div>
    </div>
);
