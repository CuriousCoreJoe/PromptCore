import React from 'react';
import { changelogData } from '../lib/changelogData';
import { X, Calendar, Tag } from 'lucide-react';

interface ChangelogModalProps {
    onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
                <div className="p-6 border-b border-dark-800 flex justify-between items-center bg-dark-950/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">What's New</h2>
                        <p className="text-gray-400 text-sm">Latest updates and improvements to PromptOrigin</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {changelogData.map((entry, index) => (
                        <div key={entry.version} className="relative pl-8 border-l border-dark-800 pb-8 last:pb-0 last:border-0">
                            {/* Timeline dot */}
                            <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-dark-700'}`} />

                            <div className="flex items-baseline justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${index === 0 ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-dark-800 text-gray-400'}`}>
                                        v{entry.version}
                                    </span>
                                    {index === 0 && <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Latest</span>}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Calendar size={12} />
                                    <span>{new Date(entry.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                            </div>

                            <ul className="space-y-3">
                                {entry.changes.map((change, i) => (
                                    <li key={i} className="flex items-start gap-3 text-gray-300 text-sm leading-relaxed">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-dark-700 flex-shrink-0" />
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-dark-800 bg-dark-950/30 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-medium transition-colors border border-dark-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
