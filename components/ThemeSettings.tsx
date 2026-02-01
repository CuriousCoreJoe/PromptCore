import React, { useState } from 'react';
import { useTheme, THEME_PACKS, FontSize } from '../context/ThemeContext';
import { X, RefreshCw, Image, Type, Palette, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ThemeSettingsProps {
    onClose: () => void;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onClose }) => {
    const { settings, updateSettings, resetSettings } = useTheme();
    const [bgUrl, setBgUrl] = useState(settings.backgroundImage || '');

    const handleSaveBg = () => {
        updateSettings({ backgroundImage: bgUrl });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className={cn(
                "border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] transition-colors",
                settings.isDarkMode ? "bg-dark-900 border-dark-700" : "bg-white border-gray-200"
            )}>
                <div className={cn(
                    "p-6 border-b flex justify-between items-center",
                    settings.isDarkMode ? "border-dark-800" : "border-gray-100"
                )}>
                    <h2 className={cn("text-xl font-bold flex items-center gap-2", settings.isDarkMode ? "text-white" : "text-gray-900")}>
                        <Palette className="text-brand-500" /> Customize Appearance
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => updateSettings({ isDarkMode: !settings.isDarkMode })}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                settings.isDarkMode ? "bg-dark-800 text-yellow-400 hover:text-yellow-300" : "bg-gray-100 text-indigo-600 hover:text-indigo-500"
                            )}
                        >
                            {settings.isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Palette Packs */}
                    <section>
                        <h3 className={cn("text-sm font-bold uppercase tracking-widest mb-4", settings.isDarkMode ? "text-gray-500" : "text-gray-400")}>
                            Theme Packs
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {THEME_PACKS.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => updateSettings({ themePackId: pack.id })}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all text-left space-y-2 group",
                                        settings.themePackId === pack.id
                                            ? (settings.isDarkMode ? "bg-dark-800 border-brand-500" : "bg-brand-50 border-brand-500")
                                            : (settings.isDarkMode ? "bg-dark-950/50 border-dark-800 hover:border-dark-700" : "bg-gray-50 border-gray-100 hover:border-gray-200")
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
                                        "text-[10px] font-bold truncate uppercase",
                                        settings.themePackId === pack.id ? "text-brand-500" : "text-gray-500"
                                    )}>
                                        {pack.name}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Typography */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-sm font-bold uppercase tracking-widest", settings.isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                Typography & Scale
                            </h3>
                            <span className="text-[10px] font-mono font-bold bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded uppercase">
                                {settings.fontSize}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div className="relative h-2 bg-dark-950 rounded-full border border-dark-800 flex items-center justify-between px-2">
                                {(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as FontSize[]).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => updateSettings({ fontSize: size })}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center relative group",
                                            settings.fontSize === size
                                                ? "bg-brand-500 border-white scale-110 shadow-lg shadow-brand-500/20"
                                                : "bg-dark-800 border-dark-700 hover:border-dark-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute -bottom-6 text-[10px] font-bold uppercase transition-colors",
                                            settings.fontSize === size ? "text-brand-500" : "text-gray-600 opacity-0 group-hover:opacity-100"
                                        )}>
                                            {size}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="h-2" />

                            <select
                                value={settings.fontFamily}
                                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                                className={cn(
                                    "w-full border rounded-lg p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/20",
                                    settings.isDarkMode ? "bg-dark-950 border-dark-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                                )}
                            >
                                <option value="Inter, sans-serif">Inter (Default)</option>
                                <option value="'Roboto', sans-serif">Roboto</option>
                                <option value="'Open Sans', sans-serif">Open Sans</option>
                                <option value="'Courier New', monospace">Monospace</option>
                            </select>
                        </div>
                    </section>

                    {/* Background */}
                    <section>
                        <h3 className={cn("text-sm font-bold uppercase tracking-widest mb-4", settings.isDarkMode ? "text-gray-500" : "text-gray-400")}>
                            Background Image
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={bgUrl}
                                onChange={(e) => setBgUrl(e.target.value)}
                                placeholder="https://example.com/wallpaper.jpg"
                                className={cn(
                                    "flex-1 border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/20",
                                    settings.isDarkMode ? "bg-dark-950 border-dark-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                                )}
                            />
                            <button
                                onClick={handleSaveBg}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold shadow-lg shadow-brand-500/20 transition-all text-sm"
                            >
                                Set
                            </button>
                        </div>
                    </section>
                </div>

                <div className={cn(
                    "p-6 border-t flex justify-between rounded-b-2xl",
                    settings.isDarkMode ? "border-dark-800 bg-dark-950/50" : "border-gray-100 bg-gray-50/50"
                )}>
                    <button
                        onClick={resetSettings}
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-tighter"
                    >
                        <RefreshCw size={14} /> Reset Defaults
                    </button>

                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
