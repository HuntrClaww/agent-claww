import { useState, useRef, useEffect } from 'react';
import SettingsModal from './SettingsModal';
import CharacterSelect from './CharacterSelect';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

// Define what a single message looks like
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function ChatWindow({ isGuest }: { isGuest: boolean }) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Reference to the bottom of the chat for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track the pending mock-response timeout so we can cancel it
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Clean up any pending timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Build a mode + settings aware mock reply (replaced by a real AI call later)
  const buildMockReply = (character: string, userText: string): string => {
    const filter = localStorage.getItem('profanity_filter') || 'medium';
    const apiKey = localStorage.getItem('user_api_key');
    const hasKey = Boolean(apiKey && apiKey.trim());

    const isQuestion = userText.trim().endsWith('?');

    if (hasKey) {
      // An API key is configured — acknowledge it so the demo feels connected
      const tone = isQuestion ? "Here's my take on that" : "Got it";
      const opener =
        filter === 'off'
          ? `${tone} — I'm in full "Freedom to Express" mode, so no filters hold me back. I'd say it straight.`
          : filter === 'strict'
          ? `${tone} — I'll keep things clean and family-friendly, per your Strict setting.`
          : `${tone} — I'll keep a light tone as you requested.`;
      return `${opener}\n\n(Simulated response from your **${character}** character. Real API hookup is the next step.)`;
    }

    // No API key yet — nudge the user to add one in Settings
    return `This is a mock response from your **${character}** character.\nTo make me real, add an API key in Settings (⚙️ in the sidebar).`;
  };

  // Handle starting a new chat
  const handleNewChat = () => {
    // Cancel any pending mock response so it can't leak into the new chat
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setActiveCharacter(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  // Handle sending a message
  const handleSend = () => {
    if (!inputText.trim() || isTyping) return;

    // 1. Add user message to the screen instantly
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    const character = activeCharacter;
    const prompt = inputText;
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // 2. Mock AI Response (We will replace this with real AI later)
    typingTimeoutRef.current = setTimeout(() => {
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: buildMockReply(character ?? 'AI', prompt),
      };
      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }, 1500); // Wait 1.5 seconds to simulate "thinking"
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
          <h1 className="text-lg font-bold text-teal-400 capitalize">
            {activeCharacter || 'New Chat'}
          </h1>
        </div>

        {!activeCharacter ? (
          <CharacterSelect onSelect={(mode) => {
            setActiveCharacter(mode);
            // Add initial welcome message when a character is chosen
            setMessages([{
              id: Date.now().toString(),
              role: 'ai',
              content: `Mode activated: **${mode}**. Let's get started!`
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                      msg.role === 'user' ? 'bg-slate-600 text-slate-200' : 'bg-teal-500 text-slate-900'
                    }`}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-2xl max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-teal-600 text-white rounded-tr-sm' 
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm shadow-sm'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{renderContent(msg.content)}</p>
                    </div>

                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-900 shrink-0">
                      AI
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-sm flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}

                {/* Invisible element to force scroll to bottom */}
                <div ref={messagesEndRef} />

              </div>
            </div>

            {/* Input Field */}
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              <div className="max-w-3xl mx-auto flex gap-2">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..." 
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 transition-colors placeholder-slate-500 shadow-inner"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputText.trim() || isTyping}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium transition-colors shadow-md"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
