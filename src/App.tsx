import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ChatWindow from './components/ChatWindow';

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

  // --- THEME LOGIC ADDITION ---
  useEffect(() => {
    // Set page title for StageEgo
    document.title = 'StageEgo - Your AI Performance Coach';

    const applyTheme = () => {
      const theme = localStorage.getItem('theme_preference') || 'dark';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        // Fallback for native Tailwind bg color if dark mode class isn't fully configured
        document.body.style.backgroundColor = '#0f172a'; // slate-900
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#f8fafc'; // slate-50
      }
    };

    // Apply on load
    applyTheme();
    
    // Listen for updates from the User Profile Modal
    window.addEventListener('profileUpdated', applyTheme);
    return () => window.removeEventListener('profileUpdated', applyTheme);
  }, []);
  // ----------------------------

  if (sessionState === 'loggedOut') {
    return (
      <Auth 
        onLogin={() => setSessionState('loggedIn')} 
        onGuest={() => setSessionState('guest')} 
      />
    );
  }

  return <ChatWindow isGuest={sessionState === 'guest'} />;
}

export default App;
