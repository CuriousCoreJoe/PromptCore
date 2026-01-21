import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sidebar } from './Sidebar';
import { ModeSelector } from './ModeSelector';
import { MessageBubble } from './MessageBubble';
import { Toast } from './Toast';
import { PromptFactory } from './PromptFactory';
import { Dashboard } from './Dashboard';
import { UpgradePage } from './UpgradePage';
import { Legal } from './Legal';
import { SettingsPage } from './SettingsPage';
import { AppMode, AppView, Message, UserProfile, AIModel } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { Send, Paperclip, Mic, Youtube, Coins } from 'lucide-react';
import { Workspace } from './Workspace';
import { HistoryPage } from './HistoryPage';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { Auth } from './Auth';
import { supabase } from '../lib/supabase';
import { Helmet } from 'react-helmet-async';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // currentView is derived from location
  const getViewFromPath = (): AppView => {
    const path = location.pathname;
    const hostname = window.location.hostname;
    const isAppSubdomain = hostname.startsWith('app.');

    // Remove the /app prefix if on main domain
    let base = path;
    if (!isAppSubdomain && path.startsWith('/app')) {
      base = path.substring(4) || '/';
    }

    if (base === '/' || base === '') return 'dashboard'; // Default to dashboard as requested
    if (base.includes('/history')) return 'history';
    if (base.includes('/factory')) return 'factory';
    if (base.includes('/settings')) return 'settings';
    if (base.includes('/upgrade')) return 'upgrade';
    if (base.includes('/legal')) return 'legal';
    if (base.includes('/workspace')) return 'workspace';
    return 'workspace';
  };

  const currentView = getViewFromPath();
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.EVERYDAY);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [wizardMode, setWizardMode] = useState<'iterative' | 'batch'>('iterative');
  const [defaultModel, setDefaultModel] = useState<AIModel>('google/gemini-3-pro-preview');
  const [defaultExpandBatches, setDefaultExpandBatches] = useState(false);
  const [upgradeFocus, setUpgradeFocus] = useState<'subscriptions' | 'credits'>('subscriptions');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to PromptOrigin. Select a mode to begin.',
      timestamp: Date.now(),
      mode: AppMode.EVERYDAY
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', actionLabel: '', action: () => { } });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDev = session?.user?.email === 'dev@promptcore.com';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCloseToast = React.useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

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
          setProfile(payload.new as UserProfile);
          setCredits(payload.new.credits);
          setWizardMode(payload.new.wizard_mode || 'iterative');
          setDefaultModel(payload.new.default_model || 'google/gemini-3-pro-preview');
        })
        .subscribe();

      return () => {
        supabase.removeChannel(profileSubscription);
      };
    }
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id);

    if (data && data.length > 0) {
      setProfile(data[0]);
      setCredits(data[0].credits);
      setWizardMode(data[0].wizard_mode || 'iterative');
      setDefaultModel(data[0].default_model || 'google/gemini-3-pro-preview');
    }
  };

  const updateWizardMode = async (mode: 'iterative' | 'batch') => {
    if (!session?.user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ wizard_mode: mode })
      .eq('id', session.user.id);

    if (!error) {
      setWizardMode(mode);
    }
  };

  const updateDefaultModel = async (model: AIModel) => {
    if (!session?.user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ default_model: model })
      .eq('id', session.user.id);

    if (!error) {
      setDefaultModel(model);
    }
  };

  const handleSidebarNavigate = (view: AppView) => {
    const hostname = window.location.hostname;
    const isAppSubdomain = hostname.startsWith('app.');
    const prefix = isAppSubdomain ? '' : '/app';

    navigate(`${prefix}/${view === 'dashboard' ? '' : view}`);

    if (window.innerWidth < 768) {
      setMobileMenuOpen(false);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    const hostname = window.location.hostname;
    const isAppSubdomain = hostname.startsWith('app.');
    const prefix = isAppSubdomain ? '' : '/app';
    navigate(`${prefix}/workspace`);
    if (window.innerWidth < 768) {
      setMobileMenuOpen(false);
    }
  };

  // Force sidebar refresh counter - incrementing this triggers sidebar to refetch
  const [chatRefreshKey, setChatRefreshKey] = useState(0);

  const handleDeleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (!error) {
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
      // Force sidebar to refetch by incrementing refresh key
      setChatRefreshKey(prev => prev + 1);
      setToast({
        visible: true,
        message: 'Chat deleted successfully',
        actionLabel: '',
        action: () => { }
      });
    }
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    const { error } = await supabase
      .from('chats')
      .update({ title: newTitle })
      .eq('id', chatId);

    if (!error) {
      setToast({
        visible: true,
        message: 'Chat renamed successfully',
        actionLabel: '',
        action: () => { }
      });
    }
  };

  if (!session) {
    return <Auth onAuthSuccess={() => { }} />;
  }

  const hostname = window.location.hostname;
  const isAppSubdomain = hostname.startsWith('app.');
  const appPrefix = isAppSubdomain ? '' : '/app';

  const renderContent = () => {
    return (
      <Routes>
        <Route path="/" element={<Dashboard credits={credits} isDev={isDev} onNavigate={handleSidebarNavigate} />} />
        <Route path="/factory" element={<PromptFactory credits={credits} defaultExpandBatches={defaultExpandBatches} />} />
        <Route path="/dashboard" element={<Navigate to={appPrefix || "/"} replace />} />
        <Route path="/history" element={
          <HistoryPage
            onBack={() => handleSidebarNavigate('workspace')}
            onLoadChat={async (chatId) => {
              const { data } = await supabase.from('chats').select('mode').eq('id', chatId).single();
              if (data?.mode) setCurrentMode(data.mode as AppMode);
              setActiveChatId(chatId);
              handleSidebarNavigate('workspace');
            }}
            userProfile={profile}
            userId={session?.user?.id}
          />
        } />
        <Route path="/settings" element={
          <SettingsPage
            wizardMode={wizardMode}
            onToggleWizardMode={() => updateWizardMode(wizardMode === 'iterative' ? 'batch' : 'iterative')}
            defaultModel={defaultModel}
            onModelChange={updateDefaultModel}
            defaultExpandBatches={defaultExpandBatches}
            onToggleDefaultExpandBatches={() => setDefaultExpandBatches(!defaultExpandBatches)}
            isDev={isDev}
            onBack={() => handleSidebarNavigate('workspace')}
          />
        } />
        <Route path="/upgrade" element={
          <UpgradePage
            userId={session.user.id}
            credits={credits}
            onBack={() => handleSidebarNavigate('workspace')}
            initialFocus={upgradeFocus}
          />
        } />
        <Route path="/legal" element={<Legal onBack={() => handleSidebarNavigate('workspace')} />} />
        <Route path="/workspace" element={
          <Workspace
            currentMode={currentMode}
            session={session}
            credits={credits}
            userProfile={profile}
            onShowToast={(message, actionLabel, action) => setToast({
              visible: true,
              message,
              actionLabel: actionLabel || '',
              action: action || (() => { })
            })}
            onUpgrade={() => handleSidebarNavigate('upgrade')}
            wizardMode={wizardMode}
            defaultModel={defaultModel}
            onSelectMode={setCurrentMode}
            activeChatId={activeChatId}
            onLoadChat={setActiveChatId}
          />
        } />
        {/* Fallback */}
        <Route path="*" element={<Navigate to={appPrefix || "/"} replace />} />
      </Routes>
    );
  };


  return (
    <div className="flex h-screen bg-dark-950 text-gray-100 font-sans overflow-hidden selection:bg-brand-500/30">
      <Helmet>
        <title>Prompt Origin | App</title>
      </Helmet>

      <Sidebar
        currentView={currentView}
        onNavigate={handleSidebarNavigate}
        profile={profile}
        isDev={isDev}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeChatId={activeChatId}
        onLoadChat={async (chatId) => {
          // Load the chat to get its mode
          const { data } = await supabase
            .from('chats')
            .select('mode')
            .eq('id', chatId)
            .single();

          if (data?.mode) {
            setCurrentMode(data.mode as AppMode);
          }
          setActiveChatId(chatId);
          handleSidebarNavigate('workspace');
        }}
        userId={session.user.id}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onNewChat={handleNewChat}
        refreshKey={chatRefreshKey}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-dark-900 border-b border-dark-800 flex items-center px-4 justify-between flex-shrink-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <span className="font-semibold text-white">PromptOrigin</span>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

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
