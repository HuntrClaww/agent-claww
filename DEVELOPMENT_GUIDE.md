# 🎭 StageEgo Development Guide

Complete guide for developers working on StageEgo.

---

## 📚 Project Overview

**StageEgo** is an AI-powered performance coaching platform built with:
- **React 18** + TypeScript for the frontend
- **Vite** for fast development and bundling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Multi-provider AI support** (Anthropic Claude, OpenAI, Google Gemini)

### Core Philosophy
StageEgo helps performers (speakers, actors, debaters, etc.) improve through real-time AI coaching. The name represents the intersection of **stage** (your platform) and **ego** (your authentic presence).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (recommended: 20 LTS)
- npm or yarn
- Git
- API key from at least one provider:
  - [Anthropic Claude](https://console.anthropic.com)
  - [OpenAI](https://platform.openai.com)
  - [Google Gemini](https://ai.google.dev)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/HuntrClaww/agent-claww.git stageego
cd stageego

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Environment Setup

Create a `.env.local` file (optional, for local API testing):
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
VITE_GEMINI_API_KEY=...
```

**Note:** API keys are NOT stored in env files in production. Users enter them in Settings.

---

## 📁 Project Structure

```
stageego/
├── src/
│   ├── components/
│   │   ├── Auth.tsx                 # Login screen + guest mode entry
│   │   ├── ChatWindow.tsx           # Main coaching chat interface
│   │   ├── CharacterSelect.tsx      # Coaching mode selection (6 modes)
│   │   ├── Sidebar.tsx              # Session history & navigation
│   │   ├── SettingsModal.tsx        # API key + preferences setup
│   │   └── UserProfileModal.tsx     # User profile customization
│   │
│   ├── lib/
│   │   ├── apiClient.ts             # API integration logic
│   │   │                            # - Anthropic/OpenAI/Gemini
│   │   │                            # - Message sending & formatting
│   │   │                            # - Error handling
│   │   │
│   │   ├── apiValidator.ts          # API key validation & testing
│   │   │                            # - Connection testing
│   │   │                            # - Format detection
│   │   │
│   │   └── supabase.ts              # Backend integration (future)
│   │
│   ├── App.tsx                      # Root component + routing
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Base Tailwind styles
│   └── vite-env.d.ts                # TypeScript definitions
│
├── index.html                       # HTML entry + SEO meta tags
├── package.json                     # Dependencies + scripts
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js               # Tailwind theme customization
├── vite.config.ts                   # Vite build configuration
│
├── README.md                        # Project overview
├── BRAND_GUIDELINES.md              # Brand identity & messaging
├── DEVELOPMENT_GUIDE.md             # This file
├── UI_IMPROVEMENTS_SPEC.md          # UI roadmap & specifications
└── .gitignore                       # Git ignore rules
```

---

## 🔧 Key Technologies & Libraries

### React Components
```typescript
// All components use functional components with hooks
import { useState, useEffect, useRef } from 'react';

// Example component structure:
export default function MyComponent({ prop }: { prop: string }) {
  const [state, setState] = useState('');
  
  useEffect(() => {
    // Side effects
  }, []);

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### API Integration

#### Using Anthropic
```typescript
import { APIClient } from '@/lib/apiClient';

const client = new APIClient({
  provider: 'anthropic',
  apiKey: userApiKey,
  model: 'claude-opus-4-1'
});

const response = await client.sendMessage(
  "How was my delivery?",
  "Presentation Coach"
);
```

#### Using OpenAI
```typescript
const client = new APIClient({
  provider: 'openai',
  apiKey: userApiKey,
  model: 'gpt-4o-mini'
});
```

#### Using Google Gemini
```typescript
const client = new APIClient({
  provider: 'gemini',
  apiKey: userApiKey
});
```

### Styling with Tailwind

```typescript
// Dark theme is default
<div className="bg-slate-900 text-slate-100">
  {/* Content */}
</div>

// Teal/Cyan for StageEgo branding
<button className="bg-gradient-to-r from-teal-600 to-teal-700">
  Coach Button
</button>

// Responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive layout */}
</div>
```

---

## 🎨 Component Guidelines

### Component Naming
- File names match component names: `MyComponent.tsx`
- Export as `export default function MyComponent() { ... }`
- Use PascalCase for component files

### Component Structure Template

```typescript
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
  isLoading?: boolean;
}

/**
 * MyComponent - Brief description of what it does
 * 
 * StageEgo context: How this fits into the coaching platform
 */
export default function MyComponent({ 
  title, 
  onAction, 
  isLoading = false 
}: MyComponentProps) {
  
  // State
  const [state, setState] = useState('');

  // Effects
  useEffect(() => {
    // Initialize or fetch data
  }, []);

  // Handlers
  const handleClick = () => {
    onAction();
  };

  // Render
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold text-teal-400">{title}</h2>
      
      <button 
        onClick={handleClick}
        disabled={isLoading}
        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-4 py-2 rounded-lg"
      >
        {isLoading ? 'Loading...' : 'Action'}
      </button>
    </div>
  );
}
```

### Props Typing
```typescript
// ✅ Good: Explicit type definitions
interface MessageProps {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp?: Date;
}

// ❌ Avoid: any types
interface MessageProps {
  message: any;
}
```

---

## 🔄 State Management Pattern

### Local Component State
Use `useState` for component-specific state:

```typescript
const [inputText, setInputText] = useState('');
const [isTyping, setIsTyping] = useState(false);
const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
```

### Shared State (localStorage)
For data that persists across sessions:

```typescript
// Save to localStorage
const saveSettings = (apiKey: string) => {
  localStorage.setItem('user_api_key', apiKey);
  window.dispatchEvent(new Event('profileUpdated'));
};

// Read from localStorage
const apiKey = localStorage.getItem('user_api_key') || '';
```

### Event-Driven Updates
Use events for cross-component communication:

```typescript
// Dispatch event
window.dispatchEvent(new Event('profileUpdated'));

// Listen for event
useEffect(() => {
  const handleUpdate = () => {
    // React to changes
  };
  window.addEventListener('profileUpdated', handleUpdate);
  return () => window.removeEventListener('profileUpdated', handleUpdate);
}, []);
```

---

## 🎯 Coding Standards

### TypeScript Best Practices

```typescript
// ✅ Use strict types
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

// ✅ Use enums for fixed values
enum CoachingMode {
  PRESENTATION = 'presentation_coach',
  ACTING = 'acting_coach',
  IMPROV = 'improv_buddy',
  DEBATE = 'debate_strategist',
  CONFIDENCE = 'confidence_builder',
  VOICE = 'voice_coach',
}

// ❌ Avoid: loose types
interface Message {
  id: any;
  role: any;
  content: any;
}
```

### Naming Conventions

```typescript
// Components: PascalCase
ChatWindow.tsx
CharacterSelect.tsx

// Functions: camelCase
const handleSend = () => { };
const validateAPIKey = async () => { };

// Constants: UPPER_CASE
const MAX_MESSAGE_LENGTH = 2000;
const API_TIMEOUT = 30000;

// Booleans: is/has prefix
const isLoading = true;
const hasError = false;
```

### Comment Guidelines

```typescript
// ✅ Good: Explains why, not what
// Debounce API calls to avoid rate limiting
const debounceDelay = 300;

// ✅ Good: For complex logic
/**
 * Validates API key format and tests connection
 * Returns the detected provider if successful
 */
const validateAndDetect = async (key: string) => { };

// ❌ Avoid: Obvious comments
const name = "John"; // Set name to John
```

---

## 🧪 Testing & QA

### Manual Testing Checklist

#### Auth Flow
- [ ] Login screen displays correctly
- [ ] Guest mode works without account
- [ ] Settings persist across sessions

#### Coaching Modes
- [ ] All 6 coaching modes appear in CharacterSelect
- [ ] Selecting a mode navigates to chat
- [ ] Mode persists during session

#### API Integration
- [ ] API key validation works for each provider
- [ ] "Test Connection" button succeeds with valid key
- [ ] Error messages display for invalid keys
- [ ] Messages send to correct API
- [ ] Responses display in chat

#### Chat Interface
- [ ] Messages appear in correct order (user/AI alternating)
- [ ] Typing indicator shows while AI responds
- [ ] Input field clears after sending
- [ ] Character count display works
- [ ] Status indicator shows API state

#### Mobile Responsiveness
- [ ] Sidebar slides in/out correctly
- [ ] Messages readable on small screens
- [ ] Input field accessible without scrolling
- [ ] Touch targets are 48px+

### Browser Compatibility
Test on:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)

---

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Output: dist/ folder ready for deployment
```

### Deployment Options
1. **Vercel** (Recommended): Automatic deployments on push
2. **Netlify**: Easy CI/CD setup
3. **GitHub Pages**: Static hosting
4. **Self-hosted**: Any static host

### Environment Variables (Production)
No secrets needed! Users enter API keys in the app.

---

## 📝 Documentation Standards

### README Section
Update README.md when:
- Adding new features
- Changing setup instructions
- Adding new coaching modes
- Significant architecture changes

### Code Comments
- Document complex logic
- Explain "why", not "what"
- Update when code changes
- Use JSDoc for public functions

### Commit Messages
Format: `type: description`

```bash
# Feature
git commit -m "feat: Add voice coach mode"

# Bug fix
git commit -m "fix: API status not updating correctly"

# Documentation
git commit -m "docs: Update development guide"

# Style
git commit -m "style: Reformat CharacterSelect component"

# Refactor
git commit -m "refactor: Extract message validation logic"
```

---

## 🔐 Security Considerations

### API Keys
- ✅ Never commit keys to git
- ✅ Use localStorage for user-provided keys
- ✅ Clear keys on logout
- ✅ Validate keys before use

### Data Privacy
- ✅ Guest mode = zero server transmission
- ✅ No telemetry without consent
- ✅ Clear user data on request
- ✅ Document data retention

### CORS & API Security
- ✅ API calls from browser (CORS handled by APIs)
- ✅ No sensitive data in query params
- ✅ Use POST for sensitive requests
- ✅ Validate responses

---

## 🐛 Debugging Tips

### Browser DevTools
```javascript
// Check localStorage
localStorage.getItem('user_api_key');
localStorage.clear(); // Clear all data

// Check API responses
console.log(apiResponse);

// Check component state
// Use React DevTools extension
```

### Common Issues

**Issue**: Messages not sending
- [ ] Check API key in Settings
- [ ] Check API status indicator
- [ ] Check browser console for errors
- [ ] Test API connection first

**Issue**: Coaching mode not selected
- [ ] Verify CharacterSelect rendered
- [ ] Check handleSelect callback
- [ ] Verify activeCharacter state updates

**Issue**: Styling broken
- [ ] Tailwind CSS might not be building
- [ ] Check tailwind.config.js
- [ ] Clear browser cache
- [ ] Restart dev server

---

## 📚 Resources

### Official Docs
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

### API Documentation
- [Anthropic Claude API](https://docs.anthropic.com)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google Gemini API](https://ai.google.dev/tutorials)

### StageEgo Docs
- [`README.md`](./README.md) - Project overview
- [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) - Brand identity
- [`UI_IMPROVEMENTS_SPEC.md`](./UI_IMPROVEMENTS_SPEC.md) - UI roadmap

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make changes** following the guidelines above
4. **Test thoroughly** on multiple browsers/devices
5. **Commit with clear messages**: `git commit -m "feat: Description"`
6. **Push and create a Pull Request**

### Areas for Contribution
- New coaching modes
- UI/UX improvements (see `UI_IMPROVEMENTS_SPEC.md`)
- Additional API providers
- Bug fixes
- Documentation improvements

---

## 📞 Questions?

If you have questions:
1. Check the documentation files
2. Look at similar code for patterns
3. Check GitHub issues for discussions
4. Ask in pull request comments

---

**Happy coding! Remember: StageEgo is about helping performers shine. Keep that mission in mind as you build.**

🎭 **Master Your Presence. Elevate Your Performance.**
