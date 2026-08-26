import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { validateAPIKey } from '../lib/apiValidator';

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [profanityFilter, setProfanityFilter] = useState('medium');
  
  // Validation state
  const [validationStatus, setValidationStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  // Load saved settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('user_api_key') || '';
      const savedFilter = localStorage.getItem('profanity_filter') || 'medium';
      setApiKey(savedKey);
      setProfanityFilter(savedFilter);
      setValidationStatus('idle');
      setValidationMessage('');
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

  const handleSave = () => {
    localStorage.setItem('user_api_key', apiKey);
    localStorage.setItem('profanity_filter', profanityFilter);
    
    // Trigger refresh in other components
    window.dispatchEvent(new Event('profileUpdated'));
    
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
            
            {/* Validation Feedback */}
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

            {/* Test API Button */}
            <button
              onClick={handleTestAPI}
              disabled={validationStatus === 'testing' || !apiKey.trim()}
              className="w-full mt-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors text-slate-300 text-sm"
            >
              {validationStatus === 'testing' ? 'Testing...' : 'Test API Connection'}
            </button>
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
