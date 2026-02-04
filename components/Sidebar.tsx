import React, { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import {
  LayoutDashboard, MessageSquare, Layers, Settings, Zap,
  User, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Clock, Trash2, Pencil, Check, X, Plus,
  MoreHorizontal, Bookmark, Pin, Copy, Filter,
  Folder as FolderIcon, ChevronDown, FolderPlus
} from 'lucide-react';
import { AppView, ChatSession, AppMode, Folder } from '../types';
import { supabase } from '../lib/supabase';
import { FolderModal } from './FolderModal';
import { createPortal } from 'react-dom';
import { LogoTypefaceWhite } from './icons/LogoTypefaceWhite';
import { BrandIcon } from './icons/BrandIcon';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  profile: any;
  isDev: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeChatId?: string | null;
  onLoadChat?: (chatId: string) => void;
  userId?: string;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
  onNewChat?: () => void;
  onNewChatInFolder?: (folderId: string) => void;
  refreshKey?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

type FilterType = 'recent' | 'bookmarked' | 'mode';

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onNavigate, profile, isDev, isCollapsed,
  onToggleCollapse, activeChatId, onLoadChat, userId,
  onDeleteChat, onRenameChat, onNewChat, onNewChatInFolder, refreshKey,
  isMobileOpen, onCloseMobile
}) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [filter, setFilter] = useState<FilterType>('recent');
  const [activeModeFilter, setActiveModeFilter] = useState<AppMode | 'all'>('all');

  // Folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isRecentsCollapsed, setIsRecentsCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);

  useEffect(() => {
    const fetchId = userId || profile?.id;
    if (fetchId) {
      const fetchChats = async () => {
        let query = supabase
          .from('chats')
          .select('*')
          .eq('user_id', fetchId)
          .is('folder_id', null) // Only fetch chats NOT in a folder for "Recents"
          .order('updated_at', { ascending: false });

        if (filter === 'bookmarked') {
          query = supabase.from('chats').select('*').eq('user_id', fetchId).eq('is_bookmarked', true).order('updated_at', { ascending: false });
        } else if (filter === 'mode' && activeModeFilter !== 'all') {
          query = supabase.from('chats').select('*').eq('user_id', fetchId).eq('mode', activeModeFilter).order('updated_at', { ascending: false });
        }

        const { data } = await query.limit(20);
        if (data) setChats(data as unknown as ChatSession[]);
      };

      const fetchFolders = async () => {
        const { data } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', fetchId)
          .order('name', { ascending: true });
        if (data) setFolders(data as Folder[]);
      };

      fetchChats();
      fetchFolders();

      const chatChannel = supabase.channel(`sidebar-chats-${fetchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${fetchId}` }, () => { fetchChats(); fetchFolders(); }).subscribe();
      const folderChannel = supabase.channel(`sidebar-folders-${fetchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `user_id=eq.${fetchId}` }, () => { fetchFolders(); }).subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(folderChannel);
      };
    }
  }, [profile?.id, userId, refreshKey, filter, activeModeFilter]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleToggleBookmark = async (chatId: string, currentState: boolean) => {
    await supabase.from('chats').update({ is_bookmarked: !currentState }).eq('id', chatId);
  };

  const handleTogglePin = async (chatId: string, currentState: boolean) => {
    await supabase.from('chats').update({ is_pinned: !currentState }).eq('id', chatId);
  };

  const handleMoveToFolder = async (chatId: string, folderId: string | null) => {
    await supabase.from('chats').update({ folder_id: folderId }).eq('id', chatId);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (window.confirm('Delete this folder? Chats inside will be moved to Recents.')) {
      await supabase.from('folders').delete().eq('id', folderId);
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCloneChat = async (chat: ChatSession) => {
    const { data } = await supabase.from('chats').insert({
      user_id: userId || profile?.id,
      title: `${chat.title} (Clone)`,
      mode: chat.mode
    }).select().single();

    if (data) {
      // Also clone messages for high-fidelity cloning
      const { data: messages } = await supabase.from('messages').select('*').eq('chat_id', chat.id);
      if (messages && messages.length > 0) {
        const clonedMessages = messages.map(m => ({
          chat_id: data.id,
          role: m.role,
          content: m.content,
          msg_type: m.msg_type,
          execution_model: m.execution_model,
          metadata: m.metadata
        }));
        await supabase.from('messages').insert(clonedMessages);
      }
      onLoadChat?.(data.id);
    }
  };

  const pinnedChats = chats.filter(c => c.is_pinned);
  const otherChats = chats.filter(c => !c.is_pinned);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <div
        className={clsx(
          "flex flex-col h-full transition-all duration-300",
          "fixed inset-y-0 left-0 z-50 md:relative md:z-0",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-sidebar)',
          width: isCollapsed ? '4rem' : '16rem'
        }}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b justify-between" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
          <div className="flex items-center flex-1 overflow-hidden">
            {isCollapsed ? (
              <div className="w-8 h-8 mx-auto flex items-center justify-center">
                <BrandIcon className="w-full h-full" />
              </div>
            ) : (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-app)' }}>
                <BrandIcon className="w-8 h-8" />
                <LogoTypefaceWhite className="h-5" />
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden md:block p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-all ml-1"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 md:px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => onNewChat ? onNewChat() : onNavigate('workspace')}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-3 mb-6 bg-gradient-to-r from-cyan-400 to-violet-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] group",
              isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "justify-start"
            )}
          >
            <Plus size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>New Chat</span>}
          </button>

          <NavItem icon={<MessageSquare size={18} />} label="Workspace" active={currentView === 'workspace'} onClick={() => onNavigate('workspace')} isCollapsed={isCollapsed} />
          <NavItem icon={<Layers size={18} />} label="Prompt Factory" active={currentView === 'factory'} onClick={() => onNavigate('factory')} isCollapsed={isCollapsed} />
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')} isCollapsed={isCollapsed} />
          <NavItem icon={<Clock size={18} />} label="History" active={currentView === 'history'} onClick={() => onNavigate('history')} isCollapsed={isCollapsed} />

          {!isCollapsed && (
            <div className="pt-6 space-y-6">
              {/* Folders Section */}
              <div className="pt-2">
                <div className="w-full flex items-center justify-between px-2 mb-3 group">
                  <button
                    onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
                    className="flex items-center gap-1.5 hover:bg-white/5 rounded px-1 py-0.5 transition-colors"
                  >
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                      <FolderIcon size={12} /> Folders
                    </p>
                    <ChevronDown size={12} className={clsx("text-gray-600 transition-transform", isFoldersCollapsed && "-rotate-90")} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFolder(null); setShowFolderModal(true); }}
                    className="p-1 text-gray-600 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="New Folder"
                  >
                    <FolderPlus size={12} />
                  </button>
                </div>

                {!isFoldersCollapsed && (
                  <div className="space-y-1 px-1">
                    {folders.map(folder => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        isExpanded={expandedFolders.has(folder.id)}
                        onToggleExpand={() => toggleFolderExpand(folder.id)}
                        activeChatId={activeChatId}
                        onLoadChat={(chatId) => { onLoadChat?.(chatId); onNavigate('workspace'); }}
                        onDeleteChat={onDeleteChat}
                        onRenameChat={onRenameChat}
                        onEditFolder={() => { setEditingFolder(folder); setShowFolderModal(true); }}
                        onDeleteFolder={() => handleDeleteFolder(folder.id)}
                        onNewChatInFolder={() => onNewChatInFolder?.(folder.id)}
                        onMoveToRecents={(chatId) => handleMoveToFolder(chatId, null)}
                      />
                    ))}

                    {folders.length === 0 && (
                      <p className="px-4 py-4 text-center text-[11px] text-gray-600">
                        No folders yet
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Library Section */}
              <div className="pt-0">
                <button
                  onClick={() => setIsRecentsCollapsed(!isRecentsCollapsed)}
                  className="w-full flex items-center justify-between px-2 mb-3 hover:bg-white/5 rounded-lg transition-colors py-1"
                >
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                    Library
                  </p>
                  <ChevronDown size={12} className={clsx("text-gray-600 transition-transform", isRecentsCollapsed && "-rotate-90")} />
                </button>

                {!isRecentsCollapsed && (
                  <>
                    <div className="flex rounded-md p-0.5 border mb-3 mx-2" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
                      <button
                        onClick={() => setFilter('recent')}
                        className={clsx("p-1 rounded transition-colors", filter === 'recent' ? "bg-brand-500/10 text-brand-500 shadow-sm" : "text-gray-500 hover:text-brand-600 dark:hover:text-gray-300")}
                        title="Recent"
                      >
                        <Clock size={12} />
                      </button>
                      <button
                        onClick={() => setFilter('bookmarked')}
                        className={clsx("p-1 rounded transition-colors", filter === 'bookmarked' ? "bg-brand-500/10 text-brand-500 shadow-sm" : "text-gray-500 hover:text-brand-600 dark:hover:text-gray-300")}
                        title="Bookmarks"
                      >
                        <Bookmark size={12} />
                      </button>
                      <button
                        onClick={() => setFilter('mode')}
                        className={clsx("p-1 rounded transition-colors", filter === 'mode' ? "bg-brand-500/10 text-brand-500 shadow-sm" : "text-gray-500 hover:text-brand-600 dark:hover:text-gray-300")}
                        title="By Mode"
                      >
                        <Filter size={12} />
                      </button>
                    </div>

                    {filter === 'mode' && (
                      <div className="px-2 mb-4 flex flex-wrap gap-1">
                        {Object.values(AppMode).map(m => (
                          <button
                            key={m}
                            onClick={() => setActiveModeFilter(activeModeFilter === m ? 'all' : m)}
                            className={clsx(
                              "text-[9px] px-2 py-0.5 rounded-full border transition-all",
                              activeModeFilter === m
                                ? "bg-brand-500/20 border-brand-500/50 text-brand-400"
                                : "border-white/5 text-gray-500 hover:text-gray-300"
                            )}
                            style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-0.5 px-1">
                      {pinnedChats.length > 0 && (
                        <div className="mb-4">
                          <p className="px-2 text-[9px] font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1">
                            <Pin size={10} /> Pinned
                          </p>
                          {pinnedChats.map(chat => (
                            <HistoryItem
                              key={chat.id}
                              chat={chat}
                              folders={folders}
                              isActive={activeChatId === chat.id}
                              onLoad={() => { onLoadChat?.(chat.id); onNavigate('workspace'); }}
                              onDelete={() => onDeleteChat?.(chat.id)}
                              onRename={(newTitle) => onRenameChat?.(chat.id, newTitle)}
                              onToggleBookmark={() => handleToggleBookmark(chat.id, !!chat.is_bookmarked)}
                              onTogglePin={() => handleTogglePin(chat.id, !!chat.is_pinned)}
                              onClone={() => handleCloneChat(chat)}
                              onMoveToFolder={(folderId) => handleMoveToFolder(chat.id, folderId)}
                            />
                          ))}
                        </div>
                      )}

                      {otherChats.map(chat => (
                        <HistoryItem
                          key={chat.id}
                          chat={chat}
                          folders={folders}
                          isActive={activeChatId === chat.id}
                          onLoad={() => { onLoadChat?.(chat.id); onNavigate('workspace'); }}
                          onDelete={() => onDeleteChat?.(chat.id)}
                          onRename={(newTitle) => onRenameChat?.(chat.id, newTitle)}
                          onToggleBookmark={() => handleToggleBookmark(chat.id, !!chat.is_bookmarked)}
                          onTogglePin={() => handleTogglePin(chat.id, !!chat.is_pinned)}
                          onClone={() => handleCloneChat(chat)}
                          onMoveToFolder={(folderId) => handleMoveToFolder(chat.id, folderId)}
                        />
                      ))}

                      {chats.length === 0 && (
                        <p className="px-4 py-8 text-center text-xs text-gray-600">
                          No chats found
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Folder Modal */}
        <FolderModal
          isOpen={showFolderModal}
          onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
          userId={userId || profile?.id}
          existingFolder={editingFolder}
        />

        {/* User / Settings Footer */}
        <div className="p-4 border-t" style={{ backgroundColor: 'var(--bg-sidebar-alt)', borderColor: 'var(--border-sidebar)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div
              onClick={() => onNavigate('dashboard')}
              className="flex-1 flex items-center p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-all min-w-0"
            >
              <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile?.full_name?.charAt(0) || 'U'}
              </div>
              {!isCollapsed && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-app)' }}>{profile?.full_name || 'User'}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">{profile?.subscription_status || 'Free'}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('settings')}
              className={clsx(
                "p-2 rounded-xl transition-all flex-shrink-0",
                currentView === 'settings'
                  ? "bg-brand-500 text-white shadow-lg"
                  : "text-gray-500 hover:text-brand-600 hover:bg-white/5"
              )}
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>

          {
            !isCollapsed && (
              <button
                onClick={() => onNavigate('upgrade')}
                className="w-full mb-3 flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold transition-all group"
              >
                <Zap size={14} className="text-yellow-500 group-hover:animate-pulse" />
                Upgrade Plan
              </button>
            )
          }

          <button
            onClick={handleLogout}
            className={clsx(
              "w-full flex items-center justify-center py-2 text-[11px] font-bold uppercase tracking-widest text-gray-600 hover:text-red-400 transition-colors",
              isCollapsed && "px-0 text-[8px]"
            )}
          >
            {isCollapsed ? "EXIT" : "Logout"}
          </button>
        </div>
      </div>
    </>
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
      "w-full flex items-center px-4 py-2.5 rounded-full transition-all group relative",
      active
        ? "bg-brand-600 text-white font-bold shadow-lg shadow-brand-600/20"
        : "text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white",
      isCollapsed ? "justify-center px-0" : "justify-start"
    )}
  >
    <span className={clsx("transition-transform", active ? "scale-110" : "group-hover:scale-110")}>{icon}</span>
    {!isCollapsed && <span className="ml-3 text-[15px] font-medium">{label}</span>}
  </button>
);

const HistoryItem: React.FC<{
  chat: ChatSession,
  folders: Folder[],
  isActive?: boolean,
  onLoad: () => void,
  onDelete: () => void,
  onRename: (title: string) => void,
  onToggleBookmark: () => void,
  onTogglePin: () => void,
  onClone: () => void,
  onMoveToFolder: (folderId: string | null) => void
}> = ({ chat, folders, isActive, onLoad, onDelete, onRename, onToggleBookmark, onTogglePin, onClone, onMoveToFolder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chat.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const touchTimer = useRef<any>(null);

  useEffect(() => {
    setEditValue(chat.title);
  }, [chat.title]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleTouchStart = () => {
    touchTimer.current = setTimeout(() => setShowMenu(true), 800);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  return (
    <div
      className="group relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 px-2 py-1.5 w-full">
          <input
            autoFocus
            className="flex-1 text-sm rounded-lg px-2 py-1 outline-none ring-1 ring-brand-500 min-w-0"
            style={{ backgroundColor: 'var(--bg-sidebar-alt)', color: 'var(--text-app)' }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editValue.trim() && editValue !== chat.title) onRename(editValue.trim());
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setEditValue(chat.title);
                setIsEditing(false);
              }
            }}
          />
        </div>
      ) : (
        <button
          onClick={onLoad}
          className={clsx(
            "w-full text-left px-4 py-2.5 text-[14px] rounded-full truncate transition-all pr-10",
            isActive
              ? "text-white bg-brand-600 font-bold shadow-lg shadow-brand-600/20"
              : "text-gray-300 hover:text-brand-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
          )}
        >
          {chat.title || 'Untitled'}
        </button>
      )}

      {/* More Button */}
      <button
        ref={moreButtonRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!showMenu && moreButtonRef.current) {
            const rect = moreButtonRef.current.getBoundingClientRect();
            const menuHeight = 280; // Approximate menu height
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow < menuHeight ? rect.top - menuHeight + 40 : rect.bottom + 4;
            setMenuPosition({ top: top + window.scrollY, left: rect.left + window.scrollX });
          }
          setShowMenu(!showMenu);
        }}
        className={clsx(
          "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-all rounded-md",
          showMenu ? "opacity-100 bg-white/10" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Context Menu - Portaled to body */}
      {showMenu && menuPosition && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: menuPosition.top,
            left: menuPosition.left,
            backgroundColor: 'var(--bg-search-palette)',
            borderColor: 'var(--border-sidebar)'
          }}
          className="w-48 border rounded-xl shadow-2xl z-[100] overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <MenuBtn icon={<Pin size={14} className={chat.is_pinned ? "text-brand-400" : ""} />} label={chat.is_pinned ? "Unpin" : "Pin"} onClick={() => { onTogglePin(); setShowMenu(false); }} />
          <MenuBtn icon={<Bookmark size={14} className={chat.is_bookmarked ? "text-brand-400" : ""} />} label={chat.is_bookmarked ? "Return from Saved" : "Bookmark"} onClick={() => { onToggleBookmark(); setShowMenu(false); }} />
          <div className="h-px bg-white/5 my-1" />

          <button
            onClick={(e) => { e.stopPropagation(); setShowFolderSubmenu(!showFolderSubmenu); }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors group/folder"
          >
            <div className="flex items-center gap-3">
              <FolderIcon size={14} />
              <span>Move to Folder</span>
            </div>
            <ChevronRight size={12} className={clsx("transition-transform", showFolderSubmenu && "rotate-90")} />
          </button>

          {showFolderSubmenu && (
            <div className="bg-black/20 py-1 max-h-32 overflow-y-auto">
              <button
                onClick={() => { onMoveToFolder(null); setShowMenu(false); setShowFolderSubmenu(false); }}
                className="w-full flex items-center gap-3 px-6 py-1.5 text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                Recents (Uncategorized)
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => { onMoveToFolder(f.id); setShowMenu(false); setShowFolderSubmenu(false); }}
                  className="w-full flex items-center gap-3 px-6 py-1.5 text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="h-px bg-white/5 my-1" />
          <MenuBtn icon={<Pencil size={14} />} label="Rename" onClick={() => { setIsEditing(true); setShowMenu(false); }} />
          <div className="h-px bg-white/5 my-1" />
          <MenuBtn icon={<Trash2 size={14} />} label="Delete" onClick={() => { if (window.confirm('Delete this chat?')) onDelete(); setShowMenu(false); }} className="text-red-400 hover:bg-red-400/10" />
        </div>,
        document.body
      )}
    </div>
  );
};

const MenuBtn: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, className?: string }> = ({ icon, label, onClick, className }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={clsx(
      "w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-500 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white transition-colors",
      className
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// FolderItem component with nested chats
interface FolderItemProps {
  folder: Folder;
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeChatId?: string | null;
  onLoadChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
  onEditFolder: () => void;
  onDeleteFolder: () => void;
  onNewChatInFolder: () => void;
  onMoveToRecents: (chatId: string) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder, isExpanded, onToggleExpand, activeChatId, onLoadChat,
  onDeleteChat, onRenameChat, onEditFolder, onDeleteFolder, onNewChatInFolder, onMoveToRecents
}) => {
  const [folderChats, setFolderChats] = useState<ChatSession[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      const fetchChats = async () => {
        const { data } = await supabase
          .from('chats')
          .select('*')
          .eq('folder_id', folder.id)
          .order('updated_at', { ascending: false });
        if (data) setFolderChats(data as ChatSession[]);
      };
      fetchChats();
    }
  }, [isExpanded, folder.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div className="relative group">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition-all hover:bg-white/5"
      >
        <ChevronDown
          size={12}
          className={clsx("text-gray-500 transition-transform", !isExpanded && "-rotate-90")}
        />
        <FolderIcon size={14} style={{ color: folder.color }} />
        <span className="truncate flex-1 text-left font-medium" style={{ color: 'var(--text-sidebar)' }}>{folder.name}</span>
      </button>

      {/* Folder Menu Button */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className={clsx(
          "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-all rounded-md",
          showMenu ? "opacity-100 bg-white/10" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <MoreHorizontal size={12} />
      </button>

      {/* Folder Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-8 top-full mt-1 w-44 border rounded-xl shadow-2xl z-[60] overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ backgroundColor: 'var(--bg-search-palette)', borderColor: 'var(--border-sidebar)' }}
        >
          <MenuBtn icon={<Plus size={14} />} label="New Chat in Folder" onClick={() => { onNewChatInFolder(); setShowMenu(false); }} />
          <MenuBtn icon={<Pencil size={14} />} label="Edit Folder" onClick={() => { onEditFolder(); setShowMenu(false); }} />
          <div className="h-px bg-white/5 my-1" />
          <MenuBtn icon={<Trash2 size={14} />} label="Delete Folder" onClick={() => { onDeleteFolder(); setShowMenu(false); }} className="text-red-400 hover:bg-red-400/10" />
        </div>
      )}

      {/* Nested Chats */}
      {isExpanded && (
        <div className="pl-5 mt-1 space-y-0.5 border-l border-white/5 ml-3">
          {folderChats.map(chat => (
            <div key={chat.id} className="flex items-center group/chat">
              <button
                onClick={() => onLoadChat(chat.id)}
                className={clsx(
                  "flex-1 text-left px-3 py-2 text-[12px] rounded-full truncate transition-all",
                  activeChatId === chat.id
                    ? "text-white bg-brand-500 font-bold"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                )}
              >
                {chat.title || 'Untitled'}
              </button>
              <button
                onClick={() => onMoveToRecents(chat.id)}
                className="opacity-0 group-hover/chat:opacity-100 p-1 text-gray-600 hover:text-white transition-all"
                title="Move to Recents"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {folderChats.length === 0 && (
            <p className="text-[10px] text-gray-600 py-2 px-2">Empty folder</p>
          )}
        </div>
      )}
    </div>
  );
};
