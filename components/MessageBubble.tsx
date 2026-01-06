import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AppMode } from '../types';
import { Sparkles, User, Copy, Check, ThumbsUp, ThumbsDown, Pencil, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { MessageActionBar } from './MessageActionBar';

interface MessageBubbleProps {
  message: Message;
  onOptionSelect?: (option: string) => void;
  onRunPrompt?: (messageId: string, content: string) => void;
  onShorten?: (messageId: string) => void;
  onElaborate?: (messageId: string) => void;
  onFormalize?: (messageId: string) => void;
  onCopyResult?: (content: string) => void;
  onSaveResult?: (content: string) => void;
  onRetry?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onRate?: (messageId: string, isPositive: boolean) => void;
  onEdit?: (messageId: string) => void;
  isRunning?: boolean;
}

const ActionButton: React.FC<{ icon: React.ReactNode, title: string, onClick?: () => void }> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-dark-800"
    title={title}
    type="button"
  >
    {icon}
  </button>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onOptionSelect,
  onRunPrompt,
  onShorten,
  onElaborate,
  onFormalize,
  onCopyResult,
  onSaveResult,
  onRetry,
  onRegenerate,
  onRate,
  onEdit,
  isRunning = false
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  // Parse Options - More flexible to handle whitespace and newlines
  const optionsRegex = /\[OPTIONS:\s*(.*?)\]\s*$/s;
  const match = message.content.match(optionsRegex);
  const options = match ? match[1].split(',').map(o => o.trim()).filter(o => o.length > 0) : [];
  const displayContent = message.content.replace(optionsRegex, '').trim();

  const isSystem = message.role === 'system';
  const isExecutionResult = message.msgType === 'execution_result';

  if (isSystem) return null; // Don't show system messages in UI

  const isFinalPrompt = !isUser && displayContent.includes('FINAL PROMPT:');

  const handleCopy = () => {
    let textToCopy = displayContent;

    // Smart Copy: If it's a final output, copy ONLY the code block content if present
    if (isFinalPrompt) {
      if (displayContent.includes('```')) {
        // Extract content between triple backticks
        const codeBlockMatch = displayContent.match(/```(?:[\w]*\n)?([\s\S]*?)```/);
        if (codeBlockMatch) {
          textToCopy = codeBlockMatch[1].trim();
        }
      } else {
        // Fallback: Copy content after "FINAL PROMPT:" (legacy support)
        textToCopy = displayContent.split('FINAL PROMPT:')[1]?.trim() || displayContent;
      }
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markdownComponents = React.useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const codeContent = String(children).replace(/\n$/, '');
      const [blockCopied, setBlockCopied] = React.useState(false);

      const handleBlockCopy = () => {
        navigator.clipboard.writeText(codeContent);
        setBlockCopied(true);
        setTimeout(() => setBlockCopied(false), 2000);
      };

      return inline ? (
        <code className="bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      ) : (
        <div className="my-4 rounded-xl overflow-hidden bg-[#1E1F20] border border-dark-800">
          <div className="flex items-center justify-between px-4 py-2 bg-[#2A2B2C]/50 border-b border-dark-800">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">code</span>
            <button
              onClick={handleBlockCopy}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white transition-colors bg-dark-800/80 px-3 py-1.5 rounded-lg border border-dark-700 hover:bg-dark-700 hover:scale-105 active:scale-95 shadow-lg"
            >
              {blockCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {blockCopied ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },
    ul: ({ children }: any) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
    p: ({ children }: any) => <div className="mb-4 last:mb-0 leading-7 text-gray-300">{children}</div>,
    h1: ({ children }: any) => <h1 className="text-2xl font-medium text-gray-100 mb-4 mt-6">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-medium text-gray-100 mb-3 mt-5">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-medium text-gray-100 mb-2 mt-4">{children}</h3>,
  }), []);

  return (
    <div className={`flex w-full mb-8 gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>


      {/* Content Column */}
      <div className={clsx(
        "flex flex-col max-w-4xl relative",
        isUser ? 'items-end' : 'items-start w-full'
      )}>
        {/* Floating COPY PROMPT Button */}
        {isFinalPrompt && (
          <button
            onClick={handleCopy}
            className="absolute -top-3 right-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95 z-10"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'COPIED' : 'COPY PROMPT'}
          </button>
        )}

        {isUser && (
          <div className="text-base text-gray-200 whitespace-pre-wrap">{message.content}</div>
        )}

        {!isUser && (
          <div className={clsx(
            "w-full text-base font-light font-sans tracking-wide p-4 rounded-2xl",
            isExecutionResult
              ? "bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-2 border-green-500/30 shadow-lg shadow-green-500/10"
              : ""
          )}>
            {isExecutionResult && (
              <div className="mb-3 flex items-center gap-2 pb-3 border-b border-green-500/20">
                <div className="px-2 py-1 bg-green-500/20 rounded-md">
                  <span className="text-xs font-bold text-green-400">EXECUTION RESULT</span>
                </div>
                <span className="text-xs text-gray-400">Claude 3.5 Sonnet</span>
              </div>
            )}
            <ReactMarkdown components={markdownComponents}>
              {displayContent}
            </ReactMarkdown>

            {/* Quick Reply Options */}
            {options.length > 0 && onOptionSelect && (
              <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in duration-500">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOptionSelect(opt)}
                    className="px-4 py-2 bg-dark-800 hover:bg-brand-600 hover:text-white text-brand-200 text-sm font-medium rounded-lg border border-dark-700 hover:border-brand-500 transition-all shadow-sm"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {/* Message Action Bar - Regenerate, Edit, Vote, Copy */}
            <MessageActionBar
              message={message}
              onRunPrompt={onRunPrompt}
              onCopy={onCopyResult}
              onRegenerate={onRegenerate}
              onRate={onRate}
              onEdit={onEdit}
              isRunning={isRunning}
              isFinalPrompt={isFinalPrompt}
            />
          </div>
        )}
      </div>
    </div>
  );
};
