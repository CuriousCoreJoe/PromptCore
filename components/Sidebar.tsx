import React from 'react';
import { clsx } from 'clsx';
import { LayoutDashboard, MessageSquare, Layers, Settings, Zap, User, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AppView } from '../types';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  profile: any;
  isDev: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, profile, isDev, isCollapsed, onToggleCollapse }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className={clsx(
      "flex-shrink-0 bg-dark-900 border-r border-dark-800 flex flex-col h-full transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 border-b border-dark-800">
        <div className="flex items-center flex-1 overflow-hidden">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            P
          </div>
          {!isCollapsed && <span className="ml-3 font-semibold text-lg text-white truncate">PromptCore</span>}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-800 rounded-md transition-all ml-1"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-6 px-2 md:px-4 space-y-2 overflow-y-auto">
        <NavItem
          icon={<MessageSquare size={20} />}
          label="Workspace"
          active={currentView === 'workspace'}
          onClick={() => onNavigate('workspace')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={<Layers size={20} />}
          label="Prompt Factory"
          active={currentView === 'factory'}
          onClick={() => onNavigate('factory')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={currentView === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={<Settings size={20} />}
          label="Settings"
          active={currentView === 'settings'}
          onClick={() => onNavigate('settings')}
          isCollapsed={isCollapsed}
        />

        {!isCollapsed && (
          <div className="pt-6 pb-2">
            <div className="h-px bg-dark-800 mx-2 mb-4"></div>
            <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              History
            </p>
            {/* Mock History Items */}
            <HistoryItem label="React App Logic" />
            <HistoryItem label="Marketing Copy Batch" />
            <HistoryItem label="Video Transcript Analysis" />
          </div>
        )}
      </nav>

      {/* User / Settings */}
      <div className="p-4 border-t border-dark-800">
        <div
          onClick={() => onNavigate('settings')}
          className="flex items-center p-2 rounded-lg hover:bg-dark-800 cursor-pointer text-gray-400 hover:text-white transition-colors group mb-2"
          title="Click to Logout"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-8 h-8 rounded-full" />
          ) : (
            <User size={20} />
          )}
          {!isCollapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-white truncate max-w-[120px]">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{isDev ? 'Developer' : (profile?.subscription_status || 'Free')} Tier</p>
            </div>
          )}
          {!isCollapsed && (
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={16} />
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={clsx(
            "w-full flex items-center justify-center py-2 px-4 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all border border-transparent hover:border-red-400/20",
            isCollapsed && "px-0"
          )}
        >
          {isCollapsed ? "Exit" : "Logout"}
        </button>

        <button
          onClick={() => onNavigate('upgrade')}
          className={clsx(
            "mt-4 w-full flex items-center justify-center py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-sm font-medium transition-colors",
            isCollapsed && "px-0"
          )}
        >
          <Zap size={16} className={isCollapsed ? "" : "mr-2"} />
          {!isCollapsed && <span>Upgrade Plan</span>}
        </button>

        {!isCollapsed && (
          <button
            onClick={() => onNavigate('legal')}
            className="mt-2 w-full flex items-center justify-center py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Legal & Privacy
          </button>
        )}
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isCollapsed }) => (
  <button
    onClick={onClick}
    className={clsx(
      "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors group",
      active ? 'bg-dark-800 text-brand-500' : 'text-gray-400 hover:bg-dark-800 hover:text-white',
      isCollapsed ? "justify-center px-0" : "justify-start"
    )}
    title={isCollapsed ? label : ""}
  >
    <span className={active ? 'text-brand-500' : 'group-hover:text-white'}>{icon}</span>
    {!isCollapsed && <span className="ml-3 font-medium">{label}</span>}
  </button>
);

const HistoryItem: React.FC<{ label: string }> = ({ label }) => (
  <button className="w-full text-left px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded truncate transition-colors hidden md:block">
    {label}
  </button>
);