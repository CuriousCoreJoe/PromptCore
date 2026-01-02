import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sidebar } from './components/Sidebar';
import { ModeSelector } from './components/ModeSelector';
import { MessageBubble } from './components/MessageBubble';
import { Toast } from './components/Toast';
import { PromptFactory } from './components/PromptFactory';
import { Dashboard } from './components/Dashboard';
import { UpgradePage } from './components/UpgradePage';
import { Legal } from './components/Legal';
import { SettingsPage } from './components/SettingsPage';
import { AppMode, AppView, Message, UserProfile } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { Send, Paperclip, Mic, Youtube, Coins } from 'lucide-react';
import { Workspace } from './components/Workspace';
import { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('workspace');
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.EVERYDAY);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [wizardMode, setWizardMode] = useState<'iterative' | 'batch'>('iterative');
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

  const handleSidebarNavigate = (view: AppView) => {
    if (view === 'workspace') {
      setActiveChatId(null); // Clear active chat to show new chat screen
    }
    setCurrentView(view);
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  if (!session) {
    return <Auth onAuthSuccess={() => { }} />;
  }

  const renderContent = () => {
    if (currentView === 'factory') {
      return <PromptFactory credits={credits} />;
    }

    if (currentView === 'dashboard') {
      return <Dashboard credits={credits} isDev={isDev} />;
    }

    if (currentView === 'settings') {
      return (
        <SettingsPage
          wizardMode={wizardMode}
          onToggleWizardMode={() => updateWizardMode(wizardMode === 'iterative' ? 'batch' : 'iterative')}
          onBack={() => setCurrentView('workspace')}
        />
      );
    }

    if (currentView === 'upgrade') {
      return (
        <UpgradePage
          userId={session.user.id}
          credits={credits}
          onBack={() => setCurrentView('workspace')}
          initialFocus={upgradeFocus}
        />
      );
    }

    if (currentView === 'legal') {
      return <Legal onBack={() => setCurrentView('workspace')} />;
    }

    // Default: Workspace Chat
    return (
      <Workspace
        currentMode={currentMode}
        session={session}
        credits={credits}
        onShowToast={(message, actionLabel, action) => setToast({
          visible: true,
          message,
          actionLabel: actionLabel || '',
          action: action || (() => { })
        })}
        onUpgrade={() => setCurrentView('upgrade')}
        wizardMode={wizardMode}
        onSelectMode={setCurrentMode}
        activeChatId={activeChatId}
        onLoadChat={setActiveChatId}
      />
    );
  };


  return (
    <div className="flex h-screen bg-dark-950 text-gray-100 font-sans overflow-hidden selection:bg-brand-500/30">

      <Sidebar
        currentView={currentView}
        onNavigate={handleSidebarNavigate}
        profile={profile}
        isDev={isDev}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full transition-all duration-300">
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