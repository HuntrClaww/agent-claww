import { useState, useRef, useEffect } from 'react';
import SettingsModal from './SettingsModal';
import CharacterSelect from './CharacterSelect';
import CharacterPortrait from './CharacterPortrait';
import Sidebar from './Sidebar';
import { Menu, AlertCircle, CheckCircle, Zap, Shuffle, Lock, Volume2, VolumeX } from 'lucide-react';
import { APIClient, detectAPIProvider } from '../lib/apiClient';
import { fetchCharacterInfo, citationTag } from '../lib/characterFetch';
import { getCharacter, resolvePortraitForEmotion } from '../lib/characterStore';
import { parseEmotion, EMOTION_TAG_INSTRUCTION, type Emotion } from '../lib/emotionDetect';
import { speakQueue, stopSpeaking, splitIntoSentences, isVoiceSupported } from '../lib/voiceEngine';

// Define what a single message looks like
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citation?: string; // e.g. "via Fandom" - shown when character info was fetched
  emotion?: Emotion; // detected emotion for this AI message
}

// Parses the mode string coming out of CharacterSelect:
//   'generic'                                            -> Generic Mode
//   'personality:off-script:Sherlock Holmes:char_123_abc' -> Personality Mode
interface ActiveMode {
  kind: 'generic' | 'personality';
  characterName?: string;
  characterId?: string;
  behavior?: 'true-to-character' | 'off-script';
}

function parseMode(raw: string): ActiveMode {
  if (raw === 'generic') return { kind: 'generic' };
  const parts = raw.split(':');
  const [, behavior] = parts;
  const characterId = parts[parts.length - 1];
  const characterName = parts.slice(2, -1).join(':');
  return {
    kind: 'personality',
    behavior: behavior as ActiveMode['behavior'],
    characterName,
    characterId,
  };
}

// Detects "be X" / "become X" / "switch to X" / "now be X" in Generic Mode
// messages so the app knows when to fetch character info and re-embody.
const CHARACTER_SWITCH_PATTERN = /(?:^|\b)(?:now\s+)?(?:be|become|switch\s+to|roleplay\s+as|act\s+as)\s+(.+?)[.!?]*$/i;

function detectCharacterSwitch(message: string): string | null {
  const match = message.trim().match(CHARACTER_SWITCH_PATTERN);
  return match ? match[1].trim() : null;
}

export default function ChatWindow({ isGuest }: { isGuest: boolean }) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Generic Mode only: which character the AI is currently embodying
  const [genericCharacter, setGenericCharacter] = useState<string | null>(null);

  // Generic Mode session cache: maps normalised character name → fetched CharacterInfo.
  // Persists for the lifetime of this chat session (cleared on handleNewChat).
  // Prevents re-fetching the same character if the user switches away and back.
  const genericCharacterCache = useRef<Map<string, import('../lib/characterFetch').CharacterInfo | null>>(new Map());

  // Voice Mode: when on, AI responses are read aloud via voiceEngine.
  // Persisted across sessions since it's a user preference, not per-chat state.
  const [voiceModeOn, setVoiceModeOn] = useState(() => localStorage.getItem('voice_mode_on') === 'true');
  const toggleVoiceMode = () => {
    setVoiceModeOn(prev => {
      const next = !prev;
      localStorage.setItem('voice_mode_on', String(next));
      if (!next) stopSpeaking(); // turning off mid-speech should cut it immediately
      return next;
    });
  };

  // Current portrait emotion (Personality Mode only) - reflects the AI's most recent message
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  
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
          const storedTemp = localStorage.getItem('ai_temperature');
          const temperature = storedTemp ? parseFloat(storedTemp) : undefined;
          setApiClient(new APIClient({ 
            provider, 
            apiKey,
            model: provider === 'anthropic' ? 'claude-opus-4-1' : undefined,
            temperature: temperature !== undefined && !isNaN(temperature) ? temperature : undefined,
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
  const sendAPIRequest = async (userText: string, character: string, extraContext?: string): Promise<string> => {
    if (!apiClient) {
      setApiStatus('error');
      setApiMessage('No API configured. Add one in Settings.');
      return 'No API configured. Add one in Settings.';
    }

    setApiStatus('loading');
    setApiMessage('Sending to AI...');

    try {
      abortControllerRef.current = new AbortController();
      const response = await apiClient.sendMessage(userText, character, extraContext);

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
    setGenericCharacter(null);
    genericCharacterCache.current.clear();
    stopSpeaking();
    setCurrentEmotion('neutral');
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
    const prompt = inputText;
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // 2. In Generic Mode, detect "be X" / "become X" and fetch character info
    let character = activeMode?.kind === 'personality'
      ? activeMode.characterName || 'Character'
      : genericCharacter || 'Assistant';
    let extraContext: string | undefined;
    let citation: string | undefined;

    if (activeMode?.kind === 'generic') {
      const switchTo = detectCharacterSwitch(prompt);
      if (switchTo) {
        const cacheKey = switchTo.toLowerCase().trim();
        let info: import('../lib/characterFetch').CharacterInfo | null | undefined =
          genericCharacterCache.current.get(cacheKey);

        if (info === undefined) {
          // Cache miss — fetch and store (null stored on miss so we don't re-fetch)
          setApiStatus('loading');
          setApiMessage(`Looking up ${switchTo}...`);
          info = await fetchCharacterInfo(switchTo);
          genericCharacterCache.current.set(cacheKey, info ?? null);
        } else {
          console.log(`[genericCache] Cache hit for "${switchTo}" — skipping fetch`);
        }

        if (info) {
          character = info.name;
          extraContext = [info.summary, info.personality, info.background]
            .filter(Boolean)
            .join('\n\n');
          citation = citationTag(info);
        } else {
          character = switchTo; // fall back to model's own knowledge, no citation
        }
        setGenericCharacter(character);
      }
    } else if (activeMode?.kind === 'personality') {
      // Personality Mode: send the character's stored bio (if any), any
      // curated fork seed context, plus the emotion-tracking instruction
      // for the portrait panel.
      const saved = activeMode.characterId ? getCharacter(activeMode.characterId) : undefined;
      const bio = saved
        ? [saved.summary, saved.personality, saved.background].filter(Boolean).join('\n\n')
        : undefined;
      const seed = saved?.seedContext
        ? `Carried over from a previous character by the user's own choice:\n${saved.seedContext}`
        : undefined;
      extraContext = [bio, seed, EMOTION_TAG_INSTRUCTION].filter(Boolean).join('\n\n');
    }

    // 3. Send to real API
    const aiResponse = await sendAPIRequest(prompt, character, extraContext);
    const { cleanedText, emotion } = parseEmotion(aiResponse);
    const newAiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: cleanedText,
      citation,
      emotion,
    };
    setMessages(prev => [...prev, newAiMsg]);
    if (activeMode?.kind === 'personality') {
      setCurrentEmotion(emotion);
    }
    setIsTyping(false);

    // Voice Mode: speak the response aloud. Personality Mode characters
    // may have their own voiceSettings saved; Generic Mode always uses
    // the browser default voice since fetched characters aren't stored.
    if (voiceModeOn && isVoiceSupported() && cleanedText.trim()) {
      const savedChar = activeMode?.kind === 'personality' && activeMode.characterId
        ? getCharacter(activeMode.characterId)
        : undefined;
      speakQueue(splitIntoSentences(cleanedText), savedChar?.voiceSettings);
    }
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

  // The active character's theme color, if one was set at creation time
  const activeThemeColor =
    activeMode?.kind === 'personality' && activeMode.characterId
      ? getCharacter(activeMode.characterId)?.themeColor
      : undefined;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans w-full overflow-hidden">
      <Sidebar 
        isGuest={isGuest} 
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onNewChat={handleNewChat}
      />

      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        style={activeThemeColor ? ({ '--character-accent': activeThemeColor } as React.CSSProperties) : undefined}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 bg-slate-800 border-b border-slate-700">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300 hover:text-white mr-4">
            <Menu size={24} />
          </button>
          <ModeTitle mode={activeMode} genericCharacter={genericCharacter} className="flex-1" />
          <div className="flex items-center gap-2 text-xs">
            {isVoiceSupported() && activeMode && (
              <button
                onClick={toggleVoiceMode}
                className={`p-1 rounded transition-colors ${voiceModeOn ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                aria-label={voiceModeOn ? 'Turn voice off' : 'Turn voice on'}
                title={voiceModeOn ? 'Voice Mode: on' : 'Voice Mode: off'}
              >
                {voiceModeOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            )}
            {apiStatus === 'success' && <CheckCircle size={16} className="text-green-400" />}
            {apiStatus === 'error' && <AlertCircle size={16} className="text-red-400" />}
            {apiStatus === 'loading' && <Zap size={16} className="text-yellow-400 animate-pulse" />}
          </div>
        </div>

        {/* Desktop Header (only shown once a mode is active) */}
        {activeMode && (
          <div className="hidden md:flex items-center px-6 py-3.5 bg-slate-800/60 border-b border-slate-700/80 backdrop-blur-sm">
            <ModeTitle mode={activeMode} genericCharacter={genericCharacter} className="flex-1" />
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {isVoiceSupported() && (
                <button
                  onClick={toggleVoiceMode}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${voiceModeOn ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}
                  aria-label={voiceModeOn ? 'Turn voice off' : 'Turn voice on'}
                >
                  {voiceModeOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>Voice</span>
                </button>
              )}
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
              : `**${parsed.characterName}** is locked in, running **${parsed.behavior === 'true-to-character' ? 'Lore-Locked' : 'Open-World'}**. Say hello.`;
            setMessages([{
              id: Date.now().toString(),
              role: 'ai',
              content: greeting,
            }]);
          }} />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Character Portrait Panel - Personality Mode, desktop only */}
            {activeMode.kind === 'personality' && (() => {
              const savedChar = activeMode.characterId ? getCharacter(activeMode.characterId) : undefined;
              return (
                <div className="hidden md:block w-64 shrink-0 p-4 border-r border-slate-800">
                  <CharacterPortrait
                    characterName={activeMode.characterName || 'Character'}
                    emotion={currentEmotion}
                    portraitUrl={savedChar ? resolvePortraitForEmotion(savedChar, currentEmotion) : undefined}
                  />
                </div>
              );
            })()}

            <div className="flex-1 flex flex-col overflow-hidden">
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
                          : (genericCharacter?.[0] || 'A').toUpperCase()}
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={msg.role === 'ai' && activeThemeColor ? { borderLeft: `3px solid ${activeThemeColor}` } : undefined}
                      className={`p-4 rounded-2xl max-w-[80%] transition-all duration-200 ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-tr-sm shadow-md hover:shadow-lg' 
                          : 'bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 text-slate-100 rounded-tl-sm shadow-md hover:shadow-lg backdrop-blur-sm'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap text-sm">{renderContent(msg.content)}</p>
                      {msg.citation && (
                        <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700/60">
                          {msg.citation}
                        </p>
                      )}
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
                    style={activeThemeColor ? { background: activeThemeColor } : undefined}
                    className={`${activeThemeColor ? '' : 'bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600'} disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:shadow-sm disabled:hover:shadow-md`}
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
            </div>
          </div>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

// Small header label that reflects which side of the coin is active
function ModeTitle({
  mode,
  genericCharacter,
  className = '',
}: {
  mode: ActiveMode | null;
  genericCharacter?: string | null;
  className?: string;
}) {
  if (!mode) {
    return <h1 className={`text-lg font-bold text-slate-300 ${className}`}>New Chat</h1>;
  }

  if (mode.kind === 'generic') {
    return (
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        <Shuffle size={16} className="text-cyan-400 shrink-0" />
        <h1 className="text-lg font-bold text-slate-100 truncate">
          {genericCharacter || 'Generic Mode'}
        </h1>
        {genericCharacter && (
          <span className="text-[10px] uppercase tracking-wide text-cyan-300/80 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5 shrink-0">
            Switchable
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <Lock size={15} className="text-amber-400 shrink-0" />
      <h1 className="text-lg font-bold text-slate-100 truncate">{mode.characterName}</h1>
      <span className="text-[10px] uppercase tracking-wide text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
        {mode.behavior === 'true-to-character' ? 'Lore-Locked' : 'Open-World'}
      </span>
    </div>
  );
}
