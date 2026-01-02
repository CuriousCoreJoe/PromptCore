import React from 'react';
import { CreditCard, Package, FileText, Clock, TrendingUp, Shield, Trash2, ExternalLink, Plus } from 'lucide-react';
import { UserProfile, Document, FactoryBatch } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Mock Data for Display Purposes
const MOCK_USER: UserProfile = {
    id: 'u1',
    credits: 850,
    subscriptionTier: 'free',
    wizardMode: 'iterative',
    createdAt: Date.now()
};

const MOCK_PACKS: Partial<FactoryBatch>[] = [
    { id: 'b1', topic: 'Keto Recipes', angle: 'Budget Friendly', items: Array(10).fill(''), status: 'completed' },
    { id: 'b2', topic: 'Python Interview', angle: 'Advanced Algorithms', items: Array(20).fill(''), status: 'completed' },
    { id: 'b3', topic: 'Email Subject Lines', angle: 'High Urgency', items: Array(50).fill(''), status: 'completed' },
];

const MOCK_DOCS: Document[] = [
    { id: 'd1', userId: 'u1', title: 'Q3 Financial Report.pdf', sourceType: 'pdf', content: '', createdAt: Date.now() - 1000000 },
    { id: 'd2', userId: 'u1', title: 'Alex Hormozi Strategy Video', sourceType: 'youtube', sourceUrl: 'https://youtube.com/watch?v=...', content: '', createdAt: Date.now() - 5000000 },
];

interface DashboardProps {
    credits: number;
    isDev: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ credits, isDev }) => {
    const getPlanName = (tier: UserProfile['subscriptionTier']) => {
        switch (tier) {
            case 'pro': return 'Creator Pro';
            case 'ultimate': return 'Ultimate';
            default: return 'Starter';
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto">
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
                <StatCard
                    icon={<TrendingUp className="text-green-500" />}
                    label="Total Generations"
                    value="1,240"
                    subtext="Lifetime output"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Asset Library */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                    <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-950/50">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Package size={18} className="text-brand-400" />
                            Asset Library (Packs)
                        </h2>
                        <button className="text-xs text-brand-400 hover:text-brand-300 font-medium">View All</button>
                    </div>
                    <div className="p-4 space-y-3">
                        {MOCK_PACKS.map(pack => (
                            <div key={pack.id} className="flex items-center justify-between p-3 bg-dark-950 border border-dark-800 rounded-lg group hover:border-brand-500/30 transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-200">{pack.topic}</span>
                                    <span className="text-xs text-gray-500">Focus: {pack.angle} • {pack.items?.length} items</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded" title="View Details"><ExternalLink size={14} /></button>
                                    <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-dark-800 rounded" title="Delete"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Knowledge Base */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                    <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-950/50">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <FileText size={18} className="text-orange-400" />
                            Knowledge Base (RAG)
                        </h2>
                        <button className="text-xs text-brand-400 hover:text-brand-300 font-medium">Manage</button>
                    </div>
                    <div className="p-4 space-y-3">
                        {MOCK_DOCS.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-dark-950 border border-dark-800 rounded-lg group hover:border-orange-500/30 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${doc.sourceType === 'youtube' ? 'bg-red-900/20 text-red-500' : 'bg-blue-900/20 text-blue-500'}`}>
                                        {doc.sourceType === 'youtube' ? 'YT' : 'PDF'}
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="font-medium text-gray-200 truncate">{doc.title}</span>
                                        <span className="text-xs text-gray-500">Added {new Date(doc.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-dark-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                            </div>
                        ))}
                        <button className="w-full py-2 border border-dashed border-dark-700 text-gray-500 rounded-lg text-sm hover:border-brand-500 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
                            <Plus size={14} /> Add New Source
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent History */}
            <div className="mt-8">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-gray-400" />
                    Recent Activity
                </h2>
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-dark-950 text-gray-500 font-medium border-b border-dark-800">
                            <tr>
                                <th className="px-6 py-3">Session Name</th>
                                <th className="px-6 py-3">Mode</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800">
                            <tr className="hover:bg-dark-800/50 transition-colors">
                                <td className="px-6 py-4 text-white">Project Titan Code Refactor</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-blue-900/20 text-blue-400 text-xs">Vibe Code</span></td>
                                <td className="px-6 py-4">2 hours ago</td>
                                <td className="px-6 py-4 text-right"><button className="text-brand-400 hover:underline">Resume</button></td>
                            </tr>
                            <tr className="hover:bg-dark-800/50 transition-colors">
                                <td className="px-6 py-4 text-white">Cyberpunk City Prompts</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-purple-900/20 text-purple-400 text-xs">Media Gen</span></td>
                                <td className="px-6 py-4">Yesterday</td>
                                <td className="px-6 py-4 text-right"><button className="text-brand-400 hover:underline">Resume</button></td>
                            </tr>
                            <tr className="hover:bg-dark-800/50 transition-colors">
                                <td className="px-6 py-4 text-white">General Inquiry</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300 text-xs">Everyday</span></td>
                                <td className="px-6 py-4">3 days ago</td>
                                <td className="px-6 py-4 text-right"><button className="text-brand-400 hover:underline">Resume</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
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