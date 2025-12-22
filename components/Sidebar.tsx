import React from 'react';
import { LayoutDashboard, MessageSquare, Layers, Settings, Zap, User } from 'lucide-react';
import { AppView } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  profile: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, profile }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="w-16 md:w-64 flex-shrink-0 bg-dark-900 border-r border-dark-800 flex flex-col h-full transition-all duration-300">
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-dark-800">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          P
        </div>
        <span className="ml-3 font-semibold text-lg hidden md:block text-white">PromptCore</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-6 px-2 md:px-4 space-y-2 overflow-y-auto">
        <NavItem
          icon={<MessageSquare size={20} />}
          label="Workspace"
          active={currentView === 'workspace'}
          onClick={() => onNavigate('workspace')}
        />
        <NavItem
          icon={<Layers size={20} />}
          label="Prompt Factory"
          active={currentView === 'factory'}
          onClick={() => onNavigate('factory')}
        />
        <NavItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={currentView === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />

        <div className="pt-6 pb-2">
          <div className="h-px bg-dark-800 mx-2 mb-4"></div>
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:block mb-2">
            History
          </p>
          {/* Mock History Items */}
          <HistoryItem label="React App Logic" />
          <HistoryItem label="Marketing Copy Batch" />
          <HistoryItem label="Video Transcript Analysis" />
        </div>
      </nav>

      {/* User / Settings */}
      <div className="p-4 border-t border-dark-800">
        <div
          onClick={handleLogout}
          className="flex items-center p-2 rounded-lg hover:bg-dark-800 cursor-pointer text-gray-400 hover:text-white transition-colors group"
          title="Click to Logout"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-8 h-8 rounded-full" />
          ) : (
            <User size={20} />
          )}
          <div className="ml-3 hidden md:block">
            <p className="text-sm font-medium text-white truncate max-w-[120px]">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{profile?.subscription_status || 'Free'} Tier</p>
          </div>
          <div className="ml-auto hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
            <Settings size={16} />
          </div>
        </div>

        <button
          onClick={() => onNavigate('upgrade')}
          className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Zap size={16} className="mr-0 md:mr-2" />
          <span className="hidden md:inline">Upgrade Plan</span>
        </button>

        <button
          onClick={() => onNavigate('legal')}
          className="mt-2 w-full flex items-center justify-center py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Legal & Privacy
        </button>
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-center md:justify-start px-2 py-2.5 rounded-lg transition-colors group ${active
      ? 'bg-dark-800 text-brand-500'
      : 'text-gray-400 hover:bg-dark-800 hover:text-white'
      }`}
  >
    <span className={active ? 'text-brand-500' : 'group-hover:text-white'}>{icon}</span>
    <span className="ml-3 hidden md:block font-medium">{label}</span>
  </button>
);

const HistoryItem: React.FC<{ label: string }> = ({ label }) => (
  <button className="w-full text-left px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded truncate transition-colors hidden md:block">
    {label}
  </button>
);