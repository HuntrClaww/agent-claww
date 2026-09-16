import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ChatWindow from './components/ChatWindow';
import { applyAppearance } from './lib/appearance';

function App() {
  const [sessionState, setSessionState] = useState<'loggedOut' | 'guest' | 'loggedIn'>('loggedOut');

  // Phase 10: signal that React has mounted so the static pre-React
  // shell (index.html) fades out instead of hard-cutting to the real
  // UI. Removes the shell node afterward rather than just hiding it,
  // so it doesn't sit inert in the DOM for the rest of the session.
  useEffect(() => {
    document.body.classList.add('app-ready');
    const shell = document.getElementById('app-shell');
    if (!shell) return;
    const timer = setTimeout(() => shell.remove(), 250);
    return () => clearTimeout(timer);
  }, []);

  // --- APPEARANCE ENGINE (Settings > Appearance) ---
  // One system for mode (dark/light/OLED), accent colors, animated
  // background, blur/saturation/contrast, glass sheen, and transition
  // style - all applied as CSS custom properties + marker classes on
  // <html> by lib/appearance.ts. Replaced three separate effects that
  // each read their own localStorage key and fought over
  // document.body.style.backgroundColor.
  //
  // The visual-effects opt-out below stays separate on purpose: it's an
  // accessibility/performance escape hatch, not a style choice, and it
  // needs to override whatever appearance settings say.
  useEffect(() => {
    document.title = 'StageEgo';
    const apply = () => applyAppearance();
    apply();
    window.addEventListener('profileUpdated', apply);
    return () => window.removeEventListener('profileUpdated', apply);
  }, []);
  // -------------------------------------------------

  // --- VISUAL EFFECTS TOGGLE ---
  // Manual opt-out from the liquid-glass/neon-glow styling (see
  // index.css), for people on older/lower-power devices where
  // backdrop-filter is genuinely heavy. Off by default - full effects
  // run for everyone until someone deliberately turns this on in
  // Settings > Advanced. Reuses the same 'profileUpdated' event the
  // theme toggle already listens for, since Settings' Save button
  // fires it once for everything that changed.
  useEffect(() => {
    const applyVisualEffects = () => {
      const reduceEffects = localStorage.getItem('reduce_visual_effects') === 'true';
      document.documentElement.classList.toggle('reduce-effects', reduceEffects);
    };
    applyVisualEffects();
    window.addEventListener('profileUpdated', applyVisualEffects);
    return () => window.removeEventListener('profileUpdated', applyVisualEffects);
  }, []);
  // ------------------------------

  // The animated background layer lives here rather than in index.html
  // so it mounts/unmounts with React and can't outlive the app. It's
  // fixed and z-index:-1 (see index.css), so every screen paints on top
  // of it - which is why ChatWindow's root is transparent now.
  const background = <div id="bg-layer" aria-hidden="true" />;

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

  return (
    <>
      {background}
      <ChatWindow isGuest={sessionState === 'guest'} />
    </>
  );
}

export default App;
