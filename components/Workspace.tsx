import React, { useState, useEffect, useRef } from 'react';
import { Message, AppMode, ChatSession } from '../types';
import { supabase } from '../lib/supabase';
import { MessageBubble } from './MessageBubble';
import { Send, Mic, Sparkles, ChevronRight, Minimize2, Maximize2, Briefcase, Coffee, List, FileText, Plus, ChevronDown, LayoutGrid, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface WorkspaceProps {
    currentMode: AppMode;
    session: any;
    credits: number;
    onShowToast: (msg: string, actionLabel?: string, action?: () => void) => void;
    onUpgrade: () => void;
    wizardMode: 'iterative' | 'batch';
    onSelectMode: (mode: AppMode) => void;
    activeChatId: string | null;
    onLoadChat: (chatId: string) => void;
}

type WizardStage = 'IDLE' | 'GOAL_SELECTION' | 'CLARIFYING' | 'GENERATING';

interface GoalOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    promptSuffix: string;
}

const GOAL_OPTIONS: GoalOption[] = [
    { id: 'explain', label: 'Explain this', icon: <FileText size={16} />, promptSuffix: "Explain this concept clearly and visually." },
    { id: 'shorten', label: 'Shorten', icon: <Minimize2 size={16} />, promptSuffix: "Shorten this text significantly while keeping key info." },
    { id: 'elaborate', label: 'Elaborate', icon: <Maximize2 size={16} />, promptSuffix: "Elaborate on this, adding details and examples." },
    { id: 'formal', label: 'More Formal', icon: <Briefcase size={16} />, promptSuffix: "Rewrite this to be professional and formal." },
    { id: 'casual', label: 'More Casual', icon: <Coffee size={16} />, promptSuffix: "Rewrite this to be casual and friendly." },
    { id: 'bulletize', label: 'Bulletize', icon: <List size={16} />, promptSuffix: "Convert this into a bulleted list." },
];

import { ModeSelector } from './ModeSelector';

export const Workspace: React.FC<WorkspaceProps> = ({ currentMode, session, credits, onShowToast, onUpgrade, wizardMode, onSelectMode, activeChatId, onLoadChat }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '0', role: 'system', content: '', timestamp: Date.now(), mode: AppMode.EVERYDAY }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [wizardStage, setWizardStage] = useState<WizardStage>('IDLE');
    const [draftPrompt, setDraftPrompt] = useState('');
    const [recentChats, setRecentChats] = useState<ChatSession[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isDev = session?.user?.email === 'dev@promptcore.com';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, wizardStage]);

    // Load Chat History
    useEffect(() => {
        if (activeChatId) {
            const loadHistory = async () => {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', activeChatId)
                    .order('created_at', { ascending: true });

                if (data) {
                    const mappedMessages: Message[] = data.map(m => ({
                        id: m.id,
                        role: m.role as any,
                        content: m.content,
                        timestamp: new Date(m.created_at).getTime(),
                        mode: currentMode // Assuming chat mode is consistent
                    }));
                    // Add system message at top if needed, or just replace
                    setMessages([{ id: '0', role: 'system', content: '', timestamp: 0, mode: currentMode }, ...mappedMessages]);
                    setWizardStage('IDLE'); // Reset wizard for existing chats
                }
            };
            loadHistory();
        } else {
            // New Session
            setMessages([{ id: '0', role: 'system', content: '', timestamp: Date.now(), mode: currentMode }]);
            setWizardStage('IDLE');
        }
    }, [activeChatId]);

    // Fetch Recent Chats for Welcome Screen
    useEffect(() => {
        const fetchRecent = async () => {
            if (!session?.user) return;
            const { data } = await supabase
                .from('chats')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('mode', currentMode)
                .order('updated_at', { ascending: false })
                .limit(5);

            if (data) setRecentChats(data as unknown as ChatSession[]);
        };
        fetchRecent();
    }, [currentMode, session]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
        }
    }, [input]);

    const handleInitialSubmit = async () => {
        if (!input.trim()) return;
        setDraftPrompt(input);

        let chatId = activeChatId;

        // Create New Chat if none active
        if (!chatId) {
            const { data, error } = await supabase
                .from('chats')
                .insert({
                    user_id: session.user.id,
                    title: input.slice(0, 30) + '...',
                    mode: currentMode
                })
                .select()
                .single();

            if (data) {
                chatId = data.id;
                onLoadChat(data.id);
                // We need to wait for parent to update prop, or just use local var for now
            }
        }

        const newMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now(),
            mode: currentMode
        };

        setMessages(prev => [...prev, newMsg]);

        // Save to DB immediately with the (potentially new) chatId
        if (chatId) {
            await supabase.from('messages').insert({
                chat_id: chatId,
                role: 'user',
                content: input
            });
        }

        setInput('');
        setWizardStage('GOAL_SELECTION');
    };

    const handleGoalSelect = async (goal: GoalOption) => {
        setWizardStage('CLARIFYING');
        const isIterative = wizardMode === 'iterative';
        const hiddenInstruction = `User Goal: ${goal.label} (${goal.promptSuffix}).\nDraft Input: "${draftPrompt}".\n\nTask: ${isIterative ? "Ask exactly ONE clarifying question to begin." : "Ask 2-4 clarifying questions to help the user achieve this goal perfectly."}`;
        await processMessage(hiddenInstruction, true);
    };

    const handleClarificationAnswer = async () => {
        if (!input.trim()) return;
        const answer = input;
        setInput('');

        // If batch, we move to generating now. If iterative, we stay in clarifying until finished.
        if (wizardMode === 'batch') {
            setWizardStage('GENERATING');
        }

        const newMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: answer,
            timestamp: Date.now(),
            mode: currentMode
        };
        setMessages(prev => [...prev, newMsg]);
        await saveMessage(newMsg);
        await processMessage(answer);
    };

    const saveMessage = async (msg: Message) => {
        if (activeChatId) {
            await supabase.from('messages').insert({
                chat_id: activeChatId,
                role: msg.role,
                content: msg.content
            });
        }
    };

    const processMessage = async (content: string, isHiddenInstruction = false) => {
        setIsLoading(true);
        const tempMessages = [...messages];
        if (isHiddenInstruction) {
            tempMessages.push({
                id: 'hidden-' + Date.now(),
                role: 'user',
                content: content,
                timestamp: Date.now(),
                mode: currentMode
            });
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: tempMessages,
                    input: isHiddenInstruction ? content : content,
                    mode: currentMode,
                    userId: session.user.id,
                    wizardMode
                })
            });

            if (!response.ok) throw new Error('Chat error');
            const data = await response.json();

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                content: data.text,
                timestamp: Date.now(),
                mode: currentMode
            }]);

            // Save Model Response
            if (activeChatId) { // NOTE: If we just created it, we rely on App updating prop. For strictness, could pass chatId arg.
                await supabase.from('messages').insert({
                    chat_id: activeChatId,
                    role: 'model',
                    content: data.text
                });
            }

            // Auto-detect finish
            if (data.text.includes('FINAL PROMPT:')) {
                setWizardStage('IDLE');
                // Optional: Scroll to bottom or show a special "Completed" toast
            }

        } catch (err) {
            console.error(err);
            onShowToast('Error. Check credits.', 'Upgrade', onUpgrade);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (wizardStage === 'IDLE') handleInitialSubmit();
            else if (wizardStage === 'CLARIFYING') handleClarificationAnswer();
            else if (!isLoading) {
                const val = input;
                setInput('');
                const newMsg: Message = { id: Date.now().toString(), role: 'user', content: val, timestamp: Date.now(), mode: currentMode };
                setMessages(prev => [...prev, newMsg]);
                saveMessage(newMsg);
                processMessage(val);
            }
        }
    };
    const handleOptionSelect = (option: string) => {
        if (isLoading) return;
        const processedOption = option.replace(/^\d+\.\s*/, ''); // Remove numbering if present
        setInput('');
        const newMsg: Message = { id: Date.now().toString(), role: 'user', content: processedOption, timestamp: Date.now(), mode: currentMode };
        setMessages(prev => [...prev, newMsg]);
        saveMessage(newMsg);
        processMessage(processedOption);
    };

    const MODE_CONFIGS = {
        [AppMode.EVERYDAY]: {
            title: "Everyday Assistant",
            desc: "General purpose brainstorming, chatting, or drafting for your daily tasks.",
            initial: "E",
            color: "bg-blue-600",
            recent: recentChats.map(c => c.title) // Use real recent chats
        },
        [AppMode.VIBE_CODE]: {
            title: "Vibe Code",
            desc: "Technical Mode. I'll ask clarifying questions to extract your exact technical needs.",
            initial: "C",
            color: "bg-purple-600/80",
            recent: recentChats.map(c => c.title) // Use real recent chats
        },
        [AppMode.MEDIA_GEN]: {
            title: "Media Gen",
            desc: "Creative Mode. Optimized prompts for tools like Midjourney, Runway, and Suno.",
            initial: "M",
            color: "bg-pink-600/80",
            recent: recentChats.map(c => c.title) // Use real recent chats
        },
        [AppMode.TALK_TO_SOURCE]: {
            title: "Talk to Source",
            desc: "RAG Mode. Share a link or file, and I'll analyze the content for you on the fly.",
            initial: "S",
            color: "bg-orange-600/80",
            recent: recentChats.map(c => c.title) // Use real recent chats
        },
    };

    return (
        <div className="flex flex-col h-full relative bg-[#131314] text-gray-100 font-sans">

            {/* Gemini Header */}
            <header className="h-[64px] flex-shrink-0 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-2">
                    <ModeSelector currentMode={currentMode} onSelectMode={onSelectMode} />
                </div>

                <div className="flex items-center gap-4">
                    <div
                        onClick={onUpgrade}
                        className="flex items-center gap-3 bg-[#1E1F20] hover:bg-[#2A2B2C] border border-dark-800 rounded-full pl-3 pr-4 py-1.5 transition-all cursor-pointer group"
                    >
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-xs font-medium text-gray-300">
                            {isDev ? 'Unlimited Credits' : `${credits} Credits`}
                        </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold ring-2 ring-dark-800 hover:ring-blue-500/50 transition-all cursor-pointer">
                        {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-6">

                    {messages.length === 1 && wizardStage === 'IDLE' && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto py-12">
                            {/* Avatar Header */}
                            <div className={cn(
                                "w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-8 shadow-2xl ring-4 ring-dark-800/50",
                                MODE_CONFIGS[currentMode].color
                            )}>
                                {MODE_CONFIGS[currentMode].initial}
                            </div>

                            {/* Title & Description */}
                            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                                {MODE_CONFIGS[currentMode].title}
                            </h1>
                            <p className="text-xl text-gray-400 mb-16 leading-relaxed max-w-xl">
                                {MODE_CONFIGS[currentMode].desc}
                            </p>

                            {/* Recent Section */}
                            <div className="w-full max-w-md text-left">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 ml-1">Recent</h3>
                                <div className="space-y-3">
                                    {(recentChats.length > 0 ? recentChats : []).map((chat, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => onLoadChat(chat.id)}
                                            className="flex items-center gap-4 p-3.5 rounded-2xl bg-dark-900/30 border border-dark-800/50 hover:border-brand-500/30 hover:bg-dark-800/40 transition-all cursor-pointer group"
                                        >
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner", MODE_CONFIGS[currentMode].color)}>
                                                {MODE_CONFIGS[currentMode].initial}
                                            </div>
                                            <span className="text-gray-300 group-hover:text-white font-medium truncate flex-1">{chat.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.filter(m => m.id !== '0' && !m.id.startsWith('hidden-')).map((msg) => (
                        <MessageBubble key={msg.id} message={msg} onOptionSelect={handleOptionSelect} />
                    ))}

                    {wizardStage === 'GOAL_SELECTION' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex flex-col gap-2 mb-2">
                                <span className="text-sm text-gray-400 ml-1">Refine your request:</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {GOAL_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleGoalSelect(opt)}
                                        className="flex flex-col items-start gap-2 p-4 bg-dark-900/50 hover:bg-dark-800 border border-dark-800 hover:border-blue-500/30 rounded-2xl transition-all text-left group"
                                    >
                                        <span className="text-blue-400 group-hover:text-blue-300 transition-colors bg-blue-500/10 p-2 rounded-lg">
                                            {opt.icon}
                                        </span>
                                        <span className="font-medium text-gray-200 text-sm">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center gap-3 animate-pulse text-gray-500">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Sparkles size={16} className="text-blue-400" />
                            </div>
                            <span className="text-sm">Thinking...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-32" />
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-6 bg-[#131314]">
                <div className="max-w-4xl mx-auto">
                    <div className={cn(
                        "flex items-end bg-[#1E1F20] rounded-[28px] transition-all duration-200 border border-transparent focus-within:border-dark-700 shadow-2xl overflow-hidden pr-2 py-2",
                        "focus-within:bg-[#1E1F20]"
                    )}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                wizardStage === 'IDLE' ? "Enter a prompt here" :
                                    wizardStage === 'CLARIFYING' ? "Answer the questions..." :
                                        "Reply to Gemini..."
                            }
                            className="flex-1 bg-transparent text-[#E3E3E3] placeholder-[#8E918F] px-6 py-3 focus:outline-none resize-none min-h-[56px] max-h-[200px] overflow-y-auto leading-relaxed text-[15px]"
                            rows={1}
                        />

                        {/* Send Button */}
                        <div className="flex-shrink-0 mb-1">
                            <button
                                onClick={() => {
                                    if (wizardStage === 'IDLE') handleInitialSubmit();
                                    else if (wizardStage === 'CLARIFYING') handleClarificationAnswer();
                                    else {
                                        const val = input;
                                        setInput('');
                                        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: val, timestamp: Date.now(), mode: currentMode }]);
                                        processMessage(val);
                                    }
                                }}
                                disabled={!input.trim() || isLoading}
                                className={cn(
                                    "p-2.5 rounded-full transition-all duration-200",
                                    input.trim()
                                        ? "bg-[#E3E3E3] text-[#131314] hover:bg-white shadow-lg"
                                        : "bg-transparent text-gray-600 cursor-not-allowed hover:bg-dark-800"
                                )}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="text-center mt-3 text-xs text-gray-500 font-medium">
                        PromptCore can make mistakes. Consider checking important information.
                    </div>
                </div>
            </div>
        </div>
    );
};
