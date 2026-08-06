import { useState, useEffect } from 'react';

export default function UserProfileModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // Load from local storage when opened
    useEffect(() => {
        if (isOpen) {
            setDisplayName(localStorage.getItem('user_display_name') || 'Guest User');
            setAvatarUrl(localStorage.getItem('user_avatar_url') || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('user_display_name', displayName);
        localStorage.setItem('user_avatar_url', avatarUrl);
        // Dispatch a custom event so the Sidebar updates instantly without a page refresh
        window.dispatchEvent(new Event('profileUpdated'));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-xl p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-teal-400 mb-6">Edit Profile</h2>

                <div className="space-y-5">
                    {/* Avatar Preview & Input */}
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full bg-slate-700 border-2 border-teal-500 overflow-hidden flex items-center justify-center">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl text-slate-400">{displayName.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Avatar Image URL</label>
                        <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://example.com/avatar.png"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors"
                    >
                        Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
