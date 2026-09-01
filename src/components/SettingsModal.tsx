import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Zap, Settings2, Bot, Users, SlidersHorizontal, Trash2 } from 'lucide-react';
import { validateAPIKey } from '../lib/apiValidator';
import { listCharacters, deleteCharacter } from '../lib/characterStore';

type SettingsTab = 'general' | 'assistant' | 'characters' | 'advanced';

const TABS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'assistant', label: 'Standard Assistant', icon: Bot },
  { id: 'characters', label: 'Character Management', icon: Users },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
];

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [apiKey, setApiKey] = useState('');
  const [profanityFilter, setProfanityFilter] = useState('medium');
  const [temperature, setTemperature] = useState(1.0);
  const [characterCount, setCharacterCount] = useState(0);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Validation state
  const [validationStatus, setValidationStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  // Load saved settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('user_api_key') || '';
      const savedFilter = localStorage.getItem('profanity_filter') || 'medium';
      const savedTemp = localStorage.getItem('ai_temperature');
      setApiKey(savedKey);
      setProfanityFilter(savedFilter);
      setTemperature(savedTemp ? parseFloat(savedTemp) : 1.0);
      setCharacterCount(listCharacters().length);
      setValidationStatus('idle');
      setValidationMessage('');
      setClearConfirm(false);
      setActiveTab('general');
    }
  }, [isOpen]);

  const handleTestAPI = async () => {
    if (!apiKey.trim()) {
      setValidationStatus('error');
      setValidationMessage('Please enter an API key first.');
      return;
    }

    setValidationStatus('testing');
    setValidationMessage('Testing API key...');

    const result = await validateAPIKey(apiKey);
    
    if (result.isValid) {
      setValidationStatus('success');
      setValidationMessage(result.message);
    } else {
      setValidationStatus('error');
      setValidationMessage(result.message);
    }
  };

  const handleClearAllCharacters = () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    listCharacters().forEach(c => deleteCharacter(c.id));
    setCharacterCount(0);
    setClearConfirm(false);
  };

  const handleSave = () => {
    localStorage.setItem('user_api_key', apiKey);
    localStorage.setItem('profanity_filter', profanityFilter);
    localStorage.setItem('ai_temperature', String(temperature));

    // Trigger refresh in other components
    window.dispatchEvent(new Event('profileUpdated'));

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-teal-400">🎭 StageEgo Settings</h2>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Vertical tab rail */}
          <div className="w-48 shrink-0 border-r border-slate-700 p-3 space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Data & Privacy</h3>
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-1">
                    You have <span className="font-semibold text-teal-300">{characterCount}</span> saved character{characterCount === 1 ? '' : 's'}.
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    Characters, API keys, and preferences are stored only in this browser — never on a server.
                  </p>
                  <button
                    onClick={handleClearAllCharacters}
                    disabled={characterCount === 0}
                    className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      clearConfirm
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    <Trash2 size={14} />
                    {clearConfirm ? 'Click again to confirm — this cannot be undone' : 'Clear all characters'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'assistant' && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">API Configuration</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Your API Key (OpenAI / Anthropic / Google Gemini)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setValidationStatus('idle');
                      setValidationMessage('');
                    }}
                    placeholder="Paste your API key here..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Keys are stored locally in your browser. Never shared with servers.
                  </p>

                  {validationMessage && (
                    <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${
                      validationStatus === 'error' ? 'bg-red-900/20 text-red-300 border border-red-700' :
                      validationStatus === 'testing' ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-700' :
                      'bg-green-900/20 text-green-300 border border-green-700'
                    }`}>
                      {validationStatus === 'error' && <AlertCircle size={16} className="flex-shrink-0" />}
                      {validationStatus === 'testing' && <Zap size={16} className="flex-shrink-0 animate-pulse" />}
                      {validationStatus === 'success' && <CheckCircle size={16} className="flex-shrink-0" />}
                      <span>{validationMessage}</span>
                    </div>
                  )}

                  <button
                    onClick={handleTestAPI}
                    disabled={validationStatus === 'testing' || !apiKey.trim()}
                    className="w-full mt-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors text-slate-300 text-sm"
                  >
                    {validationStatus === 'testing' ? 'Testing...' : 'Test API Connection'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Content</h3>
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
                  <p className="text-xs text-slate-500 mt-2">
                    Applies to all characters. Manage individual characters (upload, fork, delete) from the character picker.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Model Parameters</h3>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">Temperature</label>
                    <span className="text-sm text-teal-300 font-mono">{temperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Lower values (0–0.5) make responses more focused and predictable. Higher values (1.5–2.0) make them more varied and creative.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
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
