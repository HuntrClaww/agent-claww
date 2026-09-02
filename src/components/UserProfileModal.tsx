import { useState, useEffect, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { compressPortrait } from '../lib/imageCompress';

const AVATAR_MAX_BYTES = 200_000; // 200KB — tighter than portrait since it's shown everywhere

export default function UserProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(localStorage.getItem('user_display_name') || '');
      setAvatarDataUrl(localStorage.getItem('user_avatar_url') || null);
      setAvatarError(null);
    }
  }, [isOpen]);

  const handleAvatarFile = async (file: File | undefined) => {
    setAvatarError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    const dataUrl = await compressPortrait(file, AVATAR_MAX_BYTES);
    if (!dataUrl) {
      setAvatarError("Image couldn't be compressed to fit. Try a different photo.");
      return;
    }
    setAvatarDataUrl(dataUrl);
  };

  const handleSave = () => {
    const trimmed = displayName.trim();
    if (trimmed) localStorage.setItem('user_display_name', trimmed);
    else localStorage.removeItem('user_display_name');

    if (avatarDataUrl) localStorage.setItem('user_avatar_url', avatarDataUrl);
    else localStorage.removeItem('user_avatar_url');

    window.dispatchEvent(new Event('profileUpdated'));
    onClose();
  };

  if (!isOpen) return null;

  const initials = (displayName.trim() || 'G').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 w-full max-w-sm rounded-2xl p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-100">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-600 hover:border-amber-400 overflow-hidden flex items-center justify-center group transition-colors"
            aria-label="Upload avatar"
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-slate-400">{initials}</span>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImagePlus size={20} className="text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleAvatarFile(e.target.files?.[0])}
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Tap to upload a photo</span>
            {avatarDataUrl && (
              <button
                onClick={() => setAvatarDataUrl(null)}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-0.5"
              >
                <X size={10} /> Remove
              </button>
            )}
          </div>
          {avatarError && (
            <p className="text-[11px] text-red-400 text-center">{avatarError}</p>
          )}
        </div>

        {/* Display name */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How should characters address you?"
            className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition-colors shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
