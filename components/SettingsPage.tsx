import React from 'react';
import {
    Zap,
    Keyboard,
    Shield,
    ChevronLeft,
    Monitor,
    Cpu,
    Sparkles,
    Command
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SettingsPageProps {
    wizardMode: 'iterative' | 'batch';
    onToggleWizardMode: () => void;
    onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    wizardMode,
    onToggleWizardMode,
    onBack
}) => {
    return (
        <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Settings</h1>
                            <p className="text-sm text-gray-500">Configure your personal and power-user preferences.</p>
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-12">

                    {/* AI Experience */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Cpu size={14} className="text-brand-500" /> AI Experience
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
                            <div className="p-6 flex items-center justify-between transition-colors hover:bg-dark-900/50">
                                <div className="space-y-1 pr-8">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-brand-400" />
                                        <p className="font-semibold text-gray-100 italic">Advanced Prompt Wizard Flow</p>
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed max-w-lg">
                                        {wizardMode === 'iterative'
                                            ? "The AI will ask exactly one question at a time. Perfect for staying focused and building better prompts through iteration."
                                            : "The AI will analyze your goal and ask 2-4 clarifying questions at once. Optimized for maximum speed."}
                                    </p>
                                </div>

                                <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800 self-start mt-2 md:mt-0">
                                    <button
                                        onClick={() => wizardMode !== 'iterative' && onToggleWizardMode()}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tighter",
                                            wizardMode === 'iterative'
                                                ? "bg-brand-600 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Iterative
                                    </button>
                                    <button
                                        onClick={() => wizardMode !== 'batch' && onToggleWizardMode()}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tighter",
                                            wizardMode === 'batch'
                                                ? "bg-orange-600 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Batch
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Power User Settings */}
                    <section className="space-y-4 opacity-75 grayscale pointer-events-none">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-orange-500" /> Power User (Coming Soon)
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
                            <div className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Keyboard size={16} className="text-gray-400" />
                                        <p className="font-semibold text-gray-100">Keyboard Shortcuts</p>
                                    </div>
                                    <p className="text-sm text-gray-500">Quickly toggle modes and send messages with customizable keys.</p>
                                </div>
                                <div className="w-10 h-6 bg-dark-800 rounded-full"></div>
                            </div>

                            <div className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Command size={16} className="text-gray-400" />
                                        <p className="font-semibold text-gray-100">Command Palette</p>
                                    </div>
                                    <p className="text-sm text-gray-500">Use CMD+K to search history and jump between workspaces instantly.</p>
                                </div>
                                <div className="w-10 h-6 bg-dark-800 rounded-full"></div>
                            </div>
                        </div>
                    </section>

                    {/* Interface */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Monitor size={14} className="text-blue-500" /> System
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-300 italic font-light tracking-wide">
                                    "You are currently using the flagship Gemini 2.5 Pro architecture."
                                </p>
                                <span className="text-[10px] font-bold bg-dark-800 text-gray-400 px-2 py-0.5 rounded uppercase tracking-widest">
                                    Proprietary
                                </span>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};
