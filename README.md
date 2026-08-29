# 🎭 StageEgo - AI Character Chatbot Platform

**StageEgo is a customizable AI character chatbot platform where you can chat with AI agents (Claude/GPT/Gemini) that embody specific character personalities.**

Choose between two modes:
- **Generic Mode**: Chat with any character, search character databases, switch characters anytime
- **Personality Mode**: Lock to one character with access to their full history and let them learn/develop

---

## The Two-Sided Coin

### SIDE 1: GENERIC MODE
**Chat with any character, anytime**

- No character lock - switch freely
- AI searches internet archives, anime fandoms, character databases
- User says "Be Sherlock" → AI searches and embodies Sherlock instantly
- User says "Now be Harley Quinn" → AI switches instantly
- Each character learned on-demand through searching
- Perfect for exploring different characters and personalities

**Example:**
```
User: "Tell me about Sherlock Holmes"
AI: [Searches character databases] "Sherlock Holmes is..."

User: "Now roleplay as Sherlock"
AI: [Integrates personality] "Elementary. What case do you bring me?"

User: "Switch to Harley Quinn"
AI: [Searches/switches] "Hiya puddin'! What's up?"
```

### SIDE 2: PERSONALITY MODE
**Deep roleplay with one locked character**

Choose your character and pick ONE behavioral approach:

#### True-to-Character (Strict)
- Stays exactly as source material defines
- Won't acknowledge modern world or break character
- Example: Victorian Sherlock stays in Victorian London

#### Off-Script / Development (Learning)
- **Same as Development Mode - they are identical**
- Character's core personality locked, but can learn and develop
- Has access to character's full history AND modern information
- Can break fourth wall, acknowledge AI nature
- Character evolves through conversation while staying true to core

**Example:**
```
True-to-Character:
User: "What do you think of smartphones?"
Sherlock: "I haven't the faintest notion what you're referring to."

Off-Script/Development:
User: "What do you think of smartphones?"
Sherlock: "Fascinating. A computational device with wireless connectivity. 
The deductive logic remains the same, though the tools have evolved."
```

---

## 🚀 Key Features

### Multi-Provider AI Support
- **Anthropic Claude** — Opus 4.1 for depth
- **OpenAI** — GPT-4o-mini for speed
- **Google Gemini** — Pro for versatility
- Auto-detection from API key format
- Real-time validation and testing

### Character System
- Generic mode: Search and learn any character on-demand
- Personality mode: Deep roleplay with one character
- Two behavioral options in personality mode
- Access to internet archives, fandoms, character databases

### Privacy First
- Guest mode (no login required)
- Local storage only (no server transmission)
- Optional account sync (future)
- Complete user control

### Safety Built-In
- AI won't exploit freedom or manipulate
- Won't impersonate real people
- Transparent about being AI in character
- User-defined character constraints enforced

---

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **APIs**: Anthropic Claude, OpenAI, Google Gemini
- **Build**: Vite
- **Icons**: Lucide React
- **Theme**: Dark mode optimized with teal/cyan accents

---

## 🔧 Getting Started

### Setup

```bash
# Clone repo
git clone https://github.com/HuntrClaww/agent-claww.git stageego
cd stageego

# Install dependencies
npm install

# Get API key from:
# - Anthropic: https://console.anthropic.com
# - OpenAI: https://platform.openai.com
# - Google Gemini: https://ai.google.dev

# Start dev server
npm run dev

# Build for production
npm run build
```

### First Time

1. Open app (http://localhost:5173)
2. Choose: Generic Mode or Personality Mode
3. Add your API key in Settings
4. Click "Test Connection"
5. Start chatting!

---

## 📊 Project Structure

```
stageego/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Login/Guest entry
│   │   ├── ChatWindow.tsx        # Main chat interface
│   │   ├── CharacterSelect.tsx   # Character/mode selection
│   │   ├── Sidebar.tsx           # Navigation
│   │   ├── SettingsModal.tsx     # API key & settings
│   │   └── UserProfileModal.tsx  # User customization
│   ├── lib/
│   │   ├── apiClient.ts          # API integration
│   │   ├── apiValidator.ts       # Key validation
│   │   └── supabase.ts           # Future backend
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Base styles
│   └── vite-env.d.ts             # Type definitions
├── index.html                    # HTML entry
├── package.json                  # Dependencies
├── vite.config.ts                # Build config
├── tailwind.config.js            # Tailwind theme
├── tsconfig.json                 # TypeScript config
├── CORE_VISION.md                # Project vision (READ THIS)
└── README.md                     # This file
```

---

## 💡 How It Works

### Generic Mode Flow
1. User enters Generic Mode
2. User asks about or requests a character
3. System searches character databases/fandoms
4. AI integrates character personality
5. User can switch to different character anytime
6. Each switch triggers new search + personality

### Personality Mode Flow
1. User selects Personality Mode
2. User chooses one specific character
3. User picks behavioral approach (True-to-Char or Off-Script)
4. Character is locked for session
5. Character has full historical context
6. Character can learn/develop (if Off-Script mode)
7. Session maintains character consistency

---

## 🔐 Safety & Responsibility

### AI Won't:
- ❌ Pretend to be real person
- ❌ Claim to have consciousness
- ❌ Manipulate users
- ❌ Provide illegal advice
- ❌ Exploit "free will" given to it
- ❌ Create unhealthy dependency

### AI Will:
- ✅ Stay true to character definition
- ✅ Refuse requests outside scope
- ✅ Be transparent about being AI
- ✅ Acknowledge limitations
- ✅ Respect user safety always
- ✅ Follow user-defined constraints

---

## 📈 Development Roadmap

### Phase 1: Core ✅
- [x] API integration (3 providers)
- [x] Real API validation & testing
- [x] Error handling
- [x] Guest mode with local storage
- [x] Core chat interface
- [x] Character concept framework

### Phase 2: Character System (NEXT)
- [ ] Generic mode character search
- [ ] Character database/wiki integration
- [ ] Character switching mechanics
- [ ] Personality mode implementation
- [ ] True-to-Character vs Off-Script toggle
- [ ] Character learning system

### Phase 3: Features
- [ ] Character creation UI
- [ ] Pre-made character library
- [ ] Character sharing/forking
- [ ] Advanced memory management
- [ ] Conversation export
- [ ] Character accuracy rating

### Phase 4: Scale
- [ ] User accounts & cloud sync
- [ ] Character marketplace
- [ ] Analytics & usage tracking
- [ ] Voice input/output
- [ ] Mobile native apps
- [ ] Community templates

---

## 🎬 The Vision

**StageEgo gives you two ways to experience AI characters:**

1. **Generic**: "Let me explore different characters" → Flexibility & discovery
2. **Personality**: "Let me deeply roleplay one character" → Depth & consistency

Both are equally valid. Both are safe. Both are under your control.

Whether you want to chat with Sherlock Holmes, explore how Harley Quinn would react to modern life, or create your own original character and see them grow - StageEgo is your platform.

---

## 🤝 Contributing

Interested in contributing?
- New character features
- Database integrations
- UI/UX improvements
- API provider support
- Character-specific enhancements

---

## 📝 License

MIT License - Open source

---

## 📧 Support

- **Issues**: Open a GitHub issue
- **Features**: Submit a pull request
- **Questions**: Check CORE_VISION.md for detailed explanation

---

**For detailed project vision and understanding, see [CORE_VISION.md](./CORE_VISION.md)**

*🎭 StageEgo: Character AI, Your Way*
