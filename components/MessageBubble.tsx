import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Sparkles, User, Copy, Check, ThumbsUp, ThumbsDown, Pencil, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface MessageBubbleProps {
  message: Message;
  onOptionSelect?: (option: string) => void;
}

const ActionButton: React.FC<{ icon: React.ReactNode, title: string, onClick?: () => void }> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-dark-800 rounded-md transition-all border border-transparent hover:border-dark-700"
    title={title}
  >
    {icon}
  </button>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOptionSelect }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  // Parse Options
  const optionsRegex = /\[OPTIONS: (.*?)\]$/;
  const match = message.content.match(optionsRegex);
  const options = match ? match[1].split(',').map(o => o.trim()) : [];
  const displayContent = message.content.replace(optionsRegex, '').trim();

  const isSystem = message.role === 'system';

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

      {/* Avatar Column */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-xs font-medium text-white">J</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="text-blue-400" />
          </div>
        )}
      </div>

      {/* Content Column */}
      <div className={clsx(
        "flex flex-col max-w-4xl relative",
        isUser ? 'items-end' : 'items-start w-full'
      )}>
        {/* Top Right "Copy Prompt" Button (Prominent) */}
        {isFinalPrompt && (
          <button
            onClick={handleCopy}
            className="absolute -top-3 -right-2 flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-xl z-20 hover:bg-brand-400 hover:scale-105 active:scale-95"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'COPIED' : 'COPY PROMPT'}
          </button>
        )}

        {isUser && (
          <div className="text-base text-gray-200 whitespace-pre-wrap">{message.content}</div>
        )}

        {!isUser && (
          <div className="w-full text-base font-light font-sans tracking-wide p-4 rounded-2xl">
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
            {/* Bottom Actions Area */}
            {!isUser && (
              <div className="mt-6 pt-4 border-t border-dark-800/50 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ActionButton icon={<ThumbsUp size={14} />} title="Good response" />
                  <ActionButton icon={<ThumbsDown size={14} />} title="Bad response" />
                  <ActionButton icon={<RotateCcw size={14} />} title="Regenerate" />
                  <ActionButton icon={<Pencil size={14} />} title="Edit" />
                </div>

                <button
                  onClick={handleCopy}
                  className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-dark-800"
                  title="Copy specialized prompt"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};