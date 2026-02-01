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
    Layers,
    Palette,
    Type
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AIModel } from '../types';
import { useTheme, THEME_PACKS, FontSize } from '../context/ThemeContext';

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
    const { settings, updateSettings } = useTheme();
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

                    {/* Appearance & Branding */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Palette size={14} className="text-pink-500" /> Appearance & Branding
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
                            {/* Color Palette Packs */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-semibold text-gray-100">Color Palette Packs</p>
                                        <p className="text-sm text-gray-400">Choose a theme pack to re-color your workspace and mode buttons.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800">
                                            <button
                                                onClick={() => updateSettings({ isDarkMode: true })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                    settings.isDarkMode ? "bg-dark-700 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                                )}
                                            >
                                                Dark
                                            </button>
                                            <button
                                                onClick={() => updateSettings({ isDarkMode: false })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                    !settings.isDarkMode ? "bg-brand-500 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                                )}
                                            >
                                                Light
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {THEME_PACKS.map((pack) => (
                                        <button
                                            key={pack.id}
                                            onClick={() => updateSettings({ themePackId: pack.id })}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all text-left space-y-2 group",
                                                settings.themePackId === pack.id
                                                    ? "bg-dark-800 border-brand-500 ring-1 ring-brand-500/50"
                                                    : "bg-dark-950/50 border-dark-800 hover:border-dark-700"
                                            )}
                                        >
                                            <div className="flex -space-x-1">
                                                {Object.values(pack.colors).map((color, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-3 h-3 rounded-full ring-2 ring-dark-900"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <p className={cn(
                                                "text-xs font-bold truncate",
                                                settings.themePackId === pack.id ? "text-brand-400" : "text-gray-500 group-hover:text-gray-400"
                                            )}>
                                                {pack.name}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Size Scaling */}
                            <div className="p-6 space-y-6">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Type size={16} className="text-gray-400" />
                                            <p className="font-semibold text-gray-100">Interface Scale (Font Size)</p>
                                        </div>
                                        <span className="text-xs font-mono text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded uppercase">
                                            {settings.fontSize}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400">Apply a global scale factor to the entire application UI.</p>
                                </div>

                                <div className="relative h-2 bg-dark-950 rounded-full border border-dark-800 flex items-center justify-between px-2">
                                    {['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateSettings({ fontSize: size as FontSize })}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center relative group",
                                                settings.fontSize === size
                                                    ? "bg-brand-500 border-white scale-110 shadow-lg shadow-brand-500/20"
                                                    : "bg-dark-800 border-dark-700 hover:border-dark-600"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute -bottom-6 text-[10px] font-bold uppercase transition-colors",
                                                settings.fontSize === size ? "text-brand-400" : "text-gray-600 opacity-0 group-hover:opacity-100"
                                            )}>
                                                {size}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="h-6" /> {/* Spacer for labels */}
                            </div>
                        </div>
                    </section>

                    {/* Power User Settings */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-orange-500" /> Power User
                        </h2>

                        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
                            <div className="p-6 flex items-center justify-between hover:bg-dark-900/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Keyboard size={16} className="text-gray-400" />
                                        <p className="font-semibold text-gray-100">Keyboard Shortcuts</p>
                                    </div>
                                    <p className="text-sm text-gray-500">Quickly toggle modes and send messages with customizable keys.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-dark-800 px-2 py-1 rounded text-gray-500 font-bold">LOCKED</span>
                                </div>
                            </div>

                            <div className="p-6 flex items-center justify-between hover:bg-dark-900/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Command size={16} className="text-gray-400" />
                                        <p className="font-semibold text-gray-100">Command Palette</p>
                                    </div>
                                    <p className="text-sm text-gray-500">Use CMD+K to search history and jump between workspaces instantly.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-1 rounded border border-brand-500/20 font-bold uppercase tracking-tighter">CMD + K</span>
                                </div>
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
