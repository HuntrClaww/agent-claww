import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Zap, Settings2, Bot, Users, SlidersHorizontal, Trash2, HelpCircle, Activity, Download } from 'lucide-react';
import HelpPopup from './HelpPopup';
import { validateAPIKey } from '../lib/apiValidator';
import { listCharacters, deleteCharacter } from '../lib/characterStore';
import { getRecentLogs, getLogStats, exportLogsAsJSON, clearAllLogs, type APILogEntry, type LogStats } from '../lib/apiLogger';

type SettingsTab = 'general' | 'assistant' | 'characters' | 'advanced' | 'diagnostics';

const TABS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'assistant', label: 'Standard Assistant', icon: Bot },
  { id: 'characters', label: 'Character Management', icon: Users },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
  { id: 'diagnostics', label: 'Performance Log', icon: Activity },
];

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [apiKey, setApiKey] = useState('');
  const [profanityFilter, setProfanityFilter] = useState('medium');
  const [temperature, setTemperature] = useState(1.0);
  const [reduceEffects, setReduceEffects] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [showKeyHelp, setShowKeyHelp] = useState(false);

  // Diagnostics / performance log state
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<APILogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [clearLogsConfirm, setClearLogsConfirm] = useState(false);

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
      setReduceEffects(localStorage.getItem('reduce_visual_effects') === 'true');
      setCharacterCount(listCharacters().length);
      setValidationStatus('idle');
      setValidationMessage('');
      setClearConfirm(false);
      setClearLogsConfirm(false);
      setActiveTab('general');
    }
  }, [isOpen]);

  // Load diagnostics data on demand - only when that tab is actually
  // opened, so it never costs anything for people who never look at it.
  useEffect(() => {
    if (activeTab !== 'diagnostics' || !isOpen) return;
    let cancelled = false;
    setLogsLoading(true);
    Promise.all([getLogStats(), getRecentLogs(50)]).then(([stats, logs]) => {
      if (cancelled) return;
      setLogStats(stats);
      setRecentLogs(logs);
      setLogsLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, isOpen]);

  const handleExportLogs = async () => {
    const json = await exportLogsAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stageego-api-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = async () => {
    if (!clearLogsConfirm) {
      setClearLogsConfirm(true);
      return;
    }
    await clearAllLogs();
    setLogStats(await getLogStats());
    setRecentLogs([]);
    setClearLogsConfirm(false);
  };

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
    localStorage.setItem('reduce_visual_effects', String(reduceEffects));

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
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-2">
                    Your API Key (OpenAI / Anthropic / Google Gemini)
                    <button
                      type="button"
                      onClick={() => setShowKeyHelp(true)}
                      title="How do I get an API key?"
                      className="text-slate-500 hover:text-teal-300 transition-colors"
                    >
                      <HelpCircle size={15} />
                    </button>
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

                <div className="pt-2 border-t border-slate-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-4">
                      <span className="text-sm font-medium text-slate-300">Reduce Visual Effects</span>
                      <p className="text-xs text-slate-500 mt-1">
                        Turns off the glass-blur and glow animations on buttons and the input field. Full effects are on by default — switch this on only if the app feels slow or laggy on your device.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reduceEffects}
                      onClick={() => setReduceEffects(v => !v)}
                      className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${
                        reduceEffects ? 'bg-teal-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          reduceEffects ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">API Performance Log</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportLogs}
                      disabled={!logStats || logStats.totalCalls === 0}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
                    >
                      <Download size={13} /> Export
                    </button>
                    <button
                      onClick={handleClearLogs}
                      disabled={!logStats || logStats.totalCalls === 0}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        clearLogsConfirm ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      <Trash2 size={13} /> {clearLogsConfirm ? 'Confirm clear' : 'Clear'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 -mt-3">
                  Kept locally in this browser only, for the last 7 days. Not sent anywhere.
                </p>

                {logsLoading && <p className="text-sm text-slate-500">Loading…</p>}

                {!logsLoading && logStats && logStats.totalCalls === 0 && (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-500">
                    No API calls logged yet. Send a message to a character and this fills in automatically.
                  </div>
                )}

                {!logsLoading && logStats && logStats.totalCalls > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Total calls</div>
                        <div className="text-lg font-semibold text-slate-200">{logStats.totalCalls}</div>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Errors</div>
                        <div className={`text-lg font-semibold ${logStats.errorCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>{logStats.errorCount}</div>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Avg latency</div>
                        <div className="text-lg font-semibold text-slate-200">{logStats.avgLatencyMs}ms</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">By provider</div>
                      {Object.entries(logStats.byProvider).map(([provider, s]) => (
                        <div key={provider} className="flex items-center justify-between text-sm bg-slate-900/30 rounded-lg px-3 py-2">
                          <span className="text-slate-300 capitalize">{provider}</span>
                          <span className="text-slate-500 text-xs">
                            {s.calls} call{s.calls === 1 ? '' : 's'} · {s.errors} error{s.errors === 1 ? '' : 's'} · avg {s.avgLatencyMs}ms
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent calls</div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {recentLogs.map(log => (
                          <div key={log.id} className="flex items-center justify-between text-xs bg-slate-900/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                log.status === 'success' ? 'bg-green-400' : log.status === 'cancelled' ? 'bg-slate-500' : 'bg-red-400'
                              }`} />
                              <span className="text-slate-300 capitalize shrink-0">{log.provider}</span>
                              <span className="text-slate-500 truncate">
                                {log.errorMessage ? log.errorMessage : `${log.latencyMs}ms`}
                              </span>
                            </div>
                            <span className="text-slate-600 shrink-0 ml-2">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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

      {/* API key help popup */}
      {showKeyHelp && <HelpPopup topicId="api-key" onClose={() => setShowKeyHelp(false)} />}
    </div>
  );
}
