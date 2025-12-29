import React, { useState, useEffect, useRef } from 'react';
console.log("🚀 PromptCore Frontend Version: 1.0.4 - NUCLEAR FETCH");
import { Sidebar } from './components/Sidebar';
import { ModeSelector } from './components/ModeSelector';
import { MessageBubble } from './components/MessageBubble';
import { Toast } from './components/Toast';
import { PromptFactory } from './components/PromptFactory';
import { Dashboard } from './components/Dashboard';
import { UpgradePage } from './components/UpgradePage';
import { Legal } from './components/Legal';
import { AppMode, AppView, Message } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { Send, Paperclip, Mic, Youtube, Coins } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

import { createClient, Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentView, setCurrentView] = useState<AppView>('workspace');
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.EVERYDAY);
  const [credits, setCredits] = useState(0);
  const [upgradeFocus, setUpgradeFocus] = useState<'subscriptions' | 'credits'>('subscriptions');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to PromptCore. Select a mode to begin.',
      timestamp: Date.now(),
      mode: AppMode.EVERYDAY
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', actionLabel: '', action: () => { } });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth & Profile Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      // Listen for profile changes (like credit updates)
      const profileSubscription = supabase
        .channel('profile-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`
        }, (payload) => {
          setProfile(payload.new);
          setCredits(payload.new.credits);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(profileSubscription);
      };
    }
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user) return;
    console.log("☢️ Fetching profile with ARRAY SELECT (Nuclear)...");
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id);

    if (data && data.length > 0) {
      setProfile(data[0]);
      setCredits(data[0].credits);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentView === 'workspace') {
      scrollToBottom();
    }
  }, [messages, currentView]);

  if (!session) {
    return <Auth />;
  }

  // Passive Analysis: Check for YouTube links
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Simple regex for YT link
    if (currentMode !== AppMode.TALK_TO_SOURCE && (val.includes('youtube.com/watch') || val.includes('youtu.be/'))) {
      if (!toast.visible) {
        setToast({
          visible: true,
          message: 'Video link detected. Switch to "Talk to Source" mode to analyze it?',
          actionLabel: 'Switch Mode',
          action: () => {
            setCurrentMode(AppMode.TALK_TO_SOURCE);
            setToast(prev => ({ ...prev, visible: false }));
          }
        });
      }
    }
  };

  const handleSidebarNavigate = (view: AppView) => {
    if (view === 'upgrade') {
      setUpgradeFocus('subscriptions');
    }
    setCurrentView(view);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      mode: currentMode
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          input: userMsg.content,
          mode: currentMode,
          userId: session.user.id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Chat error');
      }

      const data = await response.json();



      const modelMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: data.text,
        timestamp: Date.now(),
        mode: currentMode
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
      setToast({
        visible: true,
        message: 'Error sending message. Check credits?',
        actionLabel: 'Upgrade',
        action: () => setCurrentView('upgrade')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseToast = React.useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderPlaceholder = () => {
    if (messages.length > 1) return null;

    let title = "How can I help you today?";
    let subtitle = "I can draft emails, write code, or generate creative ideas.";

    if (currentMode === AppMode.VIBE_CODE) {
      title = "Let's refine your code.";
      subtitle = "Paste a snippet or describe the functionality you need.";
    } else if (currentMode === AppMode.MEDIA_GEN) {
      title = "What shall we create?";
      subtitle = "Describe an image or song, and I'll generate the prompt.";
    } else if (currentMode === AppMode.TALK_TO_SOURCE) {
      title = "Add a source to begin.";
      subtitle = "Paste a YouTube link or upload a PDF to chat with it.";
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-50 pointer-events-none">
        <h2 className="text-3xl font-bold text-gray-200 mb-4">{title}</h2>
        <p className="text-gray-400 max-w-md">{subtitle}</p>
      </div>
    );
  };

  // Render content based on active View
  const renderContent = () => {
    if (currentView === 'factory') {
      return <PromptFactory />;
    }

    if (currentView === 'dashboard') {
      return <Dashboard />;
    }

    if (currentView === 'upgrade') {
      return <UpgradePage focusSection={upgradeFocus} />;
    }

    if (currentView === 'legal') {
      return <Legal onBack={() => setCurrentView('workspace')} />;
    }

    // Default: Workspace Chat
    return (
      <div className="flex flex-col h-full relative">
        {/* Header */}
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-b border-dark-800 bg-dark-950/80 backdrop-blur z-10">
          <div className="flex items-center gap-4 w-full justify-between">
            <div className="flex-1 flex justify-center md:justify-start">
              <ModeSelector currentMode={currentMode} onSelectMode={setCurrentMode} />
            </div>

            <div
              onClick={() => {
                setUpgradeFocus('credits');
                setCurrentView('upgrade');
              }}
              className="hidden md:flex items-center gap-2 bg-dark-900 border border-dark-800 rounded-lg px-3 py-1.5 shadow-sm hover:border-brand-500/50 hover:bg-dark-800 transition-all cursor-pointer group"
              title="Get more credits"
            >
              <Coins size={14} className="text-brand-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-gray-200">{credits}</span>
              <span className="text-xs text-gray-500 font-medium group-hover:text-brand-400">Credits</span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto relative p-4 md:p-8 scroll-smooth">
          {renderPlaceholder()}

          <div className="max-w-3xl mx-auto pb-4">
            {messages.filter(m => m.role !== 'system').map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex justify-start mb-6 animate-pulse">
                <div className="bg-dark-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 md:p-6 bg-dark-950 border-t border-dark-800">
          <div className="max-w-3xl mx-auto relative">
            {/* Contextual Input Helpers */}
            {currentMode === AppMode.TALK_TO_SOURCE && (
              <div className="absolute -top-12 left-0 flex gap-2">
                <button className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-xs text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-dark-700">
                  <Youtube size={14} className="text-red-500" />
                  <span>Paste YouTube URL</span>
                </button>
                <button className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-xs text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-dark-700">
                  <Paperclip size={14} />
                  <span>Upload PDF</span>
                </button>
              </div>
            )}

            <div className={cn(
              "relative bg-dark-900 rounded-xl border transition-all duration-200",
              "focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/50",
              "border-dark-700 shadow-xl"
            )}>
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentMode === AppMode.TALK_TO_SOURCE ? "Ask about the video or document..." :
                    currentMode === AppMode.VIBE_CODE ? "Paste code or describe logic..." :
                      "Type a message..."
                }
                className="w-full bg-transparent text-gray-200 placeholder-gray-500 px-4 py-4 pr-12 rounded-xl focus:outline-none resize-none min-h-[60px] max-h-[200px]"
                rows={1}
                style={{ height: 'auto', minHeight: '60px' }}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-dark-800">
                  <Mic size={20} />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    input.trim() && !isLoading
                      ? "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/50"
                      : "bg-dark-800 text-gray-600 cursor-not-allowed"
                  )}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-600 mt-3">
              PromptCore can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-dark-950 text-gray-100 font-sans overflow-hidden selection:bg-brand-500/30">

      <Sidebar currentView={currentView} onNavigate={handleSidebarNavigate} profile={profile} />

      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {renderContent()}
      </main>

      {/* Overlays */}
      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onClose={handleCloseToast}
        actionLabel={toast.actionLabel}
        onAction={toast.action}
      />
    </div>
  );
};

export default App;