import { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [profanityFilter, setProfanityFilter] = useState('medium');

  // Load saved settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('user_api_key') || '';
      const savedFilter = localStorage.getItem('profanity_filter') || 'medium';
      setApiKey(savedKey);
      setProfanityFilter(savedFilter);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('user_api_key', apiKey);
    localStorage.setItem('profanity_filter', profanityFilter);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-teal-400 mb-6">Settings</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your API Key (OpenAI / Gemini / Claude)
            </label>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-2">
              Keys are stored locally in your browser unless you create an account.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Profanity Tolerance
            </label>
            <select 
              value={profanityFilter}
              onChange={(e) => setProfanityFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value="strict">Strict (No profanity)</option>
              <option value="medium">Medium (Light slang allowed)</option>
              <option value="off">Off (Freedom to express)</option>
            </select>
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
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
