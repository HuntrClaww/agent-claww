# 🎭 StageEgo - Your AI Performance Coach

**StageEgo** is an AI-powered performance coaching platform designed to help you master your presence, refine your delivery, and elevate any performance—whether it's public speaking, acting, improv, debate, or confidence building.

---

## 🤔 What Does "StageEgo" Mean?

### The Name Breakdown

**"Stage"** + **"Ego"** = **StageEgo**

#### 🎭 **Stage**
- Represents the literal stage, spotlight, or platform where performance happens
- Could be a theater stage, presentation podium, auditorium, or even virtual stage
- Symbolizes any moment where you're in the spotlight and need to perform at your best
- Metaphor: *the arena where you showcase your skills, ideas, and authentic self*

#### 🧠 **Ego**
- NOT a negative connotation of narcissism or arrogance
- Refers to the psychological "ego" — your conscious self, identity, and presence
- The part of you that shows up when the spotlight is on
- In Latin: "ego" = "I am" — your authentic presence and confidence
- The inner coach, the voice that guides your performance from within

#### 🎯 **The Combined Meaning: StageEgo**
**Your elevated, authentic self when performing under pressure.**

It's the intersection of:
1. **The Platform** — where you perform
2. **Your Presence** — who you are when performing
3. **Confidence** — the inner strength to shine
4. **Coaching** — the guidance to improve

*StageEgo helps you become the best version of yourself when it matters most.*

---

## ✨ What StageEgo Does

### Performance Coaching Modes

StageEgo offers **6 specialized AI coaching modes**:

#### 🎤 **Presentation Coach**
- Refine your delivery for pitches, talks, and public speaking
- Analyze pacing, tone, eye contact, and audience engagement
- Get real-time feedback on structure and impact

#### 🎭 **Acting Coach**
- Master character development and emotional authenticity
- Analyze scenes, blocking, and performance techniques
- Build depth in your character work

#### ✨ **Improv Buddy**
- Build confidence through improvisation games
- Get suggestions for energy, spontaneity, and storytelling
- Learn to think on your feet

#### 🧠 **Debate Strategist**
- Sharpen your arguments and rhetoric
- Get feedback on rebuttals and persuasive techniques
- Master the art of compelling debate

#### 💪 **Confidence Builder**
- Overcome stage fright and anxiety
- Personalized exercises for presence and self-assurance
- Motivation and psychological preparation

#### 🎵 **Voice & Presence Coach**
- Perfect vocal delivery and projection
- Guidance on breathing, pacing, and physical presence
- Develop a commanding stage voice

---

## 🚀 Key Features

### Real-Time AI Coaching
- **Multi-Provider Support**: Works with Claude (Anthropic), OpenAI, and Google Gemini
- **Instant Feedback**: Get analysis and suggestions immediately
- **Personalized Guidance**: Coaches adapt to your specific goals

### Privacy & Control
- **Local Storage**: Guest mode keeps all data on your device
- **No Tracking**: Your coaching sessions are yours alone
- **Open Source**: Built with transparency and flexibility

### Professional UI
- **Dark Theme Optimized**: Designed for focus and reduced eye strain
- **Mobile Responsive**: Coach on-the-go
- **Real-Time Status**: Know which AI provider you're using
- **Chat History**: Track your progress and review sessions

---

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **APIs**: Anthropic Claude, OpenAI, Google Gemini
- **Build Tool**: Vite
- **Database** (future): Supabase
- **Styling**: Dark theme with teal/cyan accents

---

## 📊 Project Structure

```
stageego/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Login/Guest entry point
│   │   ├── ChatWindow.tsx        # Main chat interface
│   │   ├── CharacterSelect.tsx   # Coaching mode selection
│   │   ├── Sidebar.tsx           # Session history & navigation
│   │   ├── SettingsModal.tsx     # API key & settings management
│   │   ├── UserProfileModal.tsx  # User profile customization
│   │   └── SettingsModal.tsx     # Configuration panel
│   ├── lib/
│   │   ├── apiClient.ts          # API integration (Anthropic, OpenAI, Gemini)
│   │   ├── apiValidator.ts       # API key validation & testing
│   │   └── supabase.ts           # Future backend integration
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Base styles
│   └── vite-env.d.ts             # Type definitions
├── index.html                    # HTML entry
├── package.json                  # Dependencies
├── vite.config.ts                # Build configuration
├── tailwind.config.js            # Tailwind theming
├── tsconfig.json                 # TypeScript config
├── UI_IMPROVEMENTS_SPEC.md       # Detailed UI roadmap
└── README.md                     # This file
```

---

## 🎯 Core Coaching Concept

### How StageEgo Works

1. **Choose Your Coach** — Select which performance area you want to improve
2. **Configure AI** — Add your API key (Claude, OpenAI, or Gemini)
3. **Describe Your Performance** — Tell the coach what you're working on
4. **Get Real-Time Feedback** — Receive analysis, suggestions, and improvements
5. **Refine & Repeat** — Practice, test, and iterate with each coach

---

## 💡 Philosophy Behind StageEgo

### Why This Name Makes Sense

| Element | Meaning |
|---------|---------|
| **Stage** | Your platform, audience, moment to shine |
| **Ego** | Your authentic presence, consciousness, confidence |
| **Together** | Mastering yourself on any stage, in any situation |

### The Psychological Model

StageEgo is built on the idea that **great performance is about:**
- **Self-awareness** — knowing your strengths and weaknesses
- **Presence** — being fully engaged in the moment
- **Confidence** — trusting your preparation and abilities
- **Continuous improvement** — always getting better through feedback

The AI coaches are your **external mirror**, helping you see yourself as your audience does, so you can optimize your performance.

---

## 🔧 Getting Started

### Setup (Development)

```bash
# Clone the repo
git clone https://github.com/HuntrClaww/agent-claww.git stageego
cd stageego

# Install dependencies
npm install

# Get your API key from:
# - Anthropic: https://console.anthropic.com
# - OpenAI: https://platform.openai.com
# - Google Gemini: https://ai.google.dev

# Start development server
npm run dev

# Build for production
npm run build
```

### First Run

1. Open the app (usually `http://localhost:5173`)
2. Click "Start as Guest" (or sign in)
3. Choose a coaching mode
4. Go to Settings and add your API key
5. Click "Test API Connection"
6. Start your coaching session!

---

## 📈 Roadmap

### Phase 1: Core Functionality ✅
- [x] Real API integration (Anthropic, OpenAI, Gemini)
- [x] API key validation & testing
- [x] Error handling & status indicators
- [x] Guest mode with local storage

### Phase 2: UI Polish 🎨
- [ ] Enhanced character/coach selection cards
- [ ] Message timestamps and reactions
- [ ] Desktop header section
- [ ] Sidebar chat history grouping
- [ ] Input character count & formatting

### Phase 3: Advanced Features 🚀
- [ ] Chat persistence & history
- [ ] Session export (PDF/JSON)
- [ ] Theme customization
- [ ] Voice input/output
- [ ] Custom coach creation

### Phase 4: Premium Features 💎
- [ ] Cloud sync with authentication
- [ ] Performance analytics
- [ ] Progress tracking
- [ ] Coach comparison mode
- [ ] Community templates

---

## 🎓 Understanding Your Performance

### Key Metrics StageEgo Coaches Can Analyze

**For Presentation:**
- Pacing and timing
- Vocal variety and projection
- Audience engagement hooks
- Story structure and flow

**For Acting:**
- Emotional authenticity
- Character consistency
- Physical presence
- Scene dynamics and chemistry

**For Improv:**
- Yes-and momentum
- Storytelling coherence
- Emotional truth
- Game awareness

**For Debate:**
- Argument structure
- Counterargument strength
- Evidence quality
- Persuasive techniques

**For Confidence:**
- Anxiety triggers
- Presence indicators
- Energy management
- Mental resilience

---

## 🔐 Privacy & Security

### Guest Mode (Default)
- ✅ All data stored locally on your device
- ✅ No server transmission
- ✅ No account required
- ✅ Complete privacy

### Account Mode (Future)
- 🔒 Optional cloud sync
- 🔒 Encrypted sessions
- 🔒 Your data, your control
- 🔒 GDPR-compliant

---

## 🤝 Contributing

Contributions are welcome! Areas of interest:

- **New Coaching Modes** — Create specialized coaches for specific performance areas
- **UI/UX Improvements** — Follow the `UI_IMPROVEMENTS_SPEC.md` guide
- **API Integrations** — Add support for more AI providers
- **Documentation** — Help improve guides and tutorials

---

## 📝 License

This project is open-source and available under the MIT License.

---

## 🎬 The StageEgo Mindset

> *"The stage is not where you prove yourself to others. It's where you discover yourself through performance. StageEgo is your partner in that journey."*

Whether you're:
- 🎤 Pitching to investors
- 🎭 Performing on stage
- 🧠 Debating your ideas
- ✨ Building confidence
- 🎵 Finding your voice

**StageEgo is here to help you perform at your best.**

---

## 📧 Support

- **Issues?** Open a GitHub issue
- **Features?** Submit a discussion or pull request
- **Feedback?** Tell us what you think!

---

**Made with 🎭 for everyone who performs under pressure.**

*StageEgo — Master Your Presence. Elevate Your Performance.*
