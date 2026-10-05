/**
 * HomeDashboard — the landing screen after auth.
 * Matches the layout from the reference images:
 *   - Hero section: greeting + search input + quick-command chips
 *   - Recent Characters panel (proxies for "recent chats" until sessions are persisted)
 *   - Featured Characters panel (popular hardcoded picks)
 *   - Right panel: Quick Stats + Mode toggles
 *   - Footer bar
 */

import { useState, useEffect } from 'react';
import { BrandMark } from './Brand';
import { listCharacters, type SavedCharacter } from '../lib/characterStore';
import {
  Star, Clock, Send, Mic, Users, Infinity,
  MessageSquare, BarChart2, ChevronRight, Zap,
  Search,
} from 'lucide-react';
import type { AppScreen } from './NavSidebar';

const FEATURED_CHARACTERS = [
  { name: 'Zero Two',        source: 'Anime · Darling in the FranXX', quote: '"Hmph~ You\'re pretty interesting..."',   color: '#f472b6' },
  { name: 'Gojo Satoru',     source: 'Anime · Jujutsu Kaisen',        quote: '"Let\'s have some fun, shall we?"',       color: '#818cf8' },
  { name: 'Naruto Uzumaki',  source: 'Anime · Naruto',                quote: '"Believe it! Never give up!"',           color: '#fb923c' },
  { name: 'Sasuke Uchiha',   source: 'Anime · Naruto',                quote: '"...Don\'t get in my way."',             color: '#60a5fa' },
  { name: 'Hinata Hyuga',    source: 'Anime · Naruto',                quote: '"I\'m always here for you."',            color: '#a78bfa' },
];

const QUICK_CHIPS = [
  { label: 'Be Naruto',       icon: '🥷' },
  { label: 'Tell me a story', icon: '💬' },
  { label: 'Give me advice',  icon: '✦'  },
  { label: 'Just chat',       icon: '💭' },
];

interface HomeDashboardProps {
  onNavigate: (screen: AppScreen) => void;
  onStartChat: (query?: string) => void;
  isGuest: boolean;
}

export default function HomeDashboard({ onNavigate, onStartChat, isGuest }: HomeDashboardProps) {
  const [userName, setUserName] = useState('');
  const [inputText, setInputText] = useState('');
  const [savedChars, setSavedChars] = useState<SavedCharacter[]>([]);
  const [personalityModeOn, setPersonalityModeOn] = useState(true);
  const [genericModeOn, setGenericModeOn] = useState(true);

  useEffect(() => {
    const load = () => {
      setUserName(localStorage.getItem('user_display_name') || (isGuest ? 'Arthur' : 'there'));
      setSavedChars(listCharacters().slice(-5).reverse());
    };
    load();
    window.addEventListener('profileUpdated', load);
    return () => window.removeEventListener('profileUpdated', load);
  }, [isGuest]);

  const handleSend = () => {
    if (inputText.trim()) onStartChat(inputText.trim());
    else onNavigate('chat');
  };

  const totalChats = Number(localStorage.getItem('stageego_total_chats') || 0);
  const totalVoice = Number(localStorage.getItem('stageego_voice_messages') || 0);
  const charsMet   = savedChars.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 md:p-5 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 max-w-[1280px] mx-auto w-full">

        {/* ── Center column ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Hero panel */}
          <div className="glass-surface rounded-[24px] overflow-hidden relative min-h-[220px] flex flex-col justify-end p-6">
            {/* Gradient overlay on hero */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-pink-900/20 pointer-events-none" />
            {/* Top-right: character peek image / action */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => onNavigate('characters')}
                className="btn-3d flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              >
                Explore Characters <ChevronRight size={14} />
              </button>
            </div>

            {/* Greeting */}
            <div className="relative">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                Welcome Back,{' '}
                <span style={{ color: 'var(--user-accent)' }}>{userName || 'Arthur'}</span>
              </h1>
              <p className="text-slate-300 text-sm mb-4">
                What kind of character do you want to talk to today?
              </p>

              {/* Search / chat input */}
              <div className="flex items-center gap-2 glass-surface rounded-[18px] px-4 py-3 border border-white/10 mb-3">
                <Search size={16} className="text-slate-500 shrink-0" />
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message, or try something like..."
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-slate-500"
                />
                <button
                  onClick={handleSend}
                  className="btn-3d w-8 h-8 rounded-full flex items-center justify-center shrink-0 p-0"
                  aria-label="Start chat"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Quick chips */}
              <div className="flex flex-wrap gap-2">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => onStartChat(chip.label)}
                    className="suggestion-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  >
                    <span>{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom two-col: Recent Chats + Featured Characters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Recent Characters / Chats */}
            <div className="glass-surface rounded-[24px] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock size={15} style={{ color: 'var(--user-accent)' }} />
                  Recent Chats
                </h2>
                <button
                  onClick={() => onNavigate('sessions')}
                  className="text-[11px] font-medium flex items-center gap-1"
                  style={{ color: 'var(--user-accent)' }}
                >
                  View All <ChevronRight size={12} />
                </button>
              </div>

              {savedChars.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                  <MessageSquare size={28} className="text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No chats yet.<br />Start by choosing a character.</p>
                  <button
                    onClick={() => onNavigate('characters')}
                    className="btn-3d mt-3 px-4 py-1.5 rounded-lg text-xs"
                  >
                    Pick a character
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {savedChars.map(char => (
                    <button
                      key={char.id}
                      onClick={() => onNavigate('chat')}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-[15px] hover:bg-white/[0.05] transition-colors text-left group"
                    >
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold ring-1 ring-white/10"
                        style={{ background: char.themeColor
                          ? `linear-gradient(135deg, ${char.themeColor}, ${char.themeColor}88)`
                          : 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                      >
                        {char.portraitUrl
                          ? <img src={char.portraitUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-slate-900">{char.name[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{char.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{char.summary || 'Personality Mode'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border shrink-0"
                        style={{ color: 'var(--user-accent)', borderColor: 'color-mix(in srgb, var(--user-accent) 40%, transparent)' }}>
                        Personality
                      </span>
                    </button>
                  ))}
                  {/* New Chat row */}
                  <button
                    onClick={() => onNavigate('chat')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[15px] hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center shrink-0">
                      <span className="text-slate-500 text-lg leading-none">+</span>
                    </div>
                    <span className="text-sm text-slate-500">New Chat</span>
                  </button>
                </div>
              )}
            </div>

            {/* Featured Characters */}
            <div className="glass-surface rounded-[24px] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Star size={15} style={{ color: 'var(--user-accent)' }} />
                  Featured Characters
                </h2>
                <button
                  onClick={() => onNavigate('characters')}
                  className="text-[11px] font-medium flex items-center gap-1"
                  style={{ color: 'var(--user-accent)' }}
                >
                  View All <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {FEATURED_CHARACTERS.map(char => (
                  <button
                    key={char.name}
                    onClick={() => onNavigate('chat')}
                    className="flex items-center gap-3 px-3 py-2 rounded-[15px] hover:bg-white/[0.05] transition-colors text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-slate-900 ring-1 ring-white/10"
                      style={{ background: `linear-gradient(135deg, ${char.color}, ${char.color}88)` }}
                    >
                      {char.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-200">{char.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{char.source}</p>
                      <p className="text-[10px] text-slate-400 italic truncate">{char.quote}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

          </div>{/* end bottom two-col */}
        </div>{/* end center column */}

        {/* ── Right panel ────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col gap-4">

          {/* Quick Stats */}
          <div className="glass-surface rounded-[24px] p-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <BarChart2 size={15} style={{ color: 'var(--user-accent)' }} />
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total Chats',     value: totalChats || '—', icon: <MessageSquare size={13} /> },
                { label: 'Characters Met',  value: charsMet   || '—', icon: <Users         size={13} /> },
                { label: 'Voice Messages',  value: totalVoice || '—', icon: <Mic           size={13} /> },
                { label: 'This Week',       value: '+0%',              icon: <BarChart2     size={13} /> },
              ].map(stat => (
                <div key={stat.label}
                  className="rounded-[18px] p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="text-slate-500">{stat.icon}</span>
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                  <span className="text-[10px] text-slate-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mode toggles */}
          <div className="glass-surface rounded-[24px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap size={15} style={{ color: 'var(--user-accent)' }} />
                Your Modes
              </h2>
              <button
                onClick={() => onNavigate('characters')}
                className="text-[11px] font-medium flex items-center gap-1"
                style={{ color: 'var(--user-accent)' }}
              >
                Manage <ChevronRight size={12} />
              </button>
            </div>

            {/* Personality Mode */}
            <div className="rounded-[18px] p-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--user-accent) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--user-accent) 40%, transparent)' }}>
                <BrandMark size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">Personality Mode</p>
                <p className="text-[10px] text-slate-500">Locked to one character per session</p>
              </div>
              <button
                onClick={() => setPersonalityModeOn(v => !v)}
                className="w-10 h-6 rounded-full transition-all shrink-0 relative"
                style={{
                  background: personalityModeOn ? 'var(--user-accent)' : 'rgba(255,255,255,0.1)',
                  boxShadow: personalityModeOn ? '0 0 10px -2px var(--user-accent)' : undefined,
                }}
                aria-label="Toggle Personality Mode"
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
                  style={{ left: personalityModeOn ? '18px' : '2px' }} />
              </button>
            </div>

            {/* Generic Mode */}
            <div className="rounded-[18px] p-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)' }}>
                <Users size={16} className="text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">Generic Mode</p>
                <p className="text-[10px] text-slate-500">Switch characters anytime with simple commands</p>
              </div>
              <button
                onClick={() => setGenericModeOn(v => !v)}
                className="w-10 h-6 rounded-full transition-all shrink-0 relative"
                style={{
                  background: genericModeOn ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                  boxShadow: genericModeOn ? '0 0 10px -2px #06b6d4' : undefined,
                }}
                aria-label="Toggle Generic Mode"
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
                  style={{ left: genericModeOn ? '18px' : '2px' }} />
              </button>
            </div>
          </div>

        </div>{/* end right panel */}
      </div>{/* end main grid */}

      {/* ── Footer bar ──────────────────────────────────────────────── */}
      <div className="glass-panel border-t border-white/[0.05] px-6 py-3 hidden md:block">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={20} />
            <div>
              <span className="text-sm font-bold text-white">StageEgo</span>
              <p className="text-[10px] text-slate-500">Your AI. Your Characters. Your World.</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {[
              { icon: <MessageSquare size={14} />, label: 'Chat',       sub: 'Real conversations.' },
              { icon: <Mic          size={14} />, label: 'Voice',      sub: 'Speak & listen.' },
              { icon: <Users        size={14} />, label: 'Characters', sub: 'Endless possibilities.' },
              { icon: <Infinity     size={14} />, label: 'Infinity',   sub: 'No limits.' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-0.5">
                <span style={{ color: 'var(--user-accent)' }}>{item.icon}</span>
                <span className="text-[11px] font-semibold text-slate-300">{item.label}</span>
                <span className="text-[9px] text-slate-600">{item.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
