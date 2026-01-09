import React from 'react';
import { AppMode } from '../types';
import { MessageSquare, Code2, Image as ImageIcon, FileText, Lock } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  userProfile?: any;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSelectMode, userProfile }) => {
  const subscriptionStatus = userProfile?.subscription_status || 'free';
  const isFree = subscriptionStatus === 'free';

  // Define which modes are locked for free users
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
      locked: isFree, // Locked for free users
      lockReason: 'Creator+ Required'
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
      locked: isFree, // Locked for free users
      lockReason: 'Creator+ Required'
    },
  ];

  return (
    <div className="bg-dark-900/50 backdrop-blur-sm p-1 rounded-xl border border-dark-800 inline-flex flex-wrap md:flex-nowrap gap-1 w-full md:w-auto">
      {modeConfig.map((mode) => {
        const isActive = currentMode === mode.id;
        const isLocked = mode.locked && !isActive;

        return (
          <button
            key={mode.id}
            onClick={() => !isLocked && onSelectMode(mode.id)}
            disabled={isLocked}
            className={`relative flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? {
                    [AppMode.EVERYDAY]: 'bg-blue-600 text-white shadow-lg shadow-blue-900/20',
                    [AppMode.VIBE_CODE]: 'bg-purple-600 text-white shadow-lg shadow-purple-900/20',
                    [AppMode.MEDIA_GEN]: 'bg-pink-600 text-white shadow-lg shadow-pink-900/20',
                    [AppMode.TALK_TO_SOURCE]: 'bg-orange-600 text-white shadow-lg shadow-orange-900/20',
                  }[mode.id]
                : isLocked
                ? 'text-gray-600 bg-dark-850 cursor-not-allowed opacity-60'
                : 'text-gray-400 hover:text-white hover:bg-dark-800'
            }`}
            title={isLocked ? mode.lockReason : undefined}
          >
            <span className="mr-2 opacity-90">{mode.icon}</span>
            <span>{mode.label}</span>
            {isLocked && (
              <Lock size={12} className="ml-1.5 opacity-70" />
            )}
          </button>
        );
      })}
    </div>
  );
};