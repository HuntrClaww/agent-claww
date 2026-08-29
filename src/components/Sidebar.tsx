import { useState, useEffect } from 'react';
import UserProfileModal from './UserProfileModal';
import { X } from 'lucide-react';

interface SidebarProps {
  isGuest: boolean;
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
}

export default function Sidebar({ isGuest, isOpen, onCloseMobile, onOpenSettings, onNewChat }: SidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState('Guest User');
  const [userAvatar, setUserAvatar] = useState('');

  // Load profile data and listen for updates
  useEffect(() => {
    const loadProfile = () => {
      setUserName(localStorage.getItem('user_display_name') || (isGuest ? 'Guest User' : 'My Account'));
      setUserAvatar(localStorage.getItem('user_avatar_url') || '');
    };

    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);
    return () => window.removeEventListener('profileUpdated', loadProfile);
  }, [isGuest]);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <div className={`w-64 bg-slate-800 border-r border-slate-700 flex-col h-full z-50 
        fixed md:static inset-y-0 left-0 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex`}>
        {/* Top Section */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
              <span>🎭</span> Sessions
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSettings}
                className="text-slate-400 hover:text-teal-400 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={onCloseMobile}
                className="text-slate-400 hover:text-white transition-colors md:hidden"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <button
            onClick={onNewChat}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white rounded-md py-2 transition-all mb-4 font-medium shadow-md hover:shadow-lg"
          >
            + New Session
          </button>
        </div>

        {/* Middle Section (Session History will go here later) */}
        <div className="flex-1 overflow-y-auto px-4">
          {isGuest && (
            <div className="p-3 bg-slate-700/50 rounded-lg text-sm text-slate-400 text-center border border-slate-600 mt-4">
              🎭 StageEgo Guest Mode<br />
              Sessions save locally. <br />
              <span className="text-teal-400 cursor-pointer hover:underline">Create account</span>
            </div>
          )}
        </div>

        {/* Bottom Profile Section */}
        <div
          onClick={() => setIsProfileOpen(true)}
          className="p-4 border-t border-slate-700 flex items-center gap-3 cursor-pointer hover:bg-slate-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center overflow-hidden shrink-0">
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-slate-100">{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
            <p className="text-xs text-slate-400 truncate">{isGuest ? 'Local Storage' : 'Cloud Synced'}</p>
          </div>
        </div>

        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      </div>
    </>
  );
}
