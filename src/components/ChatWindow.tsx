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

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle starting a new chat
  const handleNewChat = () => {
    setActiveCharacter(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  // Handle sending a message
  const handleSend = () => {
    if (!inputText.trim()) return;

    // 1. Add user message to the screen instantly
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // 2. Mock AI Response (We will replace this with real AI later)
    setTimeout(() => {
      const newAiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: `This is a mock response from your ${activeCharacter} character! Connect an API key later to make me real.` 
      };
      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
    }, 1500); // Wait 1.5 seconds to simulate "thinking"
  };

  // Allow sending with the Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
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
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
