import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message, AppMode, ChatSession } from '../types';
import { supabase } from '../lib/supabase';
import { MessageActionBar } from './MessageActionBar';
import { MessageBubble } from './MessageBubble';
import { Search, Send, Mic, Sparkles, ChevronRight, Minimize2, Maximize2, Briefcase, Coffee, List, FileText, Plus, ChevronDown, LayoutGrid, Clock, Upload, Link, Image, Video, Music, Code, Zap, Bug, Palette, Type, MessageSquare, Youtube, AlertCircle } from 'lucide-react';
import { ArtifactPreview } from './ArtifactPreview';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateModeCost, hasExceededTrialLimit, getTrialLimitMessage } from '../config/pricing';

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
    userProfile?: any;
}

type WizardStage = 'IDLE' | 'GOAL_SELECTION' | 'CLARIFYING' | 'GENERATING';

interface GoalOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    promptSuffix: string;
}

// Mode-specific goal options
const EVERYDAY_GOALS_PRIMARY: GoalOption[] = [
    { id: 'enhance', label: 'Enhance', icon: <Sparkles size={16} />, promptSuffix: "Enhance this with more details, clarity, and impact." },
    { id: 'formal', label: 'More Formal', icon: <Briefcase size={16} />, promptSuffix: "Rewrite this to be professional and formal." },
    { id: 'casual', label: 'More Casual', icon: <Coffee size={16} />, promptSuffix: "Rewrite this to be casual and friendly." },
];

const EVERYDAY_GOALS_COMPLEX: GoalOption[] = [
    { id: 'explain', label: 'Explain this', icon: <FileText size={16} />, promptSuffix: "Explain this concept clearly and visually." },
    { id: 'shorten', label: 'Shorten', icon: <Minimize2 size={16} />, promptSuffix: "Shorten this text significantly while keeping key info." },
    { id: 'bulletize', label: 'Bulletize', icon: <List size={16} />, promptSuffix: "Convert this into a bulleted list." },
];

const VIBE_CODE_GOALS: GoalOption[] = [
    { id: 'build-app', label: 'Build App', icon: <Zap size={16} />, promptSuffix: "Build a first version of this app so I can see it. Focus on making it work." },
    { id: 'describe-plan', label: 'Describe Plan', icon: <FileText size={16} />, promptSuffix: "Explain the plan and list out everything this app will do. Do not write code yet." },
    { id: 'get-code', label: 'Get Instructions', icon: <Code size={16} />, promptSuffix: "Give me the final instructions so I can build the real version in a pro AI coding tool." },
];

const MEDIA_GEN_GOALS: GoalOption[] = [
    { id: 'image', label: 'Image', icon: <Image size={16} />, promptSuffix: "Generate an image prompt for Midjourney/DALL-E." },
    { id: 'video', label: 'Video', icon: <Video size={16} />, promptSuffix: "Generate a video prompt for Runway/Pika." },
    { id: 'music', label: 'Music', icon: <Music size={16} />, promptSuffix: "Generate a music prompt for Suno/Udio." },
];

const TALK_TO_SOURCE_GOALS: GoalOption[] = [
    { id: 'summarize', label: 'Summarize', icon: <FileText size={16} />, promptSuffix: "Summarize the key points of this content." },
    { id: 'explain', label: 'Explain', icon: <MessageSquare size={16} />, promptSuffix: "Explain the concepts in this content." },
    { id: 'compare', label: 'Compare', icon: <Code size={16} />, promptSuffix: "Compare different ideas or sections." },
    { id: 'qa', label: 'Q&A', icon: <MessageSquare size={16} />, promptSuffix: "Answer questions about this content." },
];

const getGoalOptionsForMode = (mode: AppMode, draftPrompt: string = ''): GoalOption[] => {
    switch (mode) {
        case AppMode.VIBE_CODE:
            return VIBE_CODE_GOALS;
        case AppMode.MEDIA_GEN:
            return MEDIA_GEN_GOALS;
        case AppMode.TALK_TO_SOURCE:
            return TALK_TO_SOURCE_GOALS;
        case AppMode.EVERYDAY:
        default:
            // Heuristic: If prompt is long (>100 chars) or has newlines, assume pasted content -> Show more options
            const isComplex = draftPrompt.length > 100 || draftPrompt.includes('\n');
            return isComplex ? [...EVERYDAY_GOALS_PRIMARY, ...EVERYDAY_GOALS_COMPLEX] : EVERYDAY_GOALS_PRIMARY;
    }
};


import { ModeSelector } from './ModeSelector';
import { useCredits } from '../hooks/useCredits';
import { usePredictiveText } from '../hooks/usePredictiveText';
import { FuelTankModal } from './FuelTankModal';
import { CREDIT_COSTS } from '../config/pricing';

export const Workspace: React.FC<WorkspaceProps> = ({ currentMode, session, credits, onShowToast, onUpgrade, wizardMode, defaultModel, onSelectMode, activeChatId, onLoadChat, userProfile }) => {
    const navigate = useNavigate();
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
    const [activeArtifact, setActiveArtifact] = useState<{ content: string; title?: string } | null>(null);
    const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showFuelModal, setShowFuelModal] = useState(false);
    const { checkCredits, refillCredits, isRefilling } = useCredits(userProfile, () => {
        // Simple reload to refresh profile state for now
        window.location.reload();
    });

    // Predictive Text
    const prediction = usePredictiveText(currentMode, input);

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

        // First, get the chat to get its mode
        const { data: chatData, error: chatError } = await supabase
            .from('chats')
            .select('mode')
            .eq('id', activeChatId)
            .single();

        const chatMode = chatData?.mode as AppMode || currentMode;

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
                mode: chatMode, // Use the chat's mode for all messages
                status: m.status as any,
                msgType: m.msg_type as any,
                executionModel: m.execution_model,
                metadata: m.metadata
            }));

            // Auto-detect stuck messages (processing for > 2 minutes)
            const stuckMessages = mappedMessages.filter(m => {
                if (m.status !== 'processing') return false;
                const startTime = m.metadata?.startTime;
                return startTime && (Date.now() - startTime > 2 * 60 * 1000);
            });

            if (stuckMessages.length > 0) {
                onShowToast(`⚠️ ${stuckMessages.length} message(s) appear stuck. Click "Retry" to recover.`);
            }

            // Add system message at top if needed, or just replace
            setMessages([{ id: '0', role: 'system', content: '', timestamp: 0, mode: currentMode }, ...mappedMessages]);
            setLoadedChatId(activeChatId);
            // Only reset wizard for existing chats if not currently in a transition
            setWizardStage(prev => prev === 'IDLE' ? 'IDLE' : prev);
        }
    }, [activeChatId, currentMode, onShowToast]);

    useEffect(() => {
        setActiveArtifact(null);
        if (activeChatId) {
            loadHistory();
        } else {
            // New Session
            setMessages([{ id: '0', role: 'system', content: '', timestamp: Date.now(), mode: currentMode }]);
            setWizardStage('IDLE');
            setLoadedChatId(null);
            // Don't clear input here, as it causes clearing on re-renders (e.g. mode switch or toast)
        }
    }, [activeChatId, loadHistory]);

    // Clear input only when switching chats
    useEffect(() => {
        setInput('');
    }, [activeChatId]);

    // Message Real-time Subscription (to catch Background Builder updates)
    useEffect(() => {
        if (!activeChatId) return;

        const channel = supabase
            .channel(`chat-messages-${activeChatId}-${session.user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${activeChatId}`
            }, async (payload) => {
                // Get the chat's mode for new messages
                const { data: chatData } = await supabase
                    .from('chats')
                    .select('mode')
                    .eq('id', activeChatId)
                    .single();
                const chatMode = chatData?.mode as AppMode || currentMode;

                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new;
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, {
                            id: newMsg.id,
                            role: newMsg.role,
                            content: newMsg.content,
                            timestamp: new Date(newMsg.created_at).getTime(),
                            mode: chatMode,
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
                        msgType: updatedMsg.msg_type,
                        executionModel: updatedMsg.execution_model,
                        metadata: updatedMsg.metadata
                    } : m));
                }
            })
            .subscribe((status) => {
                if (import.meta.env.DEV || localStorage.getItem('debug_mode') === 'true') {
                    console.log(`[Realtime] Subscription status for chat ${activeChatId}:`, status);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChatId, currentMode]);

    // Polling fallback for processing messages (in case Realtime is slow/unavailable)
    useEffect(() => {
        if (!activeChatId) return;

        // Check if we have any processing messages
        const hasProcessingMessages = messages.some(m => m.status === 'processing');
        if (!hasProcessingMessages) return;

        // Poll every 3 seconds while we have processing messages
        const pollInterval = setInterval(async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', activeChatId)
                .in('status', ['processing', 'completed', 'failed'])
                .order('created_at', { ascending: false })
                .limit(10);

            if (data && data.length > 0) {
                // Check if any previously processing messages are now completed/failed
                const updatedMessages = data.filter(dbMsg => {
                    const localMsg = messages.find(m => m.id === dbMsg.id);
                    return localMsg && localMsg.status === 'processing' && dbMsg.status !== 'processing';
                });

                if (updatedMessages.length > 0) {
                    console.log('[Polling] Found completed messages:', updatedMessages.map(m => m.id));
                    // Update the local state with the completed messages
                    setMessages(prev => prev.map(m => {
                        const updated = updatedMessages.find(u => u.id === m.id);
                        if (updated) {
                            return {
                                ...m,
                                content: updated.content,
                                status: updated.status,
                                msgType: updated.msg_type,
                                executionModel: updated.execution_model,
                                metadata: updated.metadata
                            };
                        }
                        return m;
                    }));
                }
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [activeChatId, messages]);

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
            const channelName = `workspace-recents-${session.user.id}`;
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

    // Check if user can use premium mode (trial limit check)
    const checkPremiumModeAccess = useCallback((): { canAccess: boolean; message: string | null } => {
        const subscriptionStatus = userProfile?.subscription_status || 'free';

        // Subscribers have unlimited access
        if (subscriptionStatus !== 'free') {
            return { canAccess: true, message: null };
        }

        // Check trial limits for premium modes
        const monthlyUsage = {
            vibeCode: userProfile?.vibe_code_uses_monthly || 0,
            talkToSource: userProfile?.talk_to_source_uses_monthly || 0,
            mediaGen: userProfile?.media_gen_uses_monthly || 0,
        };

        const check = hasExceededTrialLimit(currentMode, subscriptionStatus, monthlyUsage);

        if (check.exceeded) {
            return {
                canAccess: false,
                message: `You've used all ${check.limit} free uses of ${currentMode} this month. Upgrade to Lite for unlimited access.`
            };
        }

        // Show warning if close to limit
        if (check.remaining <= 2 && check.remaining > 0) {
            return {
                canAccess: true,
                message: `⚠️ Only ${check.remaining} free ${currentMode} uses remaining this month.`
            };
        }

        return { canAccess: true, message: null };
    }, [currentMode, userProfile]);

    const handleInitialSubmit = async () => {
        if (!input.trim()) return;

        // FUEL TANK: Check credits before proceeding
        // Determine cost based on mode
        let cost = CREDIT_COSTS.chatMessage;
        if (currentMode === AppMode.VIBE_CODE) cost = CREDIT_COSTS.appBuildPrototype; // 50
        // (Add other mode costs as needed)

        if (!checkCredits(cost)) {
            setShowFuelModal(true);
            return;
        }

        // Check premium mode access before proceeding (Legacy/Additional check)
        const accessCheck = checkPremiumModeAccess();
        if (!accessCheck.canAccess) {
            onShowToast(accessCheck.message!, 'Upgrade', onUpgrade);
            return;
        }

        if (accessCheck.message) {
            onShowToast(accessCheck.message);
        }

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

        // Save to DB immediately - Realtime subscription will add it to state
        if (chatId) {
            await supabase.from('messages').insert({
                chat_id: chatId,
                role: 'user',
                content: input
            });
        }

        setInput('');
        // REMOVED: setWizardStage('GOAL_SELECTION'); -> Default to Standard Chat (IDLE)
        // Only set to GOAL_SELECTION if explicitly in a mode that REQUIREs it or if user clicked "Enhance"
        if (currentMode !== AppMode.EVERYDAY) {
            // For specific modes like Vibe Code, we might still want to start the wizard?
            // The user request says "User lands on App: It looks like a normal chatbot."
            // So even for Vibe Code, maybe we start with chat and let them "Enhance" into the wizard?
            // Let's stick to the request: "The AI attempts to answer immediately."
            // So we stay in IDLE.
        }

        // Trigger AI Response
        if (chatId) {
            await processMessage(input, false, chatId);
        }
    };

    const handleEnhanceClick = () => {
        if (!input.trim()) return;
        setDraftPrompt(input);
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

        // Save to DB - Realtime subscription will add it to state
        await saveMessage({ id: '', role: 'user', content: answer, timestamp: Date.now(), mode: currentMode });
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

    const processMessage = async (content: string, isHiddenInstruction = false, chatIdOverride?: string) => {
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        const targetChatId = chatIdOverride || activeChatId;

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

        // Use background processing for ALL modes to avoid Netlify 10s timeout
        // The /api/chat-background endpoint handles the request asynchronously and updates via Supabase Realtime
        const useBackgroundChat = true;

        // Prepare messages for chat API (truncate large execution results to avoid payload limits)
        const chatMessages = tempMessages.map(m => {
            if (m.msgType === 'execution_result' && m.content.length > 5000) {
                return {
                    ...m,
                    content: m.content.substring(0, 5000) + "\n...[Content Truncated for Chat Context]..."
                };
            }
            return m;
        });

        try {
            // Always use background chat to prevent 504 timeouts
            if (targetChatId) {
                // 1. Insert placeholder message and get its ID
                const { data: placeholderMsg, error: insertError } = await supabase
                    .from('messages')
                    .insert({
                        chat_id: targetChatId,
                        role: 'model',
                        content: '⚙️ **Processing...**',
                        status: 'processing'
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error("Failed to insert placeholder:", insertError);
                    throw new Error("Failed to initialize response.");
                }

                // 2. Route to background function for heavy processing
                const response = await fetch('/api/chat-background', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    signal: abortControllerRef.current?.signal,
                    body: JSON.stringify({
                        input: content,
                        chatId: targetChatId,
                        // userId: session.user.id, // REMOVED: Now inferred from token on backend
                        messageId: placeholderMsg.id,
                        conversationHistory: chatMessages.filter(m => m.role !== 'system').map(m => ({
                            role: m.role,
                            content: m.content
                        })),
                        mode: currentMode,
                        wizardMode,
                        wizardStage
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Background Chat Error Details:", errorData);
                    throw new Error(errorData.error || `Chat error: ${response.status} ${response.statusText}`);
                }

                // Background function returns 202 - UI will update via Realtime subscription
                // Removed toast for better UX as requested
                // onShowToast('📚 Processing request...');
                setTimeout(() => loadHistory(), 1000);

            } else {
                // Fallback for when no chat ID exists (shouldn't happen in current flow as we create chat ID first)
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    signal: abortControllerRef.current?.signal,
                    body: JSON.stringify({
                        messages: chatMessages,
                        input: isHiddenInstruction ? content : content,
                        mode: currentMode,
                        // userId: session.user.id, // REMOVED: Now inferred from token on backend
                        chatId: targetChatId,
                        wizardMode,
                        wizardStage,
                        defaultModel: defaultModel || 'claude-sonnet-4.5'
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Evaluation Error Details:", errorData);
                    throw new Error(errorData.error || `Chat error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();

                // Save Model Response to DB first - Realtime subscription will add it to state
                if (targetChatId) {
                    await supabase.from('messages').insert({
                        chat_id: targetChatId,
                        role: 'model',
                        content: data.text,
                        msg_type: data.msgType || 'meta_helper'
                    });
                }

                // Auto-detect finish
                if (data.text.includes('FINAL PROMPT:')) {
                    setWizardStage('IDLE');
                }
            }

        } catch (err: any) {
            console.error(err);
            const isForbidden = err.message?.includes('Access Denied') || err.message?.includes('restricted');
            const isOverage = err.message?.includes('Insufficient credits') || err.message?.includes('Standard Rate');

            if (isForbidden || isOverage) {
                onShowToast(err.message || 'Upgrade to unlock.', 'Upgrade', onUpgrade);
            } else {
                onShowToast('Error. Check credits.', 'Upgrade', onUpgrade);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            setIsRunningExecution(false);
            onShowToast('Stopped.');
        }
    };

    const handleEnhance = (content: string) => {
        // Switch to Everyday Mode (Refiner) and start Wizard
        if (currentMode !== AppMode.EVERYDAY) {
            onSelectMode(AppMode.EVERYDAY);
        }
        setDraftPrompt(content);
        setWizardStage('GOAL_SELECTION');
    };

    const handleSendToFactory = (content: string) => {
        // Navigate to factory with state
        const hostname = window.location.hostname;
        const isAppSubdomain = hostname.startsWith('app.');
        const prefix = isAppSubdomain ? '' : '/app';

        navigate(`${prefix}/factory`, { state: { initialPrompt: content } });
        onShowToast("Opening Factory...", "View", () => { });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && prediction) {
            e.preventDefault();
            setInput(prediction.text);
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (wizardStage === 'IDLE') handleInitialSubmit();
            else if (wizardStage === 'CLARIFYING') handleClarificationAnswer();
            else if (!isLoading) {
                const val = input;
                setInput('');
                // Save to DB - Realtime subscription will add it to state
                saveMessage({ id: '', role: 'user', content: val, timestamp: Date.now(), mode: currentMode });
                processMessage(val);
            }
        }
    };
    const handleOptionSelect = (option: string) => {
        if (isLoading) return;
        const processedOption = option.replace(/^\d+\.\s*/, ''); // Remove numbering if present

        // Detect Model Selection in Media Gen Mode
        if (currentMode === AppMode.MEDIA_GEN) {
            const MODEL_MAPPING: Record<string, string> = {
                'Nano Banana': 'nano-banana',
                'Flux': 'flux',
                'Flux 2': 'flux', // Map to flux for now, handled in backend
                'ChatGPT 5': 'chatgpt-5',
                'Gemini': 'gemini',
                'Pollinations': 'pollinations',
                'Default': 'nano-banana'
            };

            const modelKey = Object.keys(MODEL_MAPPING).find(key => processedOption.includes(key));
            if (modelKey) {
                setSelectedModel(MODEL_MAPPING[modelKey]);
            }
        }

        // Detect if this is a "Build App" click in Vibe Code mode
        if (currentMode === AppMode.VIBE_CODE && (processedOption.includes('Build App') || processedOption === 'build-app')) {
            // Trigger background builder instead of sync chat to avoid timeouts
            const msgId = Date.now().toString();
            // Save to DB - Realtime subscription will add it to state
            saveMessage({ id: msgId, role: 'user', content: processedOption, timestamp: Date.now(), mode: currentMode });
            handleRunPrompt(msgId, processedOption);
            return;
        }

        // Detect "Get Instructions" for consistency
        if (currentMode === AppMode.VIBE_CODE && (processedOption.includes('Get Instructions') || processedOption === 'get-code')) {
            // Save to DB - Realtime subscription will add it to state
            saveMessage({ id: '', role: 'user', content: processedOption, timestamp: Date.now(), mode: currentMode });
            processMessage(processedOption);
            return;
        }

        // If we answer a clarifying question via quick action, handle it as an answer
        if (wizardStage === 'CLARIFYING') {
            setInput('');
            // We need to wait a tick or call a modified handler because handleClarificationAnswer uses 'input' state
            // But since setState is async, we can just call the logic directly:
            // Save to DB - Realtime subscription will add it to state
            saveMessage({ id: '', role: 'user', content: processedOption, timestamp: Date.now(), mode: currentMode });

            if (wizardMode === 'batch') setWizardStage('GENERATING');

            processMessage(processedOption);
        } else {
            // Fallback for normal inputs
            setInput('');
            // Save to DB - Realtime subscription will add it to state
            saveMessage({ id: '', role: 'user', content: processedOption, timestamp: Date.now(), mode: currentMode });
            processMessage(processedOption);
        }
    };

    const handleOpenPreview = useCallback((content: string, title?: string) => {
        setActiveArtifact({ content, title });
    }, []);

    const handleClosePreview = () => {
        setActiveArtifact(null);
    };

    // ... (rest of component)

    // Only show Quick Actions Grid for the INITIAL prompt (Liquid Actions)
    const showQuickActions = wizardStage === 'GOAL_SELECTION' && messages.length < 3;


    // Dual-Lane Action Handlers
    const handleRunPrompt = async (messageId: string, content: string) => {
        // Safety check: Ensure we are acting on the correct chat context
        if (activeChatId && loadedChatId !== activeChatId) {
            console.warn("Attempted to run prompt while chat was switching. Ignoring.");
            return;
        }

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
        onShowToast('🚀 Initializing...');
        abortControllerRef.current = new AbortController();

        try {
            // Get full conversation history for context
            const executionHistory = messages
                .filter(m => m.role !== 'system' && m.id !== '0' && !m.id.startsWith('hidden-'))
                .map(m => ({ role: m.role, content: m.content }));

            // Determine which background process to use based on mode
            const useBackgroundBuilder = currentMode === AppMode.VIBE_CODE;
            const useBackgroundMediaGen = currentMode === AppMode.MEDIA_GEN;

            // Use background execution for ALL modes to prevent timeouts (500 errors)
            const endpoint = useBackgroundBuilder ? '/api/builder-background' :
                useBackgroundMediaGen ? '/api/media-gen-background' :
                    '/api/execute-background';

            // Optimistic UI for Media Gen (to fix reload issue)
            let newMessageId: string | undefined;

            if (useBackgroundMediaGen && activeChatId) {
                newMessageId = crypto.randomUUID();
                const optimisticContent = '🎨 **Generating Media...**\n\nI am creating your visual content based on your optimized prompt. This may take a moment for high-quality results.\n\n*Please wait while I generate your media...*';

                // 1. Add to local state immediately
                const optimisticMsg: Message = {
                    id: newMessageId,
                    role: 'model',
                    content: optimisticContent,
                    timestamp: Date.now(),
                    mode: currentMode,
                    status: 'processing',
                    msgType: 'execution_result',
                    executionModel: selectedModel || defaultModel || 'google/gemini-3-pro-image-preview',
                    metadata: { startTime: Date.now() }
                };

                setMessages(prev => [...prev, optimisticMsg]);

                // 2. Insert into DB immediately (so background function can update it)
                await supabase.from('messages').insert({
                    id: newMessageId,
                    chat_id: activeChatId,
                    role: 'model',
                    content: optimisticContent,
                    status: 'processing',
                    msg_type: 'execution_result',
                    execution_model: optimisticMsg.executionModel,
                    metadata: optimisticMsg.metadata
                });
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current?.signal,
                body: JSON.stringify({
                    prompt: promptToRun,
                    userId: session.user.id,
                    chatId: activeChatId, // Required for background processes
                    conversationHistory: executionHistory,
                    model: selectedModel || defaultModel,
                    mode: currentMode,
                    messageId: newMessageId // Pass the ID if we generated one
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Execution failed');
            }

            // Always wait for Realtime update since we are using background processing now
            // We ONLY show toast for explicit "Run Prompt" actions (which this is)
            const toastMessage = useBackgroundBuilder
                ? '🏗️ Architect is building in the background...'
                : useBackgroundMediaGen
                    ? '🎨 Creating your media in the background...'
                    : '⚙️ Executing prompt in background...';

            onShowToast(toastMessage);

            // Force a refresh after a delay to ensure the "Processing" message is caught
            // Only needed if we didn't do optimistic UI
            if (!newMessageId) {
                setTimeout(() => {
                    loadHistory();
                }, 1000);
            }

        } catch (err: any) {
            console.error('Execution error:', err);
            const isForbidden = err.message?.includes('Access Denied') || err.message?.includes('restricted');

            if (isForbidden) {
                onShowToast(err.message, 'Upgrade', onUpgrade);
            } else {
                onShowToast('Execution failed. Check configuration.', 'Upgrade', onUpgrade);
            }
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

    // Recovery handler for stuck/failed messages
    const handleRecoverStuck = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        onShowToast('🔄 Attempting to recover...');

        // Find the last user message before this stuck message
        const messageIndex = messages.findIndex(m => m.id === messageId);
        const previousUserMsg = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');

        if (!previousUserMsg) {
            onShowToast('Cannot find original request to retry.');
            return;
        }

        // Mark the stuck message as failed in the database
        if (activeChatId) {
            await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        }

        // Update local state to remove the stuck message
        setMessages(prev => prev.filter(m => m.id !== messageId));

        // Retry the original request
        if (currentMode === AppMode.VIBE_CODE) {
            // For Vibe Code, use the background builder
            await handleRunPrompt(previousUserMsg.id, previousUserMsg.content);
        } else if (currentMode === AppMode.TALK_TO_SOURCE) {
            // For Talk to Source, use the background chat
            await processMessage(previousUserMsg.content);
        } else {
            // For other modes, use standard chat
            await processMessage(previousUserMsg.content);
        }
    };

    // Talk to Source handlers
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/rtf',
            'text/rtf'
        ];

        // Check extension as fallback for some mobile browsers/OS that might not report MIME type correctly
        const allowedExtensions = ['.pdf', '.txt', '.md', '.doc', '.docx', '.rtf'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            onShowToast('Invalid file type. Allowed: PDF, DOC, DOCX, MD, TXT, RTF');
            return;
        }

        // Tiered Limit Checks
        const subscriptionStatus = userProfile?.subscription_status || 'free';
        const totalPdfs = (userProfile?.total_pdfs_uploaded || 0);

        const tierLimits: Record<string, number> = {
            'free': 10,
            'lite': 30,
            'pro': 100
        };
        const tierLimit = tierLimits[subscriptionStatus] || 10;

        if (!isDev && totalPdfs >= tierLimit) {
            onShowToast(`You've reached your ${tierLimit} PDF limit. Manage your PDFs in the Dashboard.`, 'Dashboard');
            return;
        }

        // Per-Chat limit for Free users
        if (!isDev && subscriptionStatus === 'free') {
            const chatPdfs = messages.filter(m => m.role === 'user' && m.content.includes('uploaded a PDF document')).length;
            if (chatPdfs >= 3) {
                onShowToast('Free tier is limited to 3 PDFs per chat. Start a new chat to upload more.');
                return;
            }
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            onShowToast('File too large. Max 10MB.');
            return;
        }

        onShowToast('Processing file...');

        try {
            // Read file as text (basic extraction)
            const reader = new FileReader();
            reader.onload = async (event) => {
                let text = event.target?.result as string;

                // Basic sanitization to prevent script injection
                text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                    .replace(/javascript:/gi, "");

                // Track upload in database and update profile count (simulated update here)
                if (activeChatId) {
                    await supabase.from('documents').insert({
                        user_id: session.user.id,
                        title: file.name,
                        source_type: 'pdf', // Keeping 'pdf' as generic type for now or update DB enum
                        content: text.substring(0, 10000) // Truncate for now
                    });

                    // Update profile count
                    await supabase.from('profiles').update({
                        total_pdfs_uploaded: totalPdfs + 1
                    }).eq('id', session.user.id);
                }

                setUploadedSource(`File: ${file.name}`);
                setInput(`I've uploaded a document: "${file.name}". `);
                onShowToast(`✓ File "${file.name}" ready for analysis`);

                // If in active chat, automatically submit this as a message
                if (messages.length > 1) {
                    const msg = `I've uploaded a new document for analysis: "${file.name}"`;
                    await saveMessage({ id: '', role: 'user', content: msg, timestamp: Date.now(), mode: currentMode });
                    await processMessage(msg);
                }
            };
            reader.readAsText(file);
        } catch (err) {
            onShowToast('Failed to process file. Try again.');
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
        <div className="flex flex-row h-screen overflow-hidden relative" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-app)' }}>
            {/* Mode Selector - Floating or Top */}
            <div className={clsx(
                "absolute top-4 -translate-x-1/2 z-30 transition-all duration-300 w-full max-w-[90%] md:max-w-none md:w-auto flex justify-center",
                activeArtifact ? "left-1/4" : "left-1/2"
            )}>
                <ModeSelector
                    currentMode={currentMode}
                    onSelectMode={onSelectMode}
                    userProfile={userProfile}
                    isDev={isDev}
                />
            </div>

            {/* LEFT PANEL: Chat & Input */}
            <div className={clsx(
                "flex flex-col h-full transition-all duration-300 ease-in-out relative pt-16",
                activeArtifact ? "hidden md:flex w-1/2 border-r" : "w-full mx-auto"
            )} style={{ borderColor: 'var(--border-sidebar)' }}>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar">
                    <div className={clsx("mx-auto space-y-6", activeArtifact ? "max-w-2xl" : "max-w-4xl")}>

                        {messages.length === 1 && wizardStage === 'IDLE' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center pt-12 pb-12">
                                {/* Title & Description */}
                                <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: 'var(--text-app)' }}>
                                    {MODE_CONFIGS[currentMode].title}
                                </h1>
                                <p className="text-sm mb-4 leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-sidebar)' }}>
                                    {MODE_CONFIGS[currentMode].desc}
                                </p>

                                {/* Trial Limit Indicator for Free Users */}
                                {userProfile?.subscription_status === 'free' && (
                                    <div className="mb-6">
                                        {(() => {
                                            const monthlyUsage = {
                                                vibeCode: userProfile?.vibe_code_uses_monthly || 0,
                                                talkToSource: userProfile?.talk_to_source_uses_monthly || 0,
                                                mediaGen: userProfile?.media_gen_uses_monthly || 0,
                                            };
                                            const check = hasExceededTrialLimit(currentMode, 'free', monthlyUsage);
                                            const cost = calculateModeCost(currentMode, 'free');

                                            if (check.exceeded) {
                                                return (
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                                                        <AlertCircle size={16} />
                                                        <span>Trial limit reached ({check.limit}/{check.limit}). Upgrade for unlimited access.</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm border" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)', color: 'var(--text-sidebar)' }}>
                                                    <span>{check.remaining} free uses remaining</span>
                                                    <span style={{ color: 'var(--text-sidebar-dim)' }}>•</span>
                                                    <span>{cost} credits per use</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Recent Section */}
                                <div className="w-full max-w-md text-left mx-auto">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 ml-1" style={{ color: 'var(--text-sidebar-dim)' }}>Recent</h3>
                                    <div className="space-y-3">
                                        {(recentChats.length > 0 ? recentChats : []).map((chat, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => onLoadChat(chat.id)}
                                                className="flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer group"
                                                style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}
                                            >
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner", MODE_CONFIGS[currentMode].color)}>
                                                    {MODE_CONFIGS[currentMode].initial}
                                                </div>
                                                <span className="font-medium truncate flex-1" style={{ color: 'var(--text-sidebar)' }}>{chat.title}</span>
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
                                onRecoverStuck={handleRecoverStuck}
                                isRunning={isRunningExecution}
                                onOpenArtifact={handleOpenPreview}
                                onEnhance={msg.role === 'user' ? () => handleEnhance(msg.content) : undefined}
                                onSendToFactory={() => handleSendToFactory(msg.content)}
                            />
                        ))}

                        {showQuickActions && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex flex-col gap-2 mb-2">
                                    <span className="text-sm ml-1" style={{ color: 'var(--text-sidebar)' }}>
                                        {currentMode === AppMode.VIBE_CODE ? "What do you want to do?" :
                                            currentMode === AppMode.MEDIA_GEN ? "What type of media?" :
                                                currentMode === AppMode.TALK_TO_SOURCE ? "How should I analyze this?" :
                                                    "Refine your request:"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {getGoalOptionsForMode(currentMode, draftPrompt).map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleGoalSelect(opt)}
                                            className={cn(
                                                "flex flex-col items-start gap-2 p-3 border rounded-[20px] transition-all text-left group",
                                                // Dynamic glowing border for primary actions
                                                (opt.id === 'enhance' || opt.id === 'image' || opt.id === 'build-app') && "animate-glow border-brand-500/50"
                                            )}
                                            style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}
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
                                            <span className="font-medium text-xs" style={{ color: 'var(--text-app)' }}>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex items-center gap-3 animate-pulse" style={{ color: 'var(--text-sidebar)' }}>
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
                <div className="flex-shrink-0 p-6 border-t" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
                    <div className={clsx("mx-auto w-full", activeArtifact ? "max-w-2xl" : "max-w-4xl")}>
                        {/* Talk to Source - Source Input Buttons */}
                        {currentMode === AppMode.TALK_TO_SOURCE && (wizardStage === 'IDLE' || messages.length > 1) && (
                            <div className="mb-4 flex items-center gap-3">
                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".doc,.docx,.pdf,.md,.txt,.rtf"
                                    onChange={handlePdfUpload}
                                    className="hidden"
                                />

                                {/* Upload Source Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-xl text-orange-400 hover:text-orange-300 transition-all text-sm font-medium"
                                >
                                    <Upload size={18} />
                                    <span>Upload Source</span>
                                </button>

                                {/* YouTube URL Button/Input - REMOVED TEMPORARILY */}

                                {/* Uploaded Source Indicator */}
                                {uploadedSource && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-xs">
                                        <span>✓ {uploadedSource}</span>
                                        <button
                                            onClick={() => setUploadedSource(null)}
                                            className="hover:text-green-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={cn(
                            "flex items-center rounded-[28px] transition-all duration-200 border border-transparent shadow-2xl overflow-hidden pr-2 py-2 relative"
                        )} style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-sidebar)' }}>

                            {/* Ghost Text Overlay */}
                            <div className="absolute inset-0 px-6 py-3 pointer-events-none text-[15px] leading-relaxed font-sans" aria-hidden="true">
                                <span className="text-transparent whitespace-pre-wrap">{input}</span>
                                {prediction && (
                                    <span className={prediction.isEnhancement ? "text-brand-400 opacity-60" : "text-gray-500 opacity-40"}>
                                        {prediction.remainder || (prediction.isEnhancement ? `  (Tab to enhance)` : "")}
                                    </span>
                                )}
                            </div>

                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    currentMode === AppMode.TALK_TO_SOURCE && wizardStage === 'IDLE'
                                        ? "Paste content or describe what you uploaded..."
                                        : wizardStage === 'IDLE' ? "Enter a prompt..." :
                                            wizardStage === 'CLARIFYING' ? "Answer the questions..." :
                                                "Reply to Gemini..."
                                }
                                className="flex-1 bg-transparent px-6 py-3 focus:outline-none resize-none min-h-[56px] max-h-[200px] overflow-y-auto leading-relaxed text-[15px]"
                                style={{ color: 'var(--text-app)' }}
                                rows={1}
                            />

                            {/* Send Button */}
                            <div className="flex-shrink-0">
                                {isLoading || isRunningExecution ? (
                                    <button
                                        onClick={handleStop}
                                        className="p-2.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all duration-200"
                                        title="Stop Generation"
                                    >
                                        <div className="w-4 h-4 bg-current rounded-sm" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (wizardStage === 'IDLE') handleInitialSubmit();
                                            else if (wizardStage === 'CLARIFYING') handleClarificationAnswer();
                                            else {
                                                const val = input;
                                                setInput('');
                                                // Save to DB - Realtime subscription will add it to state
                                                saveMessage({ id: '', role: 'user', content: val, timestamp: Date.now(), mode: currentMode });
                                                processMessage(val);
                                            }
                                        }}
                                        disabled={!input.trim() || isLoading}
                                        className={cn(
                                            "p-2.5 rounded-full transition-all duration-200",
                                            input.trim()
                                                ? "bg-brand-500 text-white hover:bg-brand-600 shadow-lg"
                                                : "bg-transparent text-gray-400 cursor-not-allowed"
                                        )}
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Enhance Button (Separate from Send) */}
                            {wizardStage === 'IDLE' && input.trim() && !isLoading && !isRunningExecution && (
                                <div className="flex-shrink-0 ml-1">
                                    <button
                                        onClick={handleEnhanceClick}
                                        className="p-2.5 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all duration-200"
                                        title="Enhance with Wizard"
                                    >
                                        <Sparkles size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="text-center mt-3 text-xs font-medium" style={{ color: 'var(--text-sidebar-dim)' }}>
                            PromptOrigin can make mistakes. Consider checking important information.
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Artifact Preview (Split View) */}
            {activeArtifact && (
                <div
                    className="w-full md:w-1/2 h-full border-l flex flex-col animate-in fade-in slide-in-from-right duration-300 shadow-2xl z-40 absolute md:relative inset-0 md:inset-auto"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-sidebar)' }}
                >
                    <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
                        <span className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-app)' }}>
                            <Sparkles size={14} className="text-purple-400" />
                            {activeArtifact.title || 'Application Preview'}
                        </span>
                        <button
                            onClick={handleClosePreview}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-sidebar)', backgroundColor: 'transparent' }}
                            title="Close Preview"
                        >
                            <Minimize2 size={16} className="hidden md:block" />
                            <span className="md:hidden text-sm font-medium px-2">Close</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ArtifactPreview content={activeArtifact.content} />
                    </div>
                </div>
            )}

            {/* Fuel Tank Modal */}
            <FuelTankModal
                isOpen={showFuelModal}
                onClose={() => setShowFuelModal(false)}
                onRefill={async (data) => { await refillCredits(data); }}
                isRefilling={isRefilling}
            />
        </div>
    );
};
