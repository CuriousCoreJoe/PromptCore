import React from 'react';
import { Message } from '../types';
import { Play, Copy, RotateCcw, ThumbsUp, ThumbsDown, MoreVertical, Loader2 } from 'lucide-react';

interface MessageActionBarProps {
    message: Message;
    onRunPrompt?: (messageId: string, content: string) => void;
    onCopy?: (content: string) => void;
    onRegenerate?: (messageId: string) => void;
    onRate?: (messageId: string, isPositive: boolean) => void;
    onEdit?: (messageId: string) => void;
    isRunning?: boolean;
    isFinalPrompt?: boolean;
}

const IconButton: React.FC<{
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}> = ({ icon, onClick, disabled = false, title }) => (
    <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        title={title}
        className={`p-1.5 transition-colors ${disabled ? 'text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:text-gray-300'}`}
    >
        {icon}
    </button>
);

export const MessageActionBar: React.FC<MessageActionBarProps> = ({
    message,
    onRunPrompt,
    onCopy,
    onRegenerate,
    onRate,
    onEdit,
    isRunning = false,
    isFinalPrompt = false
}) => {
    const isExecutionResult = message.msgType === 'execution_result';

    // Don't show action bar for user messages
    if (message.role === 'user') return null;

    return (
        <div className="mt-4 flex flex-col gap-3">
            {/* Primary Action: Run This Prompt - ONLY show for final/master prompts */}
            {onRunPrompt && isFinalPrompt && !isExecutionResult && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onRunPrompt(message.id, message.content)}
                        disabled={isRunning}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isRunning
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105'
                            }`}
                    >
                        {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        <span>{isRunning ? "Running..." : "Run This Prompt"}</span>
                    </button>
                    <span className="text-xs text-gray-500 ml-2">
                        {isRunning ? "Please wait..." : "Execute with external LLM"}
                    </span>
                </div>
            )}

            {/* Standard Actions - Simple icon buttons like the reference image */}
            <div className="flex items-center gap-1">
                {onRate && (
                    <>
                        <IconButton
                            icon={<ThumbsUp size={18} />}
                            onClick={() => onRate(message.id, true)}
                            disabled={isRunning}
                            title="Good response"
                        />
                        <IconButton
                            icon={<ThumbsDown size={18} />}
                            onClick={() => onRate(message.id, false)}
                            disabled={isRunning}
                            title="Bad response"
                        />
                    </>
                )}
                {onRegenerate && (
                    <IconButton
                        icon={<RotateCcw size={18} />}
                        onClick={() => onRegenerate(message.id)}
                        disabled={isRunning}
                        title="Regenerate"
                    />
                )}
                {onCopy && (
                    <IconButton
                        icon={<Copy size={18} />}
                        onClick={() => onCopy(message.content)}
                        title="Copy"
                    />
                )}
                <IconButton
                    icon={<MoreVertical size={18} />}
                    onClick={() => { }}
                    title="More options"
                />
            </div>
        </div>
    );
};
