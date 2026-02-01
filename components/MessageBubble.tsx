import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AppMode } from '../types';
import { Sparkles, User, Copy, Check, ThumbsUp, ThumbsDown, Pencil, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { MessageActionBar } from './MessageActionBar';

interface MessageBubbleProps {
  message: Message;
  onOptionSelect?: (option: string, messageId?: string) => void;
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
  onRecoverStuck?: (messageId: string) => void;
  isRunning?: boolean;
  onOpenArtifact?: (content: string, title?: string) => void;
}

const ActionButton: React.FC<{ icon: React.ReactNode, title: string, onClick?: () => void }> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    className="p-1.5 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-brand-500/10 text-gray-500 hover:text-brand-600 dark:hover:text-white"
    title={title}
    type="button"
  >
    {icon}
  </button>
);

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
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
  onRecoverStuck,
  isRunning = false,
  onOpenArtifact
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  // Parse Options - More flexible to handle whitespace and newlines
  const optionsRegex = /\[OPTIONS:\s*(.*?)\]\s*$/s;
  const match = message.content.match(optionsRegex);
  const options = match ? match[1].split(',').map(o => o.trim()).filter(o => o.length > 0) : [];

  // Extract embedded image data (custom block)
  // Use [\s\S] to match across newlines, and trim whitespace
  const imageDataRegex = /<!-- IMAGE_DATA_START -->\s*([\s\S]+?)\s*<!-- IMAGE_DATA_END -->/;
  const imageMatch = message.content.match(imageDataRegex);
  const embeddedImageData = imageMatch ? imageMatch[1].trim() : null;

  // Extract HTML content for Vibe Code Preview
  let artifactContent: string | null = null;
  const isVibeCodeResult = message.mode === 'Vibe Code' && message.msgType === 'execution_result';

  if (isVibeCodeResult) {
    // Try to find HTML code block
    const codeBlockMatch = message.content.match(/```html\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      artifactContent = codeBlockMatch[1];
    } else if (message.content.includes('<!DOCTYPE html>')) {
      // Fallback if no code block but standard HTML structure found
      const htmlStart = message.content.indexOf('<!DOCTYPE html>');
      artifactContent = message.content.substring(htmlStart);
      // Cleanup trailing markdown if present
      if (artifactContent.endsWith('```')) {
        artifactContent = artifactContent.substring(0, artifactContent.lastIndexOf('```'));
      }
    }
  }

  const hasOpenedRef = React.useRef(false);

  // Auto-open effect for Vibe Code artifacts
  React.useEffect(() => {
    const isProcessingOrFailed = message.status === 'processing' || message.status === 'failed';
    if (!isProcessingOrFailed && onOpenArtifact && artifactContent && isVibeCodeResult && !hasOpenedRef.current) {
      onOpenArtifact(artifactContent, "Generated App");
      hasOpenedRef.current = true;
    }
  }, [artifactContent, isVibeCodeResult, onOpenArtifact, message.status]);

  // Remove both options and image data markers from display content
  const displayContent = message.content
    .replace(optionsRegex, '')
    .replace(imageDataRegex, '')
    .trim();

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
        <code className="bg-black/5 dark:bg-gray-800 text-brand-600 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      ) : (
        <div className="my-4 rounded-xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-sidebar)' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">code</span>
            <button
              onClick={handleBlockCopy}
              className="flex items-center gap-1.5 text-xs font-bold transition-colors px-3 py-1.5 rounded-lg border hover:scale-105 active:scale-95 shadow-lg"
              style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-sidebar)', color: 'var(--text-sidebar)' }}
            >
              {blockCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {blockCopied ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-sm font-mono" style={{ color: 'var(--text-sidebar)' }}>
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },
    ul: ({ children }: any) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
    p: ({ children }: any) => <div className="mb-4 last:mb-0 leading-7" style={{ color: 'var(--text-app)' }}>{children}</div>,
    h1: ({ children }: any) => <h1 className="text-xl md:text-2xl font-medium mb-4 mt-6" style={{ color: 'var(--text-app)' }}>{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg md:text-xl font-medium mb-3 mt-5" style={{ color: 'var(--text-app)' }}>{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base md:text-lg font-medium mb-2 mt-4" style={{ color: 'var(--text-app)' }}>{children}</h3>,
    img: ({ src, alt }: any) => {
      if (!src) return null;

      return (
        <div className="my-2 max-w-md">
          <img
            src={src}
            alt={alt}
            className="w-full h-auto rounded-lg border border-dark-700"
            loading="lazy"
          />
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 block">
            Open Image
          </a>
        </div>
      );
    },
  }), []);

  // EmbeddedImage component for rendering images outside of ReactMarkdown
  const EmbeddedImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [imgError, setImgError] = React.useState(false);
    const [imgLoaded, setImgLoaded] = React.useState(false);
    const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
    const [debugInfo, setDebugInfo] = React.useState<string>("");

    React.useEffect(() => {
      let active = true;
      if (src && src.startsWith('data:')) {
        try {
          // Manual Base64 to Blob conversion to avoid fetch() limits/issues
          const [header, base64Data] = src.split(',');
          const mimeMatch = header.match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          const url = URL.createObjectURL(blob);

          if (active) setBlobUrl(url);
        } catch (e: any) {
          console.error("Failed to convert base64 to blob", e);
          if (active) {
            setBlobUrl(src); // Fallback to direct src
            setDebugInfo(`Blob conversion failed: ${e.message}`);
          }
        }
      } else {
        setBlobUrl(src);
      }

      return () => {
        active = false;
        if (blobUrl && blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }, [src]);

    if (!src) return null;

    return (
      <div className="my-4 rounded-xl overflow-hidden border border-dark-700 shadow-2xl">
        {!imgLoaded && !imgError && (
          <div className="w-full h-64 bg-dark-800 flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading generated image...</span>
          </div>
        )}
        {imgError && (
          <div className="w-full h-64 bg-dark-800 flex items-center justify-center flex-col gap-2 p-4 text-center">
            <span className="text-red-400 text-sm font-bold">Failed to load generated image</span>
            <span className="text-xs text-gray-500 font-mono break-all">{debugInfo || "Unknown error"}</span>
            <span className="text-xs text-gray-600 font-mono mt-2">Source start: {src.substring(0, 50)}...</span>
          </div>
        )}
        {blobUrl && (
          <img
            src={blobUrl}
            alt={alt}
            className={`w-full h-auto object-cover ${imgLoaded ? '' : 'hidden'}`}
            onLoad={() => setImgLoaded(true)}
            onError={(e: any) => {
              console.error('EmbeddedImage failed to load:', e);
              setImgError(true);
              setDebugInfo("Image tag onError event fired");
            }}
          />
        )}
        {alt && imgLoaded && (
          <p className="px-4 py-2 text-xs text-gray-400 bg-dark-900/50 italic border-t border-dark-800">{alt}</p>
        )}
      </div>
    );
  };

  // Mobile Long Press logic
  const touchTimeout = React.useRef<any>(null);
  const handleTouchStart = () => {
    touchTimeout.current = setTimeout(() => {
      handleCopy();
      if (window.navigator.vibrate) window.navigator.vibrate(50); // Haptic feedback if supported
    }, 600);
  };
  const handleTouchEnd = () => {
    if (touchTimeout.current) clearTimeout(touchTimeout.current);
  };

  return (
    <div
      className={`flex w-full mb-8 gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd} // Cancel if moving
    >


      {/* Content Column */}
      <div className={clsx(
        "flex flex-col max-w-4xl relative",
        isUser ? 'items-end' : 'items-start w-full'
      )}>
        {isUser && (
          <div className="text-base whitespace-pre-wrap" style={{ color: 'var(--text-app)' }}>{message.content}</div>
        )}

        {/* Floating COPY Button (for Final Prompts and User Messages) moved below content */}
        {(isFinalPrompt || isUser) && (
          <button
            onClick={handleCopy}
            className={clsx(
              "mt-2 flex items-center justify-center w-8 h-8 rounded-lg shadow-lg transition-all hover:scale-110 active:scale-95 z-10",
              isUser
                ? "text-gray-400 hover:text-brand-600 border"
                : "bg-brand-600 text-white"
            )}
            style={isUser ? { backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' } : {}}
            title={isUser ? "Copy your prompt" : "Copy generated prompt"}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
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
                <span className="text-xs text-gray-400">
                  {message.executionModel?.includes('pro-image-preview') ? '🍌 Nano Banana' :
                    message.executionModel?.includes('claude-sonnet-4.5') ? 'Claude Sonnet 4.5' :
                      message.executionModel || 'Claude 3.5 Sonnet'}
                </span>
              </div>
            )}
            {message.status === 'processing' ? (
              (() => {
                // Detect if message is stuck (processing for > 2 minutes)
                const startTime = message.metadata?.startTime;
                const isStuck = startTime && (Date.now() - startTime > 2 * 60 * 1000);

                if (isStuck) {
                  return (
                    <div className="flex flex-col gap-3 py-2">
                      <div className="flex items-center gap-3 text-amber-400 font-medium">
                        <div className="relative flex h-3 w-3">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </div>
                        This request appears to be stuck
                      </div>
                      <div className="text-sm text-gray-400/80">
                        The background process may have been interrupted. You can retry or dismiss this message.
                      </div>
                      <div className="flex gap-2 mt-2">
                        {onRecoverStuck && (
                          <button
                            onClick={() => onRecoverStuck(message.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-all"
                          >
                            <RotateCcw size={14} />
                            Retry
                          </button>
                        )}
                        {onRegenerate && (
                          <button
                            onClick={() => onRegenerate(message.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium rounded-lg transition-all border border-dark-600"
                          >
                            Continue Chat
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Check if this is a heavy execution (Run Prompt) or just normal chat
                const isExecution = message.msgType === 'execution_result';

                if (!isExecution) {
                  // Simple Pulsing Dot for normal chat
                  return (
                    <div className="flex items-center gap-3 py-3 px-1 text-gray-400">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                      </div>
                      <span className="text-sm font-medium animate-pulse">Generating response...</span>
                    </div>
                  );
                }

                // Large Loading Box for Execution Results (Vibe Code, etc)
                const isTalkToSource = message.mode === 'Talk to Source';
                const isMediaGen = message.mode === 'Media Gen';

                let processingLabel = 'Building your application...';
                let processingSubtext = 'This may take up to a minute for complex architectures.';
                let gradientClass = 'from-purple-600 to-pink-600';
                let dotColor = 'bg-purple-400';
                let dotColorSolid = 'bg-purple-500';
                let textColor = 'text-purple-300';

                if (isTalkToSource) {
                  processingLabel = 'Analyzing your content...';
                  processingSubtext = 'Reading and understanding your source material.';
                  gradientClass = 'from-orange-600 to-amber-600';
                  dotColor = 'bg-orange-400';
                  dotColorSolid = 'bg-orange-500';
                  textColor = 'text-orange-300';
                } else if (isMediaGen) {
                  processingLabel = 'Designing media prompts...';
                  processingSubtext = 'Crafting the perfect parameters for your generation.';
                  gradientClass = 'from-pink-600 to-rose-600';
                  dotColor = 'bg-pink-400';
                  dotColorSolid = 'bg-pink-500';
                  textColor = 'text-pink-300';
                }

                return (
                  <div className="flex flex-col gap-3 py-2">
                    <div className={`flex items-center gap-3 ${textColor} font-medium`}>
                      <div className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColorSolid}`}></span>
                      </div>
                      {processingLabel}
                    </div>
                    <div className="text-sm text-gray-400/80 italic">
                      {processingSubtext}
                    </div>
                    <div className="mt-2 h-1 w-full bg-dark-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${gradientClass} w-1/3 animate-[shimmer_2s_infinite]`}></div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col gap-4">
                <ReactMarkdown components={markdownComponents}>
                  {displayContent}
                </ReactMarkdown>

                {artifactContent && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border hover:border-purple-500/30 transition-all group" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300 transition-colors">
                          <Sparkles size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold" style={{ color: 'var(--text-app)' }}>Application Generated</span>
                          <span className="text-xs" style={{ color: 'var(--text-sidebar-dim)' }}>Click to view preview</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenArtifact && onOpenArtifact(artifactContent!, "Generated App")}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-purple-500/20"
                      >
                        View App
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Embedded Image (rendered separately to avoid ReactMarkdown issues with huge data URLs) */}
            {embeddedImageData && (
              <EmbeddedImage src={embeddedImageData} alt="Generated Image" />
            )}

            {/* Quick Reply Options / Outcome Buttons */}
            {options.length > 0 && onOptionSelect && (
              <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in duration-500">
                {options.map((opt, idx) => {
                  // Check if this is a Vibe Code "Outcome Button"
                  const isOutcomeButton = message.mode === 'Vibe Code' &&
                    ['Make it Pop', 'Mobile First', 'Gamify', 'Professional'].some(key => opt.includes(key));

                  return (
                    <button
                      key={idx}
                      onClick={() => onOptionSelect(opt, message.id)}
                      className={
                        isOutcomeButton
                          ? "px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-full border border-purple-400/30 transition-all shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
                          : "px-4 py-2 bg-dark-800 hover:bg-brand-600 hover:text-white text-brand-200 text-sm font-medium rounded-lg border border-dark-700 hover:border-brand-500 transition-all shadow-sm"
                      }
                    >
                      {isOutcomeButton && <Sparkles size={14} className="text-yellow-300" />}
                      {opt}
                    </button>
                  );
                })}
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
});
