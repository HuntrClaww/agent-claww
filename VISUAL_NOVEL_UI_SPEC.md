# 🎭 StageEgo - Visual Novel UI Design Specification

## Vision
A **minimalist Visual Novel-style chat interface** where:
- Characters are displayed as 2D portraits that change based on conversation emotions
- Chat interface remains fluid and modern despite VN aesthetic
- Emotion detection triggers appropriate character expressions
- Custom character art can be uploaded with emotion state slots
- Advanced theming system with multiple color schemes and visual styles

---

## 🎨 Overall Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Mode Selector | Character Name | Settings          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ╭─────────────────╮  ╭───────────────────────────────────╮  │
│  │   Character     │  │   Chat Messages                   │  │
│  │  Portrait       │  │                                   │  │
│  │  (2D/VN Style)  │  │  [User message bubble]            │  │
│  │                 │  │                                   │  │
│  │  • Happy        │  │     [Character response]          │  │
│  │  • Sad          │  │     (with emotion flag)           │  │
│  │  • Angry        │  │                                   │  │
│  │  • Neutral      │  │  [Emotion indicator]              │  │
│  │  • Custom       │  │                                   │  │
│  │                 │  │                                   │  │
│  ╰─────────────────╯  ╰───────────────────────────────────╯  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  [Input Field]                                    [Send] ⚙️  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 Component Specifications

### 1. CHARACTER PORTRAIT DISPLAY

#### Dimensions
- **Desktop**: 280px x 400px (left sidebar)
- **Mobile**: 100px x 150px (top collapsed) → 280px x 400px (expanded)
- **Aspect Ratio**: Portrait (3:4)

#### Portrait Container
```typescript
<div className="character-portrait">
  {/* Main character image (changes based on emotion) */}
  <img 
    src={portraitByEmotion[currentEmotion]}
    alt={character.name}
    className="portrait-image fade-transition"
  />
  
  {/* Emotion indicator overlay */}
  <div className="emotion-badge">
    {emotionIcon} {emotionName}
  </div>
  
  {/* Character name plate */}
  <div className="nameplate">
    {character.name}
  </div>
</div>
```

#### Portrait Emotion States
User uploads character with multiple emotion slots:

```typescript
interface CharacterPortrait {
  id: string;
  characterId: string;
  emotions: {
    neutral: string;      // Default pose
    happy: string;        // Joyful, content, amused
    sad: string;          // Melancholic, depressed
    angry: string;        // Frustrated, mad, upset
    surprised: string;    // Shocked, amazed
    confused: string;     // Puzzled, uncertain
    embarrassed: string;  // Shy, flustered
    thinking: string;     // Contemplative, analyzing
    romantic: string;     // Loving, affectionate
    fearful: string;      // Scared, anxious
    custom1?: string;     // User-defined emotion
    custom2?: string;     // User-defined emotion
  };
  transitionDuration: number; // ms for fade (default: 300ms)
}
```

#### Emotion Detection Algorithm
```typescript
const emotionMap = {
  // Keywords → Emotion
  happy: ['happy', 'great', 'love', 'wonderful', 'amazing', 'excited', 'thrilled'],
  sad: ['sad', 'depressed', 'lonely', 'hurt', 'crying', 'miserable', 'down'],
  angry: ['angry', 'furious', 'mad', 'rage', 'frustrated', 'annoyed'],
  surprised: ['wow', 'amazing', 'shocked', 'surprised', 'incredible'],
  confused: ['confused', 'what', 'huh', 'unclear', 'confused', 'puzzled'],
  embarrassed: ['embarrassed', 'awkward', 'shy', 'blush', 'flustered'],
  thinking: ['hmm', 'think', 'consider', 'analyze', 'ponder'],
  romantic: ['love', 'adore', 'beautiful', 'charming', 'fell for'],
  fearful: ['scared', 'afraid', 'terrified', 'frightened', 'anxious'],
};

function detectEmotion(text: string): Emotion {
  const lowerText = text.toLowerCase();
  
  for (const [emotion, keywords] of Object.entries(emotionMap)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return emotion;
    }
  }
  
  return 'neutral'; // Default
}
```

#### Smooth Transitions
```css
.portrait-image {
  transition: opacity 0.3s ease-in-out;
  will-change: opacity;
}

.portrait-image.fade-out {
  opacity: 0;
}

.portrait-image.fade-in {
  opacity: 1;
}

/* Subtle scale on emotion change */
@keyframes emotionShift {
  0% {
    transform: scale(0.98);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.portrait-image.changing {
  animation: emotionShift 0.4s ease-out;
}
```

---

### 2. EMOTION BADGE & INDICATOR

#### Display
```typescript
<div className="emotion-badge">
  <span className="emotion-icon">{getEmotionEmoji(emotion)}</span>
  <span className="emotion-label">{emotion}</span>
  <span className="emotion-confidence">{confidence}%</span>
</div>
```

#### Emoji Mapping
```typescript
const emotionEmojis = {
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😮',
  confused: '🤔',
  embarrassed: '😳',
  thinking: '🧠',
  romantic: '😍',
  fearful: '😨',
};
```

#### Positioning
- **Desktop**: Bottom-right of portrait, semi-transparent overlay
- **Mobile**: Top-right corner, compact badge
- **CSS**:
```css
.emotion-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 768px) {
  .emotion-badge {
    top: 8px;
    right: 8px;
    bottom: auto;
  }
}
```

---

### 3. CHAT MESSAGE AREA

#### Message Bubble Structure
```typescript
interface MessageBubble {
  id: string;
  role: 'user' | 'character';
  content: string;
  emotion?: Emotion;
  emotionConfidence?: number;
  timestamp: Date;
  portraitState?: CharacterState; // Which emotion portrait was shown
}
```

#### Message Styling (Minimal Fluid Design)
```css
/* User Message */
.message-user {
  display: flex;
  justify-content: flex-end;
  margin: 12px 0;
}

.message-user-bubble {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 18px;
  border-top-right-radius: 4px;
  max-width: 70%;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.2);
  animation: slideInRight 0.3s ease-out;
}

/* Character Message */
.message-character {
  display: flex;
  justify-content: flex-start;
  margin: 12px 0;
  align-items: flex-start;
}

.message-character-bubble {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 18px;
  border-top-left-radius: 4px;
  max-width: 70%;
  word-wrap: break-word;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideInLeft 0.3s ease-out;
}

/* Emotion indicator within message */
.message-emotion {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

#### Message with Emotion Tag
```jsx
<div className="message-character">
  <div className="message-character-bubble">
    <p>{message.content}</p>
    <div className="message-emotion">
      <span>{emotionEmojis[message.emotion]}</span>
      <span>{message.emotion}</span>
    </div>
  </div>
</div>
```

---

### 4. INPUT AREA (Fluid Modern Design)

```css
.input-container {
  padding: 16px;
  background: linear-gradient(to top, #0f172a, transparent);
  border-top: 1px solid rgba(71, 85, 105, 0.3);
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-field {
  flex: 1;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.4);
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  max-height: 100px;
  resize: none;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.input-field:focus {
  outline: none;
  border-color: #14b8a6;
  background: rgba(30, 41, 59, 0.8);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
}

.send-button {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.2);
}

.send-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
}

.send-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.2);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 🎨 Advanced Theme System

### Color Schemes Available

#### Theme 1: Midnight Teal (Default)
```typescript
const themesTeal = {
  primary: '#14b8a6',      // Teal
  secondary: '#06b6d4',    // Cyan
  background: '#0f172a',   // Deep slate
  surface: '#1e293b',      // Slate 800
  text: '#e2e8f0',         // Slate 100
  accent: '#f59e0b',       // Amber
};
```

#### Theme 2: Neon Purple
```typescript
const themePurple = {
  primary: '#a855f7',      // Purple
  secondary: '#ec4899',    // Pink
  background: '#0f0819',   // Deep purple
  surface: '#1f0933',      // Purple 900
  text: '#f3e8ff',         // Purple 100
  accent: '#06b6d4',       // Cyan
};
```

#### Theme 3: Sakura Pink
```typescript
const themeSakura = {
  primary: '#f472b6',      // Pink
  secondary: '#f87171',    // Red
  background: '#fef3f8',   // Light pink
  surface: '#fce7f3',      // Pink 200
  text: '#831843',         // Pink 900
  accent: '#a78bfa',       // Purple
};
```

#### Theme 4: Forest Green
```typescript
const themeForest = {
  primary: '#16a34a',      // Green
  secondary: '#059669',    // Emerald
  background: '#051515',   // Deep green
  surface: '#0f3d2f',      // Green 900
  text: '#ecfdf5',         // Green 50
  accent: '#fbbf24',       // Amber
};
```

#### Theme 5: Custom User Theme
```typescript
const themeCustom = {
  primary: userColor1,
  secondary: userColor2,
  background: userColor3,
  surface: userColor4,
  text: userColor5,
  accent: userColor6,
};
```

### Theme Application
```typescript
interface ThemeSettings {
  colorScheme: 'teal' | 'purple' | 'sakura' | 'forest' | 'custom';
  chatStyle: 'modern' | 'vn' | 'minimal' | 'cyberpunk';
  portraitPosition: 'left' | 'right' | 'center';
  portraitSize: 'small' | 'medium' | 'large';
  messageLayout: 'compact' | 'spacious' | 'bubble' | 'flat';
  emotionDisplay: 'badge' | 'emoji' | 'text' | 'none';
  transitionSpeed: 'instant' | 'fast' | 'normal' | 'slow';
  blurIntensity: 0 | 1 | 2 | 3; // Backdrop blur levels
  customColors?: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
}
```

### CSS Theme Variables
```css
:root {
  /* Teal Theme */
  --color-primary: #14b8a6;
  --color-secondary: #06b6d4;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #e2e8f0;
  --color-accent: #f59e0b;
  
  /* Chat Styles */
  --chat-message-radius: 18px;
  --chat-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-speed: 0.3s;
  --transition-timing: ease-out;
  
  /* Blur */
  --backdrop-blur: blur(8px);
}

/* Switch themes via CSS class */
.theme-purple {
  --color-primary: #a855f7;
  --color-secondary: #ec4899;
  --color-background: #0f0819;
  --color-surface: #1f0933;
  --color-text: #f3e8ff;
  --color-accent: #06b6d4;
}

.theme-sakura {
  --color-primary: #f472b6;
  --color-secondary: #f87171;
  --color-background: #fef3f8;
  --color-surface: #fce7f3;
  --color-text: #831843;
  --color-accent: #a78bfa;
}
```

---

## 📸 Character Portrait Upload System

### Upload Interface
```typescript
interface CharacterUploadForm {
  characterName: string;
  portraitImages: {
    neutral: File;
    happy: File;
    sad: File;
    angry: File;
    surprised: File;
    confused: File;
    embarrassed: File;
    thinking: File;
    romantic: File;
    fearful: File;
    custom1?: File;
    custom2?: File;
  };
  settings: {
    transitionDuration: number;
    emotionDetectionSensitivity: 'low' | 'medium' | 'high';
    autoTransition: boolean;
  };
}
```

### Upload UI Component
```jsx
<div className="portrait-upload-container">
  <h3>Upload Character Portraits</h3>
  
  <div className="emotion-slots-grid">
    {emotions.map(emotion => (
      <div key={emotion} className="emotion-slot">
        <label>
          <div className="emotion-slot-preview">
            {previewImage[emotion] && (
              <img src={previewImage[emotion]} alt={emotion} />
            )}
          </div>
          <span className="emotion-label">
            {emotionEmojis[emotion]} {emotion}
          </span>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => handleImageUpload(emotion, e)}
          />
        </label>
      </div>
    ))}
  </div>
  
  <div className="upload-settings">
    <label>
      Transition Duration (ms):
      <input 
        type="range" 
        min="100" 
        max="1000" 
        value={settings.transitionDuration}
      />
    </label>
    
    <label>
      Emotion Detection Sensitivity:
      <select value={settings.emotionDetectionSensitivity}>
        <option value="low">Low (only strong emotions)</option>
        <option value="medium">Medium (balanced)</option>
        <option value="high">High (detect subtle emotions)</option>
      </select>
    </label>
    
    <label>
      <input 
        type="checkbox" 
        checked={settings.autoTransition}
      />
      Auto-transition with emotions
    </label>
  </div>
  
  <button onClick={handleUpload}>Save Character</button>
</div>
```

### Emotion Slot Styling
```css
.emotion-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.emotion-slot {
  position: relative;
  cursor: pointer;
}

.emotion-slot-preview {
  width: 100%;
  aspect-ratio: 3/4;
  background: rgba(30, 41, 59, 0.6);
  border: 2px dashed rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.emotion-slot-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.emotion-slot:hover .emotion-slot-preview {
  border-color: #14b8a6;
  background: rgba(20, 184, 166, 0.1);
}

.emotion-slot input[type="file"] {
  display: none;
}

.emotion-label {
  display: block;
  text-align: center;
  font-size: 12px;
  margin-top: 8px;
  color: #94a3b8;
}
```

---

## ⚙️ Settings Panel

### Theme & Appearance Settings
```typescript
<div className="settings-panel">
  <h3>Theme & Appearance</h3>
  
  {/* Color Scheme Selector */}
  <div className="setting-group">
    <label>Color Scheme</label>
    <div className="scheme-selector">
      {['teal', 'purple', 'sakura', 'forest', 'custom'].map(scheme => (
        <button
          key={scheme}
          className={`scheme-button ${activeScheme === scheme ? 'active' : ''}`}
          onClick={() => setTheme(scheme)}
        >
          {scheme}
        </button>
      ))}
    </div>
  </div>
  
  {/* Chat Style */}
  <div className="setting-group">
    <label>Chat Style</label>
    <select value={chatStyle} onChange={(e) => setChatStyle(e.target.value)}>
      <option value="modern">Modern Fluid</option>
      <option value="vn">Visual Novel</option>
      <option value="minimal">Minimal</option>
      <option value="cyberpunk">Cyberpunk</option>
    </select>
  </div>
  
  {/* Portrait Size */}
  <div className="setting-group">
    <label>Portrait Size</label>
    <div className="slider-group">
      <input 
        type="range" 
        min="small" 
        max="large" 
        value={portraitSize}
        onChange={(e) => setPortraitSize(e.target.value)}
      />
      <span>{portraitSize}</span>
    </div>
  </div>
  
  {/* Message Layout */}
  <div className="setting-group">
    <label>Message Layout</label>
    <select value={messageLayout} onChange={(e) => setMessageLayout(e.target.value)}>
      <option value="compact">Compact</option>
      <option value="spacious">Spacious</option>
      <option value="bubble">Bubble</option>
      <option value="flat">Flat</option>
    </select>
  </div>
  
  {/* Emotion Display */}
  <div className="setting-group">
    <label>Emotion Display</label>
    <select value={emotionDisplay} onChange={(e) => setEmotionDisplay(e.target.value)}>
      <option value="badge">Badge (Icon + Label)</option>
      <option value="emoji">Emoji Only</option>
      <option value="text">Text Only</option>
      <option value="none">None</option>
    </select>
  </div>
  
  {/* Transition Speed */}
  <div className="setting-group">
    <label>Transition Speed</label>
    <div className="speed-selector">
      {['instant', 'fast', 'normal', 'slow'].map(speed => (
        <button
          key={speed}
          className={`speed-button ${transitionSpeed === speed ? 'active' : ''}`}
          onClick={() => setTransitionSpeed(speed)}
        >
          {speed}
        </button>
      ))}
    </div>
  </div>
  
  {/* Blur Intensity */}
  <div className="setting-group">
    <label>Blur Intensity</label>
    <input 
      type="range" 
      min="0" 
      max="3" 
      value={blurIntensity}
      onChange={(e) => setBlurIntensity(Number(e.target.value))}
    />
  </div>
  
  {/* Custom Color Picker (if custom theme selected) */}
  {colorScheme === 'custom' && (
    <div className="custom-colors">
      <h4>Custom Colors</h4>
      <div className="color-picker-group">
        <label>Primary Color</label>
        <input type="color" value={customColors.primary} />
      </div>
      {/* More color pickers... */}
    </div>
  )}
</div>
```

### Settings Panel Styling
```css
.settings-panel {
  max-width: 400px;
  padding: 20px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.setting-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-group label {
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scheme-selector,
.speed-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.scheme-button,
.speed-button {
  padding: 8px 12px;
  background: rgba(71, 85, 105, 0.3);
  border: 1px solid rgba(71, 85, 105, 0.5);
  color: #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.scheme-button:hover,
.speed-button:hover {
  background: rgba(20, 184, 166, 0.1);
  border-color: #14b8a6;
  color: #14b8a6;
}

.scheme-button.active,
.speed-button.active {
  background: #14b8a6;
  border-color: #14b8a6;
  color: white;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-group input[type="range"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, #14b8a6, #0d9488);
  outline: none;
}
```

---

## 📱 Responsive Breakpoints

### Desktop (1024px+)
- Portrait: Left sidebar, 280x400px
- Messages: 70% width
- Full theme options visible

### Tablet (768px - 1023px)
- Portrait: 240x360px, sidebar
- Messages: 65% width
- Simplified theme selector

### Mobile (< 768px)
- Portrait: Collapsible top, 100x150px expanded
- Messages: Full width
- Compact settings panel
- Simplified controls

---

## 🎬 Animation Specifications

### Portrait Transition
```css
@keyframes portraitFade {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.portrait-image.transitioning {
  animation: portraitFade 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Message Entrance
```css
@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble {
  animation: messageSlide 0.3s ease-out;
}
```

### Emotion Badge Pulse
```css
@keyframes badgePulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(20, 184, 166, 0);
  }
}

.emotion-badge.new {
  animation: badgePulse 1s ease-out;
}
```

---

## 💾 Data Structure

### Character with Emotion States
```typescript
interface CharacterWithEmotions {
  id: string;
  name: string;
  source?: string; // e.g., "Anime", "Game", "Custom"
  modeType: 'generic' | 'personality';
  behaviorMode: 'true-to-char' | 'off-script';
  
  portraits: CharacterPortrait;
  
  emotionSettings: {
    sensitivity: 'low' | 'medium' | 'high';
    autoTransition: boolean;
    customEmotionMap?: Record<string, string[]>; // Custom keyword mapping
  };
  
  themeOverride?: ThemeSettings;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Conversation with Emotions
```typescript
interface ConversationMessage {
  id: string;
  role: 'user' | 'character';
  content: string;
  timestamp: Date;
  
  // Emotion tracking
  detectedEmotion: Emotion;
  emotionConfidence: number; // 0-100
  portraitState: Emotion; // Which portrait was displayed
  
  // For custom emotion mapping
  customEmotionTags?: string[];
}
```

---

## 🔧 Implementation Priority

### Phase 2.1: Basic VN UI (Week 1)
- [ ] Character portrait display with emotion states
- [ ] Emotion detection algorithm
- [ ] Smooth portrait transitions
- [ ] Emotion badge display
- [ ] Portrait upload interface

### Phase 2.2: Theme System (Week 2)
- [ ] 5 pre-made color schemes
- [ ] Theme switcher UI
- [ ] CSS variables implementation
- [ ] Custom color picker

### Phase 2.3: Advanced Settings (Week 3)
- [ ] Settings panel with all options
- [ ] Chat style selector
- [ ] Message layout variations
- [ ] Transition speed control

### Phase 2.4: Polish & Optimization (Week 4)
- [ ] Animation tweaks
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] User feedback & iteration

---

## 🎨 Visual Summary

**The result is:**
- Minimalist Visual Novel aesthetic for character display
- Fluid, modern chat interface that's not restrictive
- Dynamic emotion-driven portrait changes
- Extensive theme customization
- Support for custom character artwork
- Responsive across all devices

**Key principle**: The VN-style portrait adds emotional depth, while the chat interface remains modern, clean, and functional.

---

**🎭 StageEgo: Emotional AI Conversations with VN Aesthetics**
