import React from 'react';
import { AppMode } from '../types';
import { MessageSquare, Code2, Image as ImageIcon, FileText } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSelectMode }) => {
  const modes = [
    { id: AppMode.EVERYDAY, icon: <MessageSquare size={16} />, label: 'Everyday' },
    { id: AppMode.VIBE_CODE, icon: <Code2 size={16} />, label: 'Vibe Code' },
    { id: AppMode.MEDIA_GEN, icon: <ImageIcon size={16} />, label: 'Media Gen' },
    { id: AppMode.TALK_TO_SOURCE, icon: <FileText size={16} />, label: 'Talk to Source' },
  ];

  return (
    <div className="bg-dark-900/50 backdrop-blur-sm p-1 rounded-xl border border-dark-800 inline-flex flex-wrap md:flex-nowrap gap-1 w-full md:w-auto">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelectMode(mode.id)}
          className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${currentMode === mode.id
              ? {
                [AppMode.EVERYDAY]: 'bg-blue-600 text-white shadow-lg shadow-blue-900/20',
                [AppMode.VIBE_CODE]: 'bg-purple-600 text-white shadow-lg shadow-purple-900/20',
                [AppMode.MEDIA_GEN]: 'bg-pink-600 text-white shadow-lg shadow-pink-900/20',
                [AppMode.TALK_TO_SOURCE]: 'bg-orange-600 text-white shadow-lg shadow-orange-900/20',
              }[mode.id]
              : 'text-gray-400 hover:text-white hover:bg-dark-800'
            }`}
        >
          <span className="mr-2 opacity-90">{mode.icon}</span>
          {mode.label}
        </button>
      ))}
    </div>
  );
};