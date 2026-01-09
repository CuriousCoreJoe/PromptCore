import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppMode, ChatSession } from '../types';
import { supabase } from '../lib/supabase';
import { MessageBubble } from './MessageBubble';
import { Send, Mic, Sparkles, ChevronRight, Minimize2, Maximize2, Briefcase, Coffee, List, FileText, Plus, ChevronDown, LayoutGrid, Clock, Upload, Link, Image, Video, Music, Code, Zap, Bug, Palette, Type, MessageSquare, Youtube } from 'lucide-react';
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
    defaultModel?: string;
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

// Mode-specific goal options
const EVERYDAY_GOALS: GoalOption[] = [
    { id: 'enhance', label: 'Enhance', icon: <Sparkles size={16} />, promptSuffix: "Enhance this with more details, clarity, and impact." },
    { id: 'explain', label: 'Explain this', icon: <FileText size={16} />, promptSuffix: "Explain this concept clearly and visually." },
    { id: 'shorten', label: 'Shorten', icon: <Minimize2 size={16} />, promptSuffix: "Shorten this text significantly while keeping key info." },
    { id: 'formal', label: 'More Formal', icon: <Briefcase size={16} />, promptSuffix: "Rewrite this to be professional and formal." },
    { id: 'casual', label: 'More Casual', icon: <Coffee size={16} />, promptSuffix: "Rewrite this to be casual and friendly." },
    { id: 'bulletize', label: 'Bulletize', icon: <List size={16} />, promptSuffix: "Convert this into a bulleted list." },
];

const VIBE_CODE_GOALS: GoalOption[] = [
    { id: 'make-it-pop', label: 'Make it Pop', icon: <Sparkles size={16} className="text-yellow-400" />, promptSuffix: "Make it pop with modern, colorful, shadowed CSS and glassmorphism." },
    { id: 'mobile-first', label: 'Mobile First', icon: <LayoutGrid size={16} />, promptSuffix: "Ensure the design is fully responsive and mobile-first." },
    { id: 'gamify', label: 'Gamify', icon: <Zap size={16} />, promptSuffix: "Add fun interactions, animations, and gamified elements." },
    { id: 'professional', label: 'Professional', icon: <Briefcase size={16} />, promptSuffix: "Make the design clean, corporate, and professional." },
    { id: 'minimal', label: 'Minimalist', icon: <Minimize2 size={16} />, promptSuffix: "Use a clean, minimalist aesthetic with lots of whitespace." },
    { id: 'dark-mode', label: 'Dark Mode', icon: <Sparkles size={16} />, promptSuffix: "Implement a sleek, modern dark mode." },
];

const MEDIA_GEN_GOALS: GoalOption[] = [
    { id: 'image', label: 'Image', icon: <Image size={16} />, promptSuffix: "Generate an image prompt for Midjourney/DALL-E." },
    { id: 'video', label: 'Video', icon: <Video size={16} />, promptSuffix: "Generate a video prompt for Runway/Pika." },
    { id: 'music', label: 'Music', icon: <Music size={16} />, promptSuffix: "Generate a music prompt for Suno/Udio." },
    { id: 'style-transfer', label: 'Style Transfer', icon: <Palette size={16} />, promptSuffix: "Transform content into a specific artistic style." },
    { id: 'enhance-visual', label: 'Enhance', icon: <Sparkles size={16} />, promptSuffix: "Enhance and upscale existing media." },
    { id: 'animate', label: 'Animate', icon: <Zap size={16} />, promptSuffix: "Create animation from static content." },
];

const TALK_TO_SOURCE_GOALS: GoalOption[] = [
    { id: 'summarize', label: 'Summarize', icon: <FileText size={16} />, promptSuffix: "Summarize the key points of this content." },
    { id: 'extract', label: 'Extract Info', icon: <List size={16} />, promptSuffix: "Extract specific information or data points." },
    { id: 'explain', label: 'Explain', icon: <MessageSquare size={16} />, promptSuffix: "Explain the concepts in this content." },
    { id: 'compare', label: 'Compare', icon: <Code size={16} />, promptSuffix: "Compare different ideas or sections." },
    { id: 'generate', label: 'Generate Content', icon: <Sparkles size={16} />, promptSuffix: "Generate new content based on this source." },
    { id: 'qa', label: 'Q&A', icon: <MessageSquare size={16} />, promptSuffix: "Answer questions about this content." },
];

const getGoalOptionsForMode = (mode: AppMode): GoalOption[] => {
    switch (mode) {
        case AppMode.VIBE_CODE:
            return VIBE_CODE_GOALS;
        case AppMode.MEDIA_GEN:
            return MEDIA_GEN_GOALS;
        case AppMode.TALK_TO_SOURCE:
            return TALK_TO_SOURCE_GOALS;
        case AppMode.EVERYDAY:
        default:
            return EVERYDAY_GOALS;
    }
};


import { ModeSelector } from './ModeSelector';

export const Workspace: React.FC<WorkspaceProps> = ({ currentMode, session, credits, onShowToast, onUpgrade, wizardMode, defaultModel, onSelectMode, activeChatId, onLoadChat }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '0', role: 'system', content: '', timestamp: Date.now(), mode: AppMode.EVERYDAY }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRunningExecution, setIsRunningExecution] = useState(false);
    const [wizardStage, setWizardStage] = useState<WizardStage>('IDLE');
    const [draftPrompt, setDraftPrompt] = useState('');
    const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
    const [showYouTubeInput, setShowYouTubeInput] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [uploadedSource, setUploadedSource] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isDev = session?.user?.email === 'dev@promptcore.com';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, wizardStage]);

    // Load Chat History
    const loadHistory = useCallback(async () => {
        if (!activeChatId) return;

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
                mode: currentMode,
                status: m.status as any,
                msgType: m.msg_type as any,
                executionModel: m.execution_model,
                metadata: m.metadata
            }));
            // Add system message at top if needed, or just replace
            setMessages([{ id: '0', role: 'system', content: '', timestamp: 0, mode: currentMode }, ...mappedMessages]);
            // Only reset wizard for existing chats if not currently in a transition
            setWizardStage(prev => prev === 'IDLE' ? 'IDLE' : prev);
        }
    }, [activeChatId, currentMode]);

    useEffect(() => {
        if (activeChatId) {
            loadHistory();
        } else {
            // New Session
            setMessages([{ id: '0', role: 'system', content: '', timestamp: Date.now(), mode: currentMode }]);
            setWizardStage('IDLE');
        }
    }, [activeChatId, loadHistory]);

    // Message Real-time Subscription (to catch Background Builder updates)
    useEffect(() => {
        if (!activeChatId) return;

        const channel = supabase
            .channel(`chat-messages-${activeChatId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${activeChatId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new;
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, {
                            id: newMsg.id,
                            role: newMsg.role,
                            content: newMsg.content,
                            timestamp: new Date(newMsg.created_at).getTime(),
                            mode: currentMode,
                            status: newMsg.status,
                            msgType: newMsg.msg_type,
                            executionModel: newMsg.execution_model,
                            metadata: newMsg.metadata
                        }];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updatedMsg = payload.new;
                    setMessages(prev => prev.map(m => m.id === updatedMsg.id ? {
                        ...m,
                        content: updatedMsg.content,
                        status: updatedMsg.status,
                        metadata: updatedMsg.metadata
                    } : m));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChatId]);

    useEffect(() => {
        const fetchRecent = async () => {
            if (!session?.user) return;
            const { data } = await supabase
                .from('chats')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('mode', currentMode)
                .order('updated_at', { ascending: false })
                .limit(3);

            if (data) setRecentChats(data as unknown as ChatSession[]);
        };
        fetchRecent();

        if (session?.user) {
            const channelName = `workspace-recents-${session.user.id}-${currentMode}`;
            const channel = supabase
                .channel(channelName)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                    filter: `user_id=eq.${session.user.id}`
                }, (payload) => {
                    fetchRecent();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
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
                    wizardMode,
                    defaultModel: defaultModel || 'claude-sonnet-4.5'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Evaluation Error Details:", errorData);
                throw new Error(errorData.error || `Chat error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                content: data.text,
                timestamp: Date.now(),
                mode: currentMode,
                msgType: data.msgType || 'meta_helper'
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

        // If we answer a clarifying question via quick action, handle it as an answer
        if (wizardStage === 'CLARIFYING') {
            setInput(processedOption);
            // We need to wait a tick or call a modified handler because handleClarificationAnswer uses 'input' state
            // But since setState is async, we can just call the logic directly:
            const newMsg: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: processedOption,
                timestamp: Date.now(),
                mode: currentMode
            };
            setMessages(prev => [...prev, newMsg]);
            saveMessage(newMsg);

            if (wizardMode === 'batch') setWizardStage('GENERATING');

            processMessage(processedOption);
        } else {
            // Fallback for normal inputs
            setInput('');
            const newMsg: Message = { id: Date.now().toString(), role: 'user', content: processedOption, timestamp: Date.now(), mode: currentMode };
            setMessages(prev => [...prev, newMsg]);
            saveMessage(newMsg);
            processMessage(processedOption);
        }
    };

    // ... (rest of component)

    // Only show Quick Actions Grid for the INITIAL prompt (Liquid Actions)
    const showQuickActions = wizardStage === 'GOAL_SELECTION' && messages.length < 3;


    // Dual-Lane Action Handlers
    const handleRunPrompt = async (messageId: string, content: string) => {
        // Prevent double clicks - if already running, do nothing
        if (isRunningExecution) {
            return;
        }

        // Extract the actual prompt from the message content
        let promptToRun = content;

        // Extract content from code block if present - Prioritize JSON blocks for Media Gen
        if (content.includes('```')) {
            const blocks = content.split('```');
            // Find blocks that are likely JSON (starts with { or marked with json)
            const jsonBlock = blocks.find(b => b.trim().startsWith('json') || (b.trim().startsWith('{') && b.trim().endsWith('}')));

            if (jsonBlock) {
                promptToRun = jsonBlock.replace(/^json\n?/, '').trim();
            } else {
                // Fallback to the first available code block
                const codeBlockMatch = content.match(/```(?:[\w]*\n)?([\s\S]*?)```/);
                if (codeBlockMatch) {
                    promptToRun = codeBlockMatch[1].trim();
                }
            }
        } else if (content.includes('FINAL PROMPT:')) {
            // Fallback: Extract content after "FINAL PROMPT:"
            promptToRun = content.split('FINAL PROMPT:')[1]?.trim() || content;
        }

        setIsRunningExecution(true);
        onShowToast('🚀 Initializing Builder...');

        try {
            // Get execution history (only execution_result messages)
            const executionHistory = messages
                .filter(m => m.msgType === 'execution_result')
                .map(m => ({ role: m.role, content: m.content }));

            // Determine if we should use the background builder (for Vibe Code) or standard execute
            const useBackgroundBuilder = currentMode === AppMode.VIBE_CODE;
            const endpoint = useBackgroundBuilder ? '/api/builder-background' : '/api/execute';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptToRun,
                    userId: session.user.id,
                    chatId: activeChatId, // Required for background builder update
                    conversationHistory: executionHistory,
                    model: defaultModel,
                    mode: currentMode
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Execution failed');
            }

            // If background builder, we just wait for Realtime to update the UI
            if (useBackgroundBuilder) {
                onShowToast('🏗️ Architect is building in the background...');
                // Force a refresh after a delay to ensure the "Processing" message is caught
                // (Optimistic update backup in case Realtime is slow)
                setTimeout(() => {
                    loadHistory();
                }, 1000);
            } else {
                // Standard synchronous execution (Media Gen, etc.)
                const data = await response.json();

                const executionMsg: Message = {
                    id: Date.now().toString(),
                    role: 'model',
                    content: data.text,
                    timestamp: Date.now(),
                    mode: currentMode,
                    msgType: 'execution_result',
                    executionModel: data.model
                };

                setMessages(prev => [...prev, executionMsg]);

                // Save to DB
                if (activeChatId) {
                    await supabase.from('messages').insert({
                        chat_id: activeChatId,
                        role: 'model',
                        content: data.text,
                        msg_type: 'execution_result',
                        execution_model: data.model
                    });
                }
                onShowToast(`✓ Executed with ${data.model || 'external LLM'}`);
            }

        } catch (err: any) {
            console.error('Execution error:', err);
            onShowToast('Execution failed. Check configuration.', 'Upgrade', onUpgrade);
        } finally {
            setIsRunningExecution(false);
        }
    };

    const handleShorten = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const instruction = `Take this output and make it significantly shorter while keeping the core message:\n\n${message.content}`;
        await processMessage(instruction);
    };

    const handleElaborate = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const instruction = `Take this output and elaborate on it with more details, examples, and context:\n\n${message.content}`;
        await processMessage(instruction);
    };

    const handleFormalize = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const instruction = `Rewrite this output to be more professional and formal:\n\n${message.content}`;
        await processMessage(instruction);
    };

    const handleCopyResult = (content: string) => {
        navigator.clipboard.writeText(content);
        onShowToast('✓ Copied to clipboard');
    };

    const handleSaveResult = async (content: string) => {
        // TODO: Implement save to library functionality
        onShowToast('✓ Saved to library (feature coming soon)');
    };

    const handleRetry = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        // Find the prompt that was used for this execution
        const messageIndex = messages.findIndex(m => m.id === messageId);
        const previousMessages = messages.slice(0, messageIndex);
        const lastMetaHelper = previousMessages.reverse().find(m => m.msgType === 'meta_helper' && m.content.includes('FINAL PROMPT:'));

        if (lastMetaHelper) {
            await handleRunPrompt(lastMetaHelper.id, lastMetaHelper.content);
        } else {
            onShowToast('Cannot find original prompt to retry');
        }
    };

    const handleRegenerate = async (messageId: string) => {
        const index = messages.findIndex(m => m.id === messageId);
        if (index === -1) return;
        const message = messages[index];
        if (message.role === 'model') {
            const prevUserMsg = messages[index - 1];
            if (prevUserMsg && prevUserMsg.role === 'user') {
                onShowToast('Regenerating response...');
                await processMessage(prevUserMsg.content);
            }
        }
    };

    const handleRate = (messageId: string, isPositive: boolean) => {
        onShowToast(isPositive ? 'Thanks for the feedback! 👍' : 'Thanks! We will improve. 👎');
    };

    const handleEdit = (messageId: string) => {
        onShowToast('Edit feature coming soon! ✏️');
    };

    // Talk to Source handlers
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            onShowToast('Please upload a PDF file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            onShowToast('File too large. Max 10MB.');
            return;
        }

        onShowToast('Processing PDF...');

        try {
            // Read file as text (basic extraction - in production you'd use a proper PDF parser)
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target?.result as string;
                // For now, we'll pass the file name and let the user describe what they uploaded
                setUploadedSource(`PDF: ${file.name}`);
                setInput(`I've uploaded a PDF document: "${file.name}". `);
                onShowToast(`✓ PDF "${file.name}" ready for analysis`);
            };
            reader.readAsText(file);
        } catch (err) {
            onShowToast('Failed to process PDF. Try again.');
        }
    };

    const handleYouTubeSubmit = async () => {
        if (!youtubeUrl.trim()) return;

        // Basic YouTube URL validation
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
        if (!youtubeRegex.test(youtubeUrl)) {
            onShowToast('Please enter a valid YouTube URL');
            return;
        }

        setUploadedSource(`YouTube: ${youtubeUrl}`);
        setInput(`I want to analyze this YouTube video: ${youtubeUrl}\n\n`);
        setShowYouTubeInput(false);
        setYoutubeUrl('');
        onShowToast('✓ YouTube video ready for analysis');
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
            <header className="h-[64px] flex-shrink-0 flex items-center px-6 z-20">
                <div className="flex-1 flex items-center">
                    {/* Left side spacer/reserve */}
                </div>

                <div className="flex-shrink-0">
                    <ModeSelector currentMode={currentMode} onSelectMode={onSelectMode} />
                </div>

                <div className="flex-1 flex items-center justify-end gap-4">
                    <div
                        onClick={onUpgrade}
                        className="flex items-center gap-3 bg-[#1E1F20] hover:bg-[#2A2B2C] border border-dark-800 rounded-full pl-3 pr-4 py-1.5 transition-all cursor-pointer group"
                    >
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-xs font-medium text-gray-300">
                            {isDev ? 'Unlimited Credits' : `${credits} Credits`}
                        </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-xs font-bold ring-2 ring-dark-700 hover:ring-brand-500/50 transition-all cursor-pointer">
                        {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-6">

                    {messages.length === 1 && wizardStage === 'IDLE' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto pt-20 pb-12">

                            {/* Title & Description */}
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                {MODE_CONFIGS[currentMode].title}
                            </h1>
                            <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-lg">
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
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            onOptionSelect={handleOptionSelect}
                            onRunPrompt={handleRunPrompt}
                            onShorten={handleShorten}
                            onElaborate={handleElaborate}
                            onFormalize={handleFormalize}
                            onCopyResult={handleCopyResult}
                            onSaveResult={handleSaveResult}
                            onRetry={handleRetry}
                            onRegenerate={handleRegenerate}
                            onRate={handleRate}
                            onEdit={handleEdit}
                            isRunning={isRunningExecution}
                        />
                    ))}

                    {showQuickActions && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex flex-col gap-2 mb-2">
                                <span className="text-sm text-gray-400 ml-1">
                                    {currentMode === AppMode.VIBE_CODE ? "What do you want to do?" :
                                        currentMode === AppMode.MEDIA_GEN ? "What type of media?" :
                                            currentMode === AppMode.TALK_TO_SOURCE ? "How should I analyze this?" :
                                                "Refine your request:"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {getGoalOptionsForMode(currentMode).map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleGoalSelect(opt)}
                                        className={cn(
                                            "flex flex-col items-start gap-2 p-3 bg-dark-900/50 hover:bg-dark-800 border border-dark-800 rounded-[20px] transition-all text-left group",
                                            currentMode === AppMode.VIBE_CODE ? "hover:border-purple-500/30" :
                                                currentMode === AppMode.MEDIA_GEN ? "hover:border-pink-500/30" :
                                                    currentMode === AppMode.TALK_TO_SOURCE ? "hover:border-orange-500/30" :
                                                        "hover:border-blue-500/30"
                                        )}
                                    >
                                        <span className={cn(
                                            "transition-colors p-1.5 rounded-lg",
                                            currentMode === AppMode.VIBE_CODE ? "text-purple-400 group-hover:text-purple-300 bg-purple-500/10" :
                                                currentMode === AppMode.MEDIA_GEN ? "text-pink-400 group-hover:text-pink-300 bg-pink-500/10" :
                                                    currentMode === AppMode.TALK_TO_SOURCE ? "text-orange-400 group-hover:text-orange-300 bg-orange-500/10" :
                                                        "text-blue-400 group-hover:text-blue-300 bg-blue-500/10"
                                        )}>
                                            {opt.icon}
                                        </span>
                                        <span className="font-medium text-gray-200 text-xs">{opt.label}</span>
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
                    {/* Talk to Source - Source Input Buttons */}
                    {currentMode === AppMode.TALK_TO_SOURCE && wizardStage === 'IDLE' && messages.length === 1 && (
                        <div className="mb-4 flex items-center gap-3">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfUpload}
                                className="hidden"
                            />

                            {/* Upload PDF Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-xl text-orange-400 hover:text-orange-300 transition-all text-sm font-medium"
                            >
                                <Upload size={18} />
                                <span>Upload PDF</span>
                            </button>

                            {/* YouTube URL Button/Input */}
                            {!showYouTubeInput ? (
                                <button
                                    onClick={() => setShowYouTubeInput(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-red-400 hover:text-red-300 transition-all text-sm font-medium"
                                >
                                    <Youtube size={18} />
                                    <span>YouTube URL</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleYouTubeSubmit()}
                                        placeholder="Paste YouTube URL..."
                                        className="flex-1 px-4 py-2.5 bg-dark-800 border border-red-500/30 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50 text-sm"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleYouTubeSubmit}
                                        disabled={!youtubeUrl.trim()}
                                        className="px-4 py-2.5 bg-red-500 hover:bg-red-400 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-all"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => { setShowYouTubeInput(false); setYoutubeUrl(''); }}
                                        className="p-2.5 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Uploaded Source Indicator */}
                            {uploadedSource && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs">
                                    <span>✓ {uploadedSource}</span>
                                    <button
                                        onClick={() => setUploadedSource(null)}
                                        className="hover:text-green-300"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={cn(
                        "flex items-center bg-[#1E1F20] rounded-[28px] transition-all duration-200 border border-transparent focus-within:border-dark-700 shadow-2xl overflow-hidden pr-2 py-2",
                        "focus-within:bg-[#1E1F20]"
                    )}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                currentMode === AppMode.TALK_TO_SOURCE && wizardStage === 'IDLE'
                                    ? "Paste content or describe what you uploaded..."
                                    : wizardStage === 'IDLE' ? "Enter a prompt here" :
                                        wizardStage === 'CLARIFYING' ? "Answer the questions..." :
                                            "Reply to Gemini..."
                            }
                            className="flex-1 bg-transparent text-[#E3E3E3] placeholder-[#8E918F] px-6 py-3 focus:outline-none resize-none min-h-[56px] max-h-[200px] overflow-y-auto leading-relaxed text-[15px]"
                            rows={1}
                        />

                        {/* Send Button */}
                        <div className="flex-shrink-0">
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
