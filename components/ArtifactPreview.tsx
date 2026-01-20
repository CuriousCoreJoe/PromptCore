import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code, Eye, Monitor, Smartphone, Maximize2, RotateCcw, Copy, Check, Download } from 'lucide-react';
import { clsx } from 'clsx';

interface ArtifactPreviewProps {
    content: string; // The HTML/Code content
    title?: string;
    isExpanded?: boolean;
}

export const ArtifactPreview: React.FC<ArtifactPreviewProps> = React.memo(({ content, title = "Application Preview" }) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
    const [copied, setCopied] = useState(false);
    const [key, setKey] = useState(0); // To force iframe reload

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReload = () => {
        setKey(prev => prev + 1);
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col w-full h-[600px] border border-dark-700 rounded-xl overflow-hidden bg-[#1E1F20] shadow-2xl transition-all hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.1)]">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#2A2B2C]/80 border-b border-dark-700 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <div className="flex items-center p-1 bg-dark-900 rounded-lg border border-dark-700">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                activeTab === 'preview'
                                    ? "bg-dark-700 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <Eye size={14} />
                            Preview
                        </button>
                        <button
                            onClick={() => setActiveTab('code')}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                activeTab === 'code'
                                    ? "bg-dark-700 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <Code size={14} />
                            Code
                        </button>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {activeTab === 'preview' && (
                        <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-dark-900 rounded-lg border border-dark-700">
                            <button
                                onClick={() => setViewport('desktop')}
                                className={clsx(
                                    "p-1.5 rounded transition-colors",
                                    viewport === 'desktop' ? "text-blue-400 bg-blue-500/10" : "text-gray-500 hover:text-gray-300"
                                )}
                                title="Desktop View"
                            >
                                <Monitor size={14} />
                            </button>
                            <button
                                onClick={() => setViewport('mobile')}
                                className={clsx(
                                    "p-1.5 rounded transition-colors",
                                    viewport === 'mobile' ? "text-purple-400 bg-purple-500/10" : "text-gray-500 hover:text-gray-300"
                                )}
                                title="Mobile View"
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleReload}
                        className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        title="Reload Preview"
                    >
                        <RotateCcw size={16} />
                    </button>

                    <button
                        onClick={handleDownload}
                        className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        title="Download HTML"
                    >
                        <Download size={16} />
                    </button>

                    <div className="w-px h-4 bg-dark-700 mx-1"></div>

                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-brand-600 rounded-lg border border-dark-600 hover:border-brand-500 transition-all"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="relative flex-1 bg-[#121212] overflow-hidden flex justify-center w-full">
                {activeTab === 'preview' ? (
                    <div className={clsx(
                        "transition-all duration-300 ease-in-out h-full border-x border-dark-800 bg-white",
                        viewport === 'mobile' ? "w-[375px]" : "w-full"
                    )}>
                        <iframe
                            key={key}
                            srcDoc={content}
                            title="Preview"
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full overflow-hidden bg-[#1E1F20]">
                        <SyntaxHighlighter
                            language="html"
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                padding: '1.5rem',
                                height: '100%',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                backgroundColor: '#1E1F20', // Align with your dark theme
                            }}
                            showLineNumbers={true}
                            wrapLines={true}
                        >
                            {content}
                        </SyntaxHighlighter>
                    </div>
                )}
            </div>
        </div>
    );
});
