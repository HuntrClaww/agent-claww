import { useState, useRef, useEffect } from 'react';
import SettingsModal from './SettingsModal';
import CharacterSelect from './CharacterSelect';
import Sidebar from './Sidebar';
import { Menu, AlertCircle, CheckCircle, Zap, Shuffle, Lock } from 'lucide-react';
import { APIClient, detectAPIProvider } from '../lib/apiClient';

// Define what a single message looks like
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

// Parses the mode string coming out of CharacterSelect:
//   'generic'                              -> Generic Mode
//   'personality:off-script:Sherlock Holmes' -> Personality Mode
interface ActiveMode {
  kind: 'generic' | 'personality';
  characterName?: string;
  behavior?: 'true-to-character' | 'off-script';
}

function parseMode(raw: string): ActiveMode {
  if (raw === 'generic') return { kind: 'generic' };
  const [, behavior, ...nameParts] = raw.split(':');
  return {
    kind: 'personality',
    behavior: behavior as ActiveMode['behavior'],
    characterName: nameParts.join(':'),
  };
}

export default function ChatWindow({ isGuest }: { isGuest: boolean }) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // API status tracking
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiMessage, setApiMessage] = useState('');
  const [apiClient, setApiClient] = useState<APIClient | null>(null);

  // Reference to the bottom of the chat for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track abort controller for fetch cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initialize API client when settings change
  useEffect(() => {
    const initializeAPI = async () => {
      const apiKey = localStorage.getItem('user_api_key');
      if (apiKey && apiKey.trim()) {
        const provider = await detectAPIProvider(apiKey);
        if (provider) {
          setApiClient(new APIClient({ 
            provider, 
            apiKey,
            model: provider === 'anthropic' ? 'claude-opus-4-1' : undefined
          }));
          setApiStatus('success');
          setApiMessage(`Using ${provider} API`);
        }
      }
    };

    initializeAPI();
    window.addEventListener('profileUpdated', initializeAPI);
    return () => window.removeEventListener('profileUpdated', initializeAPI);
  }, []);

  // Send real API request
  const sendAPIRequest = async (userText: string, character: string): Promise<string> => {
    if (!apiClient) {
      setApiStatus('error');
      setApiMessage('No API configured. Add one in Settings.');
      return 'No API configured. Add one in Settings.';
    }

    setApiStatus('loading');
    setApiMessage('Sending to AI...');

    try {
      abortControllerRef.current = new AbortController();
      const response = await apiClient.sendMessage(userText, character);

      if (response.success && response.content) {
        setApiStatus('success');
        setApiMessage(`Response from ${response.provider || 'AI'}`);
        return response.content;
      } else {
        setApiStatus('error');
        setApiMessage(response.error || 'Failed to get response from API');
        return response.error || 'API request failed.';
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setApiStatus('error');
      setApiMessage(errorMsg);
      return `Error: ${errorMsg}`;
    }
  };

  // Handle starting a new chat
  const handleNewChat = () => {
    // Cancel any pending API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsTyping(false);
    setActiveMode(null);
    setMessages([]);
    setIsSidebarOpen(false);
    setApiStatus('idle');
    setApiMessage('');
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    // 1. Add user message to the screen instantly
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    const character = activeMode?.kind === 'personality'
      ? activeMode.characterName || 'Character'
      : 'Assistant';
    const prompt = inputText;
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // 2. Send to real API
    const aiResponse = await sendAPIRequest(prompt, character);
    const newAiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: aiResponse,
    };
    setMessages(prev => [...prev, newAiMsg]);
    setIsTyping(false);
  };

  // Allow sending with the Enter key (respecting the same guards as the button)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim() && !isTyping) {
      handleSend();
    }
  };

  // Minimal renderer so **bold** in AI replies is displayed as actual bold text
  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.length > 4 && part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-teal-300">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans w-full overflow-hidden">
      <Sidebar 
        isGuest={isGuest} 
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onNewChat={handleNewChat}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 bg-slate-800 border-b border-slate-700">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300 hover:text-white mr-4">
            <Menu size={24} />
          </button>
          <ModeTitle mode={activeMode} className="flex-1" />
          {/* Status Indicator */}
          <div className="flex items-center gap-1 text-xs">
            {apiStatus === 'success' && <CheckCircle size={16} className="text-green-400" />}
            {apiStatus === 'error' && <AlertCircle size={16} className="text-red-400" />}
            {apiStatus === 'loading' && <Zap size={16} className="text-yellow-400 animate-pulse" />}
          </div>
        </div>

        {/* Desktop Header (only shown once a mode is active) */}
        {activeMode && (
          <div className="hidden md:flex items-center px-6 py-3.5 bg-slate-800/60 border-b border-slate-700/80 backdrop-blur-sm">
            <ModeTitle mode={activeMode} className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {apiStatus === 'success' && <CheckCircle size={14} className="text-green-400" />}
              {apiStatus === 'error' && <AlertCircle size={14} className="text-red-400" />}
              {apiStatus === 'loading' && <Zap size={14} className="text-yellow-400 animate-pulse" />}
              <span>{apiMessage || 'No AI provider configured'}</span>
            </div>
          </div>
        )}

        {!activeMode ? (
          <CharacterSelect onSelect={(mode) => {
            const parsed = parseMode(mode);
            setActiveMode(parsed);
            const greeting = parsed.kind === 'generic'
              ? "You're in **Generic Mode**. Ask me about any character, or tell me who to become."
              : `**${parsed.characterName}** is locked in, running **${parsed.behavior === 'true-to-character' ? 'True-to-Character' : 'Off-Script'}**. Say hello.`;
            setMessages([{
              id: Date.now().toString(),
              role: 'ai',
              content: greeting,
            }]);
          }} />
        ) : (
          <>
            {/* Dynamic Chat History Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex flex-col space-y-6 max-w-3xl mx-auto">
                
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg'
                        : activeMode?.kind === 'personality'
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 shadow-lg'
                          : 'bg-gradient-to-br from-cyan-500 to-teal-600 text-slate-900 shadow-lg'
                    }`}>
                      {msg.role === 'user'
                        ? 'U'
                        : activeMode?.kind === 'personality'
                          ? (activeMode.characterName?.[0] || 'C').toUpperCase()
                          : 'AI'}
                    </div>

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-2xl max-w-[80%] transition-all duration-200 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-tr-sm shadow-md hover:shadow-lg' 
                        : 'bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 text-slate-100 rounded-tl-sm shadow-md hover:shadow-lg backdrop-blur-sm'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap text-sm">{renderContent(msg.content)}</p>
                    </div>

                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-4 animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center font-bold text-slate-900 shrink-0 shadow-lg text-xs">
                      AI
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-tl-sm flex items-center gap-1.5 shadow-md">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}

                {/* Invisible element to force scroll to bottom */}
                <div ref={messagesEndRef} />

              </div>
            </div>

            {/* API Status Display */}
            {apiMessage && (
              <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
                apiStatus === 'error' ? 'bg-red-900/20 text-red-300 border-t border-red-700' :
                apiStatus === 'loading' ? 'bg-yellow-900/20 text-yellow-300 border-t border-yellow-700' :
                'bg-green-900/20 text-green-300 border-t border-green-700'
              }`}>
                {apiStatus === 'error' && <AlertCircle size={14} />}
                {apiStatus === 'loading' && <Zap size={14} className="animate-pulse" />}
                {apiStatus === 'success' && <CheckCircle size={14} />}
                {apiMessage}
              </div>
            )}

            {/* Input Field */}
            <div className="p-4 border-t border-slate-800 bg-gradient-to-t from-slate-900 to-slate-800">
              <div className="max-w-3xl mx-auto flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value.slice(0, 2000))}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        activeMode?.kind === 'generic'
                          ? 'Ask about a character, or say "be ___"...'
                          : `Message ${activeMode?.characterName || 'your character'}...`
                      }
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/30 transition-all placeholder-slate-500 shadow-inner hover:border-slate-500"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isTyping}
                    className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:shadow-sm disabled:hover:shadow-md"
                  >
                    Send
                  </button>
                </div>
                {inputText.length > 1600 && (
                  <span className="self-end text-[11px] text-slate-500 pr-1">
                    {inputText.length}/2000
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

// Small header label that reflects which side of the coin is active
function ModeTitle({ mode, className = '' }: { mode: ActiveMode | null; className?: string }) {
  if (!mode) {
    return <h1 className={`text-lg font-bold text-slate-300 ${className}`}>New Chat</h1>;
  }

  if (mode.kind === 'generic') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Shuffle size={16} className="text-cyan-400 shrink-0" />
        <h1 className="text-lg font-bold text-slate-100">Generic Mode</h1>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <Lock size={15} className="text-amber-400 shrink-0" />
      <h1 className="text-lg font-bold text-slate-100 truncate">{mode.characterName}</h1>
      <span className="text-[10px] uppercase tracking-wide text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
        {mode.behavior === 'true-to-character' ? 'Strict' : 'Off-Script'}
      </span>
    </div>
  );
}
