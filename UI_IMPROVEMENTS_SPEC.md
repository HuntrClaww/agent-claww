# StageEgo UI/UX Improvement Specification

## Vision
Transform StageEgo from a functional MVP into a **polished, professional AI coaching platform** with:
- Enhanced visual hierarchy and depth
- Smooth animations and micro-interactions
- Better information architecture
- Improved mobile responsiveness
- Professional desktop experience

---

## Layout Architecture

### Overall Structure (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (240px) │ Main Chat Area (flex)                     │
│                 │ ┌─────────────────────────────────────┐   │
│ • New Chat      │ │ Header (60px) - Character + Status  │   │
│ • Chat History  │ ├─────────────────────────────────────┤   │
│ • Settings      │ │                                     │   │
│ • Profile       │ │ Messages Area (flex-1)              │   │
│                 │ │ • Auto-scrolling                    │   │
│                 │ │ • Message bubbles with avatars      │   │
│                 │ │ • Read receipts / timestamps        │   │
│                 │ │                                     │   │
│                 │ ├─────────────────────────────────────┤   │
│                 │ │ API Status Indicator (30px)         │   │
│                 │ ├─────────────────────────────────────┤   │
│                 │ │ Input Area (80px)                   │   │
│                 │ │ • Input field with focus glow       │   │
│                 │ │ • Send button                       │   │
│                 │ │ • Character count (optional)        │   │
│                 │ └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Structure
```
┌─────────────────────────────┐
│ Mobile Header (56px)        │ - Menu icon | Character | Status
├─────────────────────────────┤
│ Messages Area (flex-1)      │
├─────────────────────────────┤
│ API Status (if active)      │
├─────────────────────────────┤
│ Input Area (80px)           │
└─────────────────────────────┘

Sidebar: Slide-out overlay on mobile (width: 280px)
```

---

## Component Breakdown

### 1. HEADER SECTION (New/Enhanced)
**Location:** Top of main chat area, 60px height (desktop only)  
**Visibility:** Hidden on mobile (uses title in mobile header instead)

**Elements:**
- Left: Character name + emoji badge
- Center: Empty space (future: breadcrumb or mode indicator)
- Right: 
  - API Status Indicator (icon + tooltip on hover)
  - Model dropdown (if multi-model support)
  - More options (⋮) menu

**Styles:**
- Background: `bg-gradient-to-r from-slate-800 to-slate-700`
- Border: `border-b border-slate-700`
- Font: `text-lg font-semibold text-teal-300`
- Padding: `px-6 py-4`
- Shadow: `shadow-sm`

**Functions:**
```typescript
<Header 
  character={activeCharacter}
  apiStatus={apiStatus}
  onStatusClick={() => setShowApiDetails(true)}
  onMoreClick={() => setShowHeaderMenu(true)}
/>
```

---

### 2. CHARACTER SELECT SCREEN (Enhanced)
**Current issue:** Basic white text on dark background  
**Improvement:** Card-based design with icons/emojis

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Select Your Assistant                       │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  🤖     │  │  💼     │  │  ✨     │    │
│  │         │  │         │  │         │    │
│  │ General │  │ Business│  │ Creative│    │
│  │ Use     │  │ Help    │  │ Mode    │    │
│  └─────────┘  └─────────┘  └─────────┘    │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  🎓     │  │  🔧     │  │  ⚡     │    │
│  │         │  │         │  │         │    │
│  │ Learning│  │ Tech    │  │ Speed   │    │
│  │ Mode    │  │ Support │  │ Mode    │    │
│  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────┘
```

**Card Styles per character:**
```typescript
const characterCards = [
  {
    id: 'general',
    name: 'General Use',
    emoji: '🤖',
    description: 'All-purpose assistant',
    color: 'from-teal-500 to-teal-600',  // gradient
    hoverScale: 1.05
  },
  // ... more characters
];
```

**Card HTML:**
```html
<div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto p-6">
  {characters.map(char => (
    <div 
      onClick={() => onSelect(char.id)}
      className={`
        relative p-6 rounded-xl cursor-pointer
        bg-gradient-to-br ${char.color}
        hover:scale-105 transition-transform duration-200
        border border-teal-500/30
        shadow-md hover:shadow-lg
      `}
    >
      <div className="text-4xl mb-3 text-center">{char.emoji}</div>
      <h3 className="font-semibold text-white text-center">{char.name}</h3>
      <p className="text-xs text-teal-100 text-center mt-1">{char.description}</p>
    </div>
  ))}
</div>
```

---

### 3. MESSAGE BUBBLES (Enhanced Further)

**Current:**
- Basic gradient
- Simple shadows
- Minimal spacing

**Improved:**

#### User Message Bubble
```
┌─────────────────────────────────┐
│ "Hello, how can you help me?"    │
│                                 │ ← 14px rounded
│                         ┘ ← 2px cut for direction
│ 12:34 PM                        │ ← timestamp (optional)
└─────────────────────────────────┘
```

**Styles:**
```typescript
// User message
className={`
  p-4 rounded-2xl rounded-tr-sm
  bg-gradient-to-br from-teal-600 to-teal-700
  text-white
  max-w-xs sm:max-w-md md:max-w-lg
  shadow-md hover:shadow-lg
  transition-shadow duration-200
  break-words
  relative
`}

// Timestamp (optional, below message)
<span className="text-xs text-slate-400 mt-1">12:34 PM</span>
```

#### AI Message Bubble
```
┌─────────────────────────────────┐
│ ┘ ← 2px cut for direction       │
│ I'd be happy to help! Here's    │
│ what I can do...                │
│                                 │
│                                 │
│ 12:35 PM                        │
└─────────────────────────────────┘
```

**Styles:**
```typescript
// AI message
className={`
  p-4 rounded-2xl rounded-tl-sm
  bg-gradient-to-br from-slate-800 to-slate-750
  border border-slate-600
  text-slate-100
  max-w-xs sm:max-w-md md:max-w-lg
  shadow-md hover:shadow-lg
  transition-shadow duration-200
  break-words
  backdrop-blur-sm
  relative
`}
```

**New Features:**
- Timestamp on hover (show on mobile tap)
- Copy button (tooltip on hover, bottom-right corner)
- Reaction buttons (👍 😂 ❤️) on hover
- Message status icons for user messages (✓ read status)

---

### 4. MESSAGE CONTAINER & SPACING

**Layout:**
```typescript
<div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
  <div className="flex flex-col space-y-4 md:space-y-6 max-w-3xl mx-auto">
    {/* Messages render here */}
  </div>
</div>
```

**Spacing rules:**
- Gap between messages: `space-y-4` (mobile) → `space-y-6` (desktop)
- Message padding: `p-4` for message content
- Container padding: `px-4 py-6` → `px-6 py-8`
- Max-width for readability: `max-w-3xl`

---

### 5. INPUT AREA (Enhanced)

**Current:**
- Basic input + send button side-by-side
- Generic placeholder

**Improved:**

```
┌──────────────────────────────────────────────────────┐
│ 📎 │ Type your message... [  ] │ 📤 │ ⚙️ │
└──────────────────────────────────────────────────────┘
     ↑                                  ↑     ↑
   Attachment            Character  Settings
   (future)              indicator  popup
```

**Styles:**
```typescript
<div className="p-4 md:p-6 border-t border-slate-800 bg-gradient-to-t from-slate-900 to-slate-800">
  <div className="max-w-3xl mx-auto flex gap-3 items-end">
    
    {/* Attachment button (future) */}
    <button className="p-2.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200">
      📎
    </button>

    {/* Input field wrapper */}
    <div className="flex-1 relative">
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you need..."
        className={`
          w-full
          bg-slate-800
          border border-slate-600
          rounded-xl px-4 py-3
          text-slate-100
          placeholder-slate-500
          focus:outline-none
          focus:border-teal-400
          focus:ring-2 focus:ring-teal-500/30
          transition-all duration-200
          resize-none
          max-h-24
          hover:border-slate-500
          focus:bg-slate-750
        `}
      />
      
      {/* Character count (optional) */}
      {inputText.length > 100 && (
        <span className="absolute right-3 bottom-2 text-xs text-slate-500">
          {inputText.length}/2000
        </span>
      )}
    </div>

    {/* Send button */}
    <button
      onClick={handleSend}
      disabled={!inputText.trim() || isTyping}
      className={`
        px-6 py-3
        bg-gradient-to-br from-teal-600 to-teal-700
        hover:from-teal-500 hover:to-teal-600
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-xl
        font-medium
        transition-all duration-200
        shadow-md hover:shadow-lg
        active:shadow-sm
        flex items-center gap-2
        whitespace-nowrap
        min-w-fit
      `}
    >
      {isTyping ? '...' : '📤 Send'}
    </button>

    {/* Settings popup trigger */}
    <button 
      onClick={() => setShowInputMenu(true)}
      className="p-2.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
    >
      ⚙️
    </button>
  </div>
</div>
```

**Character count logic:**
```typescript
const maxLength = 2000;
const charCount = inputText.length;
const percentageFull = (charCount / maxLength) * 100;

// Show color warning when > 80%
const countColor = percentageFull > 80 ? 'text-orange-400' : 'text-slate-500';
```

---

### 6. API STATUS INDICATOR (Enhanced)

**Current:** Simple pill at top of input area  
**Improved:** Multi-state indicator with hover details

**States:**

```
IDLE:     ◦ (no status shown, or "Ready")
SUCCESS: ✓ Anthropic (green)
LOADING: ⚡ Sending... (yellow, pulsing)
ERROR:   ✗ API Error (red)
```

**Hover tooltip:**
```
┌──────────────────────────────────┐
│ ✓ Using Anthropic Claude Opus   │
│   Last response: 234ms          │
│   Model: claude-opus-4-1        │
│   [Test Connection] [Settings]  │
└──────────────────────────────────┘
```

**HTML:**
```typescript
<div className="relative group">
  <div className={`
    px-3 py-2 text-xs font-medium
    flex items-center gap-2
    rounded-lg
    cursor-help
    transition-all duration-200
    ${apiStatus === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700' :
      apiStatus === 'loading' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700' :
      'bg-green-900/30 text-green-300 border border-green-700'}
  `}>
    {apiStatus === 'error' && <AlertCircle size={14} />}
    {apiStatus === 'loading' && <Zap size={14} className="animate-pulse" />}
    {apiStatus === 'success' && <CheckCircle size={14} />}
    {apiMessage}
  </div>
  
  {/* Tooltip on hover */}
  <div className="
    absolute left-0 bottom-full mb-2
    invisible group-hover:visible
    bg-slate-900 border border-slate-700
    rounded-lg p-3 text-xs
    text-slate-100
    whitespace-nowrap
    z-10
    shadow-lg
  ">
    {apiStatusDetails}
  </div>
</div>
```

---

### 7. AVATAR STYLES

**User Avatar:**
- Size: `w-8 h-8` (or `w-10 h-10` on desktop)
- Background: `bg-gradient-to-br from-teal-500 to-teal-600`
- Shadow: `shadow-md`
- Text: Initials from user profile
- Border: `border-2 border-teal-400/50` (optional)

**AI Avatar:**
- Size: Same as user
- Background: `bg-gradient-to-br from-cyan-500 to-teal-600`
- Shadow: `shadow-md`
- Icon: Model-specific emoji or icon
- Border: `border-2 border-cyan-400/50` (optional)

**With user profile image:**
```typescript
{userAvatar ? (
  <img 
    src={userAvatar} 
    alt="User" 
    className="w-full h-full object-cover rounded-full"
  />
) : (
  <span className="font-semibold text-sm">
    {userName.slice(0, 2).toUpperCase()}
  </span>
)}
```

---

### 8. SIDEBAR ENHANCEMENTS

**Structure:**
```
┌─────────────────┐
│ [≡] Chats  [⚙] │ ← Header (48px)
├─────────────────┤
│ + New Chat      │ ← Action button
├─────────────────┤
│ Today           │ ← Date separator
│ • Chat 1        │ ← History items
│ • Chat 2        │
│                 │
│ Yesterday       │ ← Date separator
│ • Chat 3        │
│ • Chat 4        │
│                 │
│ ...scrollable..│
├─────────────────┤
│ [👤] Guest User │ ← Profile section
│      Local     │
└─────────────────┘
```

**New Chat Button:**
```typescript
<button className="
  w-full
  bg-gradient-to-r from-teal-600 to-teal-700
  hover:from-teal-500 hover:to-teal-600
  text-white
  py-2.5 px-4
  rounded-lg
  font-medium
  text-sm
  transition-all duration-200
  shadow-sm hover:shadow-md
  flex items-center justify-center gap-2
">
  <Plus size={16} />
  New Chat
</button>
```

**Chat History Item:**
```typescript
<div className="
  px-3 py-2.5
  rounded-lg
  cursor-pointer
  hover:bg-slate-700/60
  transition-colors duration-150
  border-l-2 border-slate-700 hover:border-teal-500
  text-sm text-slate-300 hover:text-slate-100
  truncate
  group
">
  <div className="flex justify-between items-start">
    <span className="truncate flex-1">{chatTitle}</span>
    <button className="
      opacity-0 group-hover:opacity-100
      p-1 hover:bg-slate-600 rounded
      transition-all duration-150
      text-slate-400 hover:text-red-400
    ">
      ✕
    </button>
  </div>
  <div className="text-xs text-slate-500 mt-1">{timestamp}</div>
</div>
```

---

### 9. SETTINGS MODAL (Redesigned)

**Tabs:**
```
┌────────────────────────────────────────┐
│ [API Keys] [Appearance] [Advanced]     │
├────────────────────────────────────────┤
│                                        │
│  API Configuration                    │
│  ┌──────────────────────────────────┐ │
│  │ OpenAI   ▼ │ API Key... [TEST]  │ │
│  │ Status: ✓ Connected            │ │
│  └──────────────────────────────────┘ │
│                                        │
│  More options...                      │
│                                        │
│        [Cancel]  [Save]               │
└────────────────────────────────────────┘
```

---

### 10. ANIMATIONS & TRANSITIONS

**Message entrance:**
```typescript
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Apply to new messages:
className="animate-in duration-200"
```

**Typing indicator:**
```typescript
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateY(-8px);
    opacity: 0.7;
  }
}

// Staggered delays:
<div className="animate-bounce" style={{ animationDelay: '0s' }} />
<div className="animate-bounce" style={{ animationDelay: '0.2s' }} />
<div className="animate-bounce" style={{ animationDelay: '0.4s' }} />
```

**Button states:**
- Hover: Lift (shadow increase) + color shift
- Click: Press down (shadow decrease)
- Disabled: Fade opacity

---

## Color Palette Reference

### Primary Colors
- **Teal:** `#14b8a6` (brand color)
- **Slate:** `#0f172a` to `#e2e8f0` (grays)
- **Cyan:** `#06b6d4` (accent)

### Status Colors
- **Success:** `#22c55e` (green)
- **Error:** `#ef4444` (red)
- **Warning:** `#f59e0b` (amber)
- **Info:** `#3b82f6` (blue)

### Backgrounds
- **Page:** `bg-slate-900`
- **Surface 1:** `bg-slate-800`
- **Surface 2:** `bg-slate-700`
- **Overlay:** `bg-black/60`

---

## Responsive Breakpoints

### Mobile (< 768px)
- Single column layout
- Sidebar slides in from left
- Character select: 2-column grid
- Message bubbles: max-width 90%
- Font sizes: Smaller (text-sm)

### Tablet (768px - 1024px)
- Desktop layout with adjusted spacing
- Character select: 3-column grid
- Message bubbles: max-width 70%

### Desktop (> 1024px)
- Full layout with header
- Character select: 3-4 column grid
- Message bubbles: max-width 60%
- Sidebar always visible

---

## State Management Functions

### Core States
```typescript
// Chat state
const [activeCharacter, setActiveCharacter] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [inputText, setInputText] = useState('');
const [isTyping, setIsTyping] = useState(false);

// UI state
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [isSettingsOpen, setIsSettingsOpen] = useState(false);
const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
const [apiMessage, setApiMessage] = useState('');

// Interaction state
const [showInputMenu, setShowInputMenu] = useState(false);
const [showHeaderMenu, setShowHeaderMenu] = useState(false);
const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
```

### Action Functions
```typescript
// Message handling
const handleSend = async () => { /* ... */ };
const handleRetry = (messageId: string) => { /* ... */ };
const handleDelete = (messageId: string) => { /* ... */ };
const handleCopy = (text: string) => { /* ... */ };
const handleReact = (messageId: string, emoji: string) => { /* ... */ };

// Character & chat management
const handleNewChat = () => { /* ... */ };
const handleLoadChat = (chatId: string) => { /* ... */ };
const handleDeleteChat = (chatId: string) => { /* ... */ };
const handleCharacterChange = (character: string) => { /* ... */ };

// UI interactions
const handleToggleSidebar = () => { /* ... */ };
const handleOpenSettings = () => { /* ... */ };
const handleTestAPI = async () => { /* ... */ };
```

---

## Summary of Changes

| Component | Current | Improved |
|-----------|---------|----------|
| **Header** | None | New desktop header with character + status |
| **Char Select** | Text only | Card grid with emojis & descriptions |
| **Messages** | Basic | Timestamps, reactions, copy button |
| **Avatars** | Small gradient | Consistent sizing, profile images |
| **Input** | Basic | Attachment button, char count, emoji send icon |
| **API Status** | Inline pill | Hover tooltip with details |
| **Sidebar** | Basic | Date-grouped history, better spacing |
| **Animations** | Minimal | Smooth transitions, staggered typing dots |
| **Settings** | Single form | Tabbed interface with test button |
| **Mobile** | Responsive | Enhanced touch targets, better spacing |

---

## Priority Implementation Order

1. **Phase 1 (Quick wins)**
   - Character select card redesign
   - Message timestamps
   - Input character count
   - API status tooltip

2. **Phase 2 (Core improvements)**
   - Header section (desktop)
   - Sidebar history grouping
   - Message reactions (UI only)
   - Copy button on messages

3. **Phase 3 (Polish)**
   - Enhanced animations
   - Settings tabs
   - Message retry/delete
   - Profile customization UI

4. **Phase 4 (Future)**
   - Chat persistence (localStorage)
   - Export conversations
   - Theme customization
   - Voice input
