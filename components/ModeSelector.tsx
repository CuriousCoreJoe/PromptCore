import React from 'react';
import { AppMode } from '../types';
import { MessageSquare, Code2, Image as ImageIcon, FileText, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ModeSelectorProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  userProfile?: any;
  isDev?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSelectMode, userProfile, isDev = false }) => {
  const { settings } = useTheme();

  const modeConfig = [
    {
      id: AppMode.EVERYDAY,
      icon: <MessageSquare size={16} />,
      label: 'Everyday',
      locked: false
    },
    {
      id: AppMode.VIBE_CODE,
      icon: <Code2 size={16} />,
      label: 'Vibe Code',
      locked: false
    },
    {
      id: AppMode.MEDIA_GEN,
      icon: <ImageIcon size={16} />,
      label: 'Media Gen',
      locked: false
    },
    {
      id: AppMode.TALK_TO_SOURCE,
      icon: <FileText size={16} />,
      label: 'Talk to Source',
      locked: false
    },
  ];

  return (
    <div className="backdrop-blur-sm p-1 rounded-xl border inline-flex flex-wrap md:flex-nowrap gap-1 w-full md:w-auto" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
      {modeConfig.map((mode) => {
        const isActive = currentMode === mode.id;
        const activeColor = settings.modeColors[mode.id];

        // We can't use arbitrary hex values in Tailwind classes for hover/active states easily without style prop
        // So we'll use style prop for the active state background

        return (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            style={isActive ? {
              backgroundColor: activeColor,
              color: 'var(--text-btn-active)',
              boxShadow: `0 10px 15px -3px ${activeColor}33` // 20% opacity shadow
            } : {}}
            className={`relative flex-1 md:flex-none flex items-center justify-center px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
              ? '' // styles handled inline for dynamic colors
              : 'text-gray-500 hover:text-brand-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-dark-800'
              }`}
          >
            <span className="mr-1.5 md:mr-2 opacity-90">{mode.icon}</span>
            <span className="hidden sm:inline">{mode.label}</span>
            <span className="sm:hidden">{mode.label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};