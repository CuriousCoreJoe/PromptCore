import React from 'react';
import {
    Zap,
    Keyboard,
    Shield,
    ChevronLeft,
    Monitor,
    Cpu,
    Sparkles,
    Command,
    Brain,
    Layers
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AIModel } from '../types';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SettingsPageProps {
    wizardMode: 'iterative' | 'batch';
    onToggleWizardMode: () => void;
    defaultModel: AIModel;
    onModelChange: (model: AIModel) => void;
    defaultExpandBatches: boolean;
    onToggleDefaultExpandBatches: () => void;
    isDev?: boolean;
    onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    wizardMode,
    onToggleWizardMode,
    defaultModel,
    onModelChange,
    defaultExpandBatches,
    onToggleDefaultExpandBatches,
    isDev = false,
    onBack
}) => {
    const modelDisplayNames: Record<AIModel, string> = {
        'gpt-5': 'ChatGPT 5',
        'google/gemini-3-pro-preview': 'Gemini 3 Pro',
        'claude-sonnet-4.5': 'Claude Sonnet 4.5',
        'gemini-3-flash': 'Gemini 3 Flash'
    };
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

                    {/* Factory Settings */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={14} className="text-brand-500" /> Factory Settings
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
                            <div className="p-6 flex items-center justify-between transition-colors hover:bg-dark-900/50">
                                <div className="space-y-1 pr-8">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-brand-400" />
                                        <p className="font-semibold text-gray-100">Default Expand Batches</p>
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed max-w-lg">
                                        Automatically expand all batch groups in the history view for quick access.
                                    </p>
                                </div>

                                <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800 self-start mt-2 md:mt-0">
                                    <button
                                        onClick={() => !defaultExpandBatches && onToggleDefaultExpandBatches()}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tighter",
                                            defaultExpandBatches
                                                ? "bg-brand-600 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        On
                                    </button>
                                    <button
                                        onClick={() => defaultExpandBatches && onToggleDefaultExpandBatches()}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tighter",
                                            !defaultExpandBatches
                                                ? "bg-dark-700 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Off
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

                    {/* AI Model Selection */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Brain size={14} className="text-purple-500" /> Default AI Model
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
                            <div className="p-6 flex items-center justify-between transition-colors hover:bg-dark-900/50">
                                <div className="space-y-1 pr-8">
                                    <div className="flex items-center gap-2">
                                        <Monitor size={16} className="text-purple-400" />
                                        <p className="font-semibold text-gray-100">Primary Language Model</p>
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed max-w-lg">
                                        Select your default AI model for prompt generation. Each model has unique strengths.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 bg-dark-950 p-1 rounded-xl border border-dark-800 self-start mt-2 md:mt-0">
                                    <button
                                        onClick={() => onModelChange('gpt-5')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-tight whitespace-nowrap",
                                            defaultModel === 'gpt-5'
                                                ? "bg-green-600 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        ChatGPT 5
                                    </button>
                                    <button
                                        onClick={() => onModelChange('google/gemini-3-pro-preview')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-tight whitespace-nowrap",
                                            defaultModel === 'google/gemini-3-pro-preview'
                                                ? "bg-blue-600 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Gemini 3 Pro
                                    </button>
                                    <button
                                        onClick={() => onModelChange('claude-sonnet-4.5')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-tight whitespace-nowrap",
                                            defaultModel === 'claude-sonnet-4.5'
                                                ? "bg-purple-600 text-white shadow-lg"
                                                : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Sonnet 4.5
                                    </button>
                                    {isDev && (
                                        <button
                                            onClick={() => onModelChange('gemini-3-flash')}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-tight whitespace-nowrap",
                                                defaultModel === 'gemini-3-flash'
                                                    ? "bg-amber-600 text-white shadow-lg"
                                                    : "text-gray-500 hover:text-gray-300"
                                            )}
                                        >
                                            🔧 Gemini Flash
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};
