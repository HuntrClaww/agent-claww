/**
 * NavSidebar — top-level navigation shared across all screens.
 *
 * Desktop: fixed 220px left sidebar (logo + 6 nav items + user profile).
 * Mobile: hidden; replaced by bottom tab bar rendered at screen level in App.tsx.
 *
 * This replaces the old Sidebar.tsx role for navigation. The old Sidebar
 * (session history list) is still used inside ChatWindow for the sessions panel.
 */

import { BrandMark } from './Brand';
import {
  Home, MessageSquare, Users, Clock, Mic, Settings,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

export type AppScreen = 'home' | 'chat' | 'characters' | 'sessions' | 'voicelab';

interface NavItem {
  id: AppScreen | 'settings';
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',       label: 'Home',       icon: <Home size={18} /> },
  { id: 'chat',       label: 'Chat',       icon: <MessageSquare size={18} /> },
  { id: 'characters', label: 'Characters', icon: <Users size={18} /> },
  { id: 'sessions',   label: 'Sessions',   icon: <Clock size={18} /> },
  { id: 'voicelab',   label: 'VoiceLab',  icon: <Mic size={18} /> },
  { id: 'settings',   label: 'Settings',  icon: <Settings size={18} /> },
];

interface NavSidebarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onOpenSettings: () => void;
  isGuest: boolean;
}

export default function NavSidebar({
  currentScreen,
  onNavigate,
  onOpenSettings,
  isGuest,
}: NavSidebarProps) {
  const [userName, setUserName] = useState('Guest User');
  const [userAvatar, setUserAvatar] = useState('');

  useEffect(() => {
    const load = () => {
      setUserName(localStorage.getItem('user_display_name') || (isGuest ? 'Guest User' : 'My Account'));
      setUserAvatar(localStorage.getItem('user_avatar_url') || '');
    };
    load();
    window.addEventListener('profileUpdated', load);
    return () => window.removeEventListener('profileUpdated', load);
  }, [isGuest]);

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'settings') {
      onOpenSettings();
    } else {
      onNavigate(item.id as AppScreen);
    }
  };

  return (
    <>
      {/* ── Desktop left sidebar ───────────────────────────────────────── */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col h-full glass-panel border-r border-white/[0.06] z-30">

        {/* Logo */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <BrandMark size={26} />
            <span className="text-lg font-bold tracking-tight text-white">StageEgo</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight pl-0.5">
            Different Characters.<br />Infinite Conversations.
          </p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id !== 'settings' && currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-[15px] text-sm font-medium
                  text-left transition-all duration-200
                  ${isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }
                `}
                style={isActive ? {
                  background: 'var(--user-accent)',
                  boxShadow: '0 0 16px -4px var(--user-accent), inset 0 1px 0 rgba(255,255,255,0.25)',
                } : undefined}
              >
                <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Quote */}
        <div className="px-5 py-3 border-t border-white/[0.05]">
          <p className="text-[10px] text-slate-600 italic leading-relaxed">
            "Every character is a new perspective.<br />
            Every conversation is a new you."
          </p>
        </div>

        {/* User profile */}
        <div className="px-3 pb-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[15px] hover:bg-white/[0.05] transition-colors text-left group">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center ring-1 ring-white/10">
              {userAvatar
                ? <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-slate-900">{userName[0]?.toUpperCase() || 'G'}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate">{userName}</p>
              <p className="text-[10px] text-slate-500">{isGuest ? 'Guest Mode' : 'Account'}</p>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ──────────────────────────────────────── */}
      {/* 4 tabs: Chat, Characters, Voice, Settings */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-panel border-t border-white/[0.06]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {([
            { id: 'chat',       label: 'Chat',       icon: <MessageSquare size={20} /> },
            { id: 'characters', label: 'Characters', icon: <Users size={20} /> },
            { id: 'voicelab',   label: 'Voice',      icon: <Mic size={20} /> },
            { id: 'settings',   label: 'Settings',   icon: <Settings size={20} /> },
          ] as NavItem[]).map((item) => {
            const isActive = item.id !== 'settings' && currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="flex flex-col items-center gap-0.5 px-4 py-2 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors"
              >
                <span style={isActive ? { color: 'var(--user-accent)' } : undefined}
                  className={isActive ? '' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium"
                  style={isActive ? { color: 'var(--user-accent)' } : { color: 'rgb(100 116 139)' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
