import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ChatWindow from './components/ChatWindow';
import CharacterSelect from './components/CharacterSelect';
import HomeDashboard from './components/HomeDashboard';
import NavSidebar, { type AppScreen } from './components/NavSidebar';
import SettingsModal from './components/SettingsModal';
import { applyAppearance } from './lib/appearance';

function App() {
  const [sessionState, setSessionState] = useState<'loggedOut' | 'guest' | 'loggedIn'>('loggedOut');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingChatQuery, setPendingChatQuery] = useState<string | undefined>();

  // Phase 10: signal React mounted → fade out pre-React shell
  useEffect(() => {
    document.body.classList.add('app-ready');
    const shell = document.getElementById('app-shell');
    if (!shell) return;
    const timer = setTimeout(() => shell.remove(), 250);
    return () => clearTimeout(timer);
  }, []);

  // Appearance engine
  useEffect(() => {
    document.title = 'StageEgo';
    const apply = () => applyAppearance();
    apply();
    window.addEventListener('profileUpdated', apply);
    return () => window.removeEventListener('profileUpdated', apply);
  }, []);

  // Reduce-effects toggle
  useEffect(() => {
    const applyVisualEffects = () => {
      const reduceEffects = localStorage.getItem('reduce_visual_effects') === 'true';
      document.documentElement.classList.toggle('reduce-effects', reduceEffects);
    };
    applyVisualEffects();
    window.addEventListener('profileUpdated', applyVisualEffects);
    return () => window.removeEventListener('profileUpdated', applyVisualEffects);
  }, []);

  const background = <div id="bg-layer" aria-hidden="true" />;

  // ── Auth screen (loggedOut) ─────────────────────────────────────────────
  if (sessionState === 'loggedOut') {
    return (
      <>
        {background}
        <Auth
          onLogin={() => setSessionState('loggedIn')}
          onGuest={() => setSessionState('guest')}
        />
      </>
    );
  }

  const isGuest = sessionState === 'guest';

  // ── Navigate to chat (optionally with a pre-filled query) ───────────────
  const goToChat = (query?: string) => {
    setPendingChatQuery(query);
    setCurrentScreen('chat');
  };

  // ── Main app layout (Home → Chat → Characters → etc.) ──────────────────
  return (
    <>
      {background}

      {/* Global Settings overlay — available from any screen */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* App shell: left nav + main content */}
      <div className="flex h-screen overflow-hidden">

        {/* Persistent left nav sidebar (desktop) + mobile bottom tabs */}
        <NavSidebar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isGuest={isGuest}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom,0px)] md:pb-0">

          {currentScreen === 'home' && (
            <HomeDashboard
              onNavigate={setCurrentScreen}
              onStartChat={goToChat}
              isGuest={isGuest}
            />
          )}

          {currentScreen === 'chat' && (
            <ChatWindow
              isGuest={isGuest}
              pendingQuery={pendingChatQuery}
              onQueryConsumed={() => setPendingChatQuery(undefined)}
            />
          )}

          {currentScreen === 'characters' && (
            <CharacterSelect
              onSelect={(_mode) => {
                goToChat();
              }}
            />
          )}

          {(currentScreen === 'sessions' || currentScreen === 'voicelab') && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl glass-surface flex items-center justify-center mb-2">
                <span className="text-3xl">{currentScreen === 'voicelab' ? '🎙' : '🕐'}</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                {currentScreen === 'voicelab' ? 'VoiceLab' : 'Sessions'}
              </h2>
              <p className="text-slate-400 text-sm max-w-xs">
                {currentScreen === 'voicelab'
                  ? 'Full voice configuration page — coming in the next UI phase.'
                  : 'Session history page — coming in the next UI phase.'}
              </p>
              <button
                onClick={() => setCurrentScreen('home')}
                className="btn-3d px-5 py-2.5 rounded-xl text-sm"
              >
                Back to Home
              </button>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

export default App;
