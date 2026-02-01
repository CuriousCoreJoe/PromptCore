import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string; // Hex or generic name
}

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export interface ThemePack {
    id: string;
    name: string;
    colors: {
        'Everyday': string;
        'Vibe Code': string;
        'Media Gen': string;
        'Talk to Source': string;
    }
}

export const THEME_PACKS: ThemePack[] = [
    {
        id: 'default',
        name: 'Classic Prompt',
        colors: { 'Everyday': '#3b82f6', 'Vibe Code': '#8b5cf6', 'Media Gen': '#ec4899', 'Talk to Source': '#10b981' }
    },
    {
        id: 'cyberpunk',
        name: 'Neon Night',
        colors: { 'Everyday': '#00f2ff', 'Vibe Code': '#bc00ff', 'Media Gen': '#ff0055', 'Talk to Source': '#00ff41' }
    },
    {
        id: 'minimal',
        name: 'Monochrome',
        colors: { 'Everyday': '#4b5563', 'Vibe Code': '#1f2937', 'Media Gen': '#9ca3af', 'Talk to Source': '#374151' }
    },
    {
        id: 'ocean',
        name: 'Deep Sea',
        colors: { 'Everyday': '#0ea5e9', 'Vibe Code': '#6366f1', 'Media Gen': '#2dd4bf', 'Talk to Source': '#064e3b' }
    },
    {
        id: 'forest',
        name: 'Evergreen',
        colors: { 'Everyday': '#65a30d', 'Vibe Code': '#059669', 'Media Gen': '#fbbf24', 'Talk to Source': '#164e63' }
    },
    {
        id: 'sunset',
        name: 'Golden Hour',
        colors: { 'Everyday': '#f97316', 'Vibe Code': '#ef4444', 'Media Gen': '#fcd34d', 'Talk to Source': '#d97706' }
    },
    {
        id: 'midnight',
        name: 'Void',
        colors: { 'Everyday': '#1e293b', 'Vibe Code': '#334155', 'Media Gen': '#475569', 'Talk to Source': '#0f172a' }
    },
    {
        id: 'vibrant',
        name: 'Prism',
        colors: { 'Everyday': '#f43f5e', 'Vibe Code': '#8b5cf6', 'Media Gen': '#0ea5e9', 'Talk to Source': '#10b981' }
    }
];

export interface ThemeSettings {
    modeColors: {
        [key: string]: string; // Mode name -> Color hex
    };
    themePackId: string;
    fontFamily: string;
    fontSize: FontSize;
    backgroundImage: string | null;
    backgroundOverlay: number; // Opacity 0-1
    isDarkMode: boolean;
}

interface ThemeContextType {
    settings: ThemeSettings;
    updateSettings: (newSettings: Partial<ThemeSettings>) => void;
    resetSettings: () => void;
    applyTheme: () => void;
}

const defaultSettings: ThemeSettings = {
    modeColors: THEME_PACKS[0].colors,
    themePackId: 'default',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'base',
    backgroundImage: null,
    backgroundOverlay: 0.5,
    isDarkMode: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<ThemeSettings>(() => {
        const saved = localStorage.getItem('prompt_origin_theme');
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('prompt_origin_theme', JSON.stringify(settings));
        applyTheme();
    }, [settings]);

    const updateSettings = (newSettings: Partial<ThemeSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };

            // If themePackId changed, override modeColors
            if (newSettings.themePackId && newSettings.themePackId !== prev.themePackId) {
                const pack = THEME_PACKS.find(p => p.id === newSettings.themePackId);
                if (pack) {
                    updated.modeColors = pack.colors;
                }
            }

            return updated;
        });
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    const applyTheme = () => {
        const root = document.documentElement;

        // Apply Font Family
        root.style.setProperty('--font-custom', settings.fontFamily);

        // Apply Font Size Scaling (8 levels)
        const sizeMap: Record<FontSize, string> = {
            'xs': '12px',
            'sm': '14px',
            'base': '16px',
            'lg': '18px',
            'xl': '20px',
            '2xl': '24px',
            '3xl': '30px',
            '4xl': '36px'
        };
        root.style.setProperty('--font-size-base', sizeMap[settings.fontSize]);

        // Dark/Light Mode
        if (settings.isDarkMode) {
            root.classList.remove('light-mode');
            root.style.setProperty('--bg-app', '#0a0a0a');
            root.style.setProperty('--text-app', '#e5e5e5');
        } else {
            root.classList.add('light-mode');
            root.style.setProperty('--bg-app', '#ffffff');
            root.style.setProperty('--text-app', '#1a1a1a');
        }

        // Apply Background Image
        if (settings.backgroundImage) {
            document.body.style.backgroundImage = `url(${settings.backgroundImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        } else {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = settings.isDarkMode ? '#0a0a0a' : '#ffffff';
        }

        // Mode colors are applied dynamically by components reading the context
    };

    return (
        <ThemeContext.Provider value={{ settings, updateSettings, resetSettings, applyTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
