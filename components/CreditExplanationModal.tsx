import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, MessageSquare, Image, Code, Coins, HelpCircle } from 'lucide-react';

interface CreditExplanationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
}

export const CreditExplanationModal: React.FC<CreditExplanationModalProps> = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-white/5 border-b border-white/10 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500/20 rounded-full flex items-center justify-center">
                            <Coins size={20} className="text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">How Credits Work</h2>
                            <p className="text-xs text-gray-400">Understanding your usage</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Credits are the currency of Prompt Origin. Every time you generate content, execute code, or create images, credits are deducted from your balance.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <RateCard icon={<MessageSquare size={16} />} label="Chat & Text" cost="1 Credit" />
                            <RateCard icon={<Code size={16} />} label="Code Execution" cost="2 Credits" />
                            <RateCard icon={<Image size={16} />} label="Image Gen" cost="5 Credits" />
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500" />
                            Running Low?
                        </h3>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-gray-500 mt-1.5" />
                                <span><strong>Upgrade Plan:</strong> Get a monthly allowance of credits.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-gray-500 mt-1.5" />
                                <span><strong>Top-Up Packs:</strong> Buy credits that never expire.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-gray-500 mt-1.5" />
                                <span><strong>Earn Credits:</strong> Provide feedback or join the waitlist.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onUpgrade}
                            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-900/20"
                        >
                            Get More Credits
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RateCard: React.FC<{ icon: React.ReactNode, label: string, cost: string }> = ({ icon, label, cost }) => (
    <div className="bg-black/20 border border-white/5 rounded-lg p-3 flex flex-col items-center text-center gap-2">
        <div className="text-gray-400">{icon}</div>
        <div className="text-xs font-medium text-gray-300">{label}</div>
        <div className="text-xs font-bold text-brand-400">{cost}</div>
    </div>
);
