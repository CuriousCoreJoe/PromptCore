import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, actionLabel, onAction }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto hide after 5s
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div className="bg-brand-900 border border-brand-700 shadow-2xl rounded-lg p-4 max-w-sm flex items-start">
        <div className="flex-1">
          <p className="text-sm text-brand-50 font-medium">{message}</p>
          {actionLabel && onAction && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="mt-2 text-xs font-bold text-brand-400 hover:text-brand-300 uppercase tracking-wide"
            >
              {actionLabel}
            </button>
          )}
        </div>
        <button onClick={onClose} className="ml-4 text-brand-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};