# StageEgo Structural Brief — UI Redesign
**Current State Overview for UI Direction Planning**

---

## 0. NAVIGATION ARCHITECTURE (Added 2026-10-03)

The app has **6 top-level destinations**, all reachable from the left sidebar nav (desktop) or bottom tab bar (mobile). This is the authoritative routing map — not the sessions-only sidebar the original brief described.

| # | Label | Icon | Destination |
|---|---|---|---|
| 1 | Home | House | Dashboard screen (welcome, recent chats, featured characters, stats) |
| 2 | Chat | MessageSquare | Active chat window — loads most recent session |
| 3 | Characters | Users | Character select + creation (Generic & Personality tabs) |
| 4 | Sessions | Clock | Full session history (all past chats, searchable, grouped by date) |
| 5 | VoiceLab | Mic | Standalone voice configuration + preview screen |
| 6 | Settings | Settings | Settings modal (opens as overlay from any screen) |

**Desktop:** Left sidebar is always visible (220px wide). Active nav item highlighted with accent color pill background.
**Mobile:** Left sidebar hidden; replaced by bottom tab bar (4 tabs: Chat, Characters, Voice, Settings). Home is accessed via a logo tap or swipe-left gesture.

**Entry flow (corrected):**
1. App loads → animated shell
2. Auth screen (Sign In / Guest)
3. **Home Dashboard** (new default landing after auth)
4. User taps Chat → enters ChatWindow
5. User taps Characters → enters CharacterSelect

---

## 1. ENTRY & AUTHENTICATION

**Loading State**
- Animated shell (HTML pre-React) with breathing mark logo + gradient sweep bar
- Fades out as React mounts (250ms fadeIn)
- Background layer (fixed, animated gradient/aurora/solid per theme) loads beneath

**Authentication Screen (Auth.tsx)**
- Two options: Sign In OR Continue as Guest
- No current Google/social login (Supabase auth stubbed, not fully wired)
- Clean, minimal presentation (no complex onboarding flow)
- Guest mode allows full app use with localStorage only

**Post-Auth**
- Lands on **Home Dashboard** (not ChatWindow directly — see Section 1.5)
- Home Dashboard is the default screen after every login/reload
- If account linked: auto-login on reload (future, not yet built)

---

## 1.5 HOME / DASHBOARD SCREEN (Added 2026-10-03)

This is the landing screen after auth. It is a **new component** (HomeDashboard.tsx) that does not currently exist in the codebase.

### Layout — Desktop (3 columns)
- **Left**: sidebar nav (always present, shared across all screens)
- **Center**: hero + recent chats + featured characters grid
- **Right**: quick stats panel + mode toggles

### Hero Section (Center, top)
- Aurora animated background (same as rest of app, full-bleed)
- Greeting: "Welcome Back, [name]" (large, accent color on name)
- Sub-text: "What kind of character do you want to talk to today?"
- Large search/chat input: "Type a message, or try something like..."
- Quick-command chips below input: "Be Naruto", "Tell me a story", "Give me advice", "Just chat"

### Recent Chats Panel (Center, bottom-left)
- Header: "Recent Chats" + clock icon + "View All →" link
- List of last 5 sessions: character avatar + name + last message preview + time + mode badge (Personality/Generic)
- "+ New Chat" row at bottom
- Each row: 3-dot menu on hover (rename, delete)

### Featured Characters Panel (Center, bottom-right)
- Header: "Featured Characters" + star icon + "View All →" link
- 5 character rows: avatar + name + source (Anime · Show) + quote + chevron
- Tapping a row loads that character directly

### Right Panel
- **Quick Stats** card: Total Chats, Characters Met, Voice Messages, This Week % (mini grid, 2×2)
- **Your Modes** card: Personality Mode toggle (on/off) + Generic Mode toggle (on/off), each with description, "Manage →" link

### Footer Bar (Bottom, full-width)
- Brand mark + "StageEgo" + tagline "Your AI. Your Characters. Your World."
- 4 icon+label pairs: Chat (Real conversations), Voice (Speak & listen), Characters (Endless possibilities), Infinity (No limits)

### Mobile
- Hero collapses to single-column: greeting + input + chips
- Recent chats + featured characters stack vertically
- Stats + modes stack below
- No right panel — everything is linear scroll

---

## 2. MAIN CHAT INTERFACE (ChatWindow.tsx)

### 2.1 Layout Structure
**Desktop (1024px+)**
- Left sidebar: (8-12rem) session history, character list, new chat button
- Center: main chat area (messages, input)
- Right sidebar (Personality Mode only): VN character portrait cutout + name/emotion badge

**Mobile (< 1024px)**
- Full-width chat area
- Portrait hidden (too large for small screens)
- Sidebar collapses to hamburger menu or swipe drawer
- Bottom bar: voice toggle, character switch (Generic), settings

### 2.2 Header (Persistent, All Screens)
- Left: app branding (SVG mark, no emoji)
- Center: current chat title or "New Chat"
- Right icons:
  - Circular character avatar (profile pic, 32-40px)
    - Personality Mode: character's portrait (cropped to circle)
    - Generic Mode: currently-embodied character thumbnail (fetched on switch)
    - Fallback: initials or default avatar
  - Settings icon (cog, opens modal overlay)
  - Help icon (question mark, opens HelpHub)
  - Mobile only: menu toggle (hamburger)

### 2.3 Main Chat Area
**Message Thread**
- User messages: right-aligned, accent color bubble (tinted by character theme or user color picker)
- AI responses: left-aligned, semi-transparent glass surface with accent-colored left border (2-4px)
- First response from newly-fetched character (Generic Mode): citation tag ("via Fandom" etc)
- Timestamps: optional, on hover or bottom of each message

**Emotion Detection (Personality Mode)**
- AI response can include `[emotion:happy]` tag → stripped, emotion-reactive portrait updates
- Portrait swaps to emotion-specific image if uploaded; keyword fallback if not
- Emotion badge appears below character name on portrait panel

**Voice Output (If Enabled)**
- AI response plays aloud automatically
- Playback controls: pause/resume/volume in message itself
- Waveform visualization optional (currently in VoiceLab, not main chat)

### 2.4 Character Switching

**Personality Mode**
- Character locked for entire session
- Cannot switch mid-session (would break immersion)
- Fork or delete → new session with new character

**Generic Mode**
- Type "be Sherlock", "become Naruto", "switch to Batman" → AI detects, character switches
- Character fetched from Fandom → AniList → MAL priority chain
- Thumbnail updates in header immediately
- Switch notice appears briefly: "Switching to [name]..."
- Can switch infinitely mid-session

**Character Search Modal (CharacterSearchModal.tsx)**
- Triggered by typing or tapping character switch button (Generic Mode)
- Search box, search results with thumbnails + name
- Shows source (Fandom/AniList/MAL), character description
- Live progress narration while fetching ("Searching Fandom...", "Fetching AniList...", etc)

### 2.5 Voice Input & Output

**Voice Mode Toggle**
- Button in header or footer
- Persists across sessions (localStorage)

**Microphone Input (Push-to-Talk)**
- Tap/hold to listen
- Live transcription updates input field as speaking
- Auto-send after 2s silence OR tap to send manually
- Mic quality warning if detected (low volume, background noise hint)
- External mic hint if detected (e.g., "Bluetooth mic connected")
- Accessible: visual indicator of listening state (pulsing icon, waveform)

**Voice Output**
- Auto-play AI response if voice mode on
- Playback controls (pause/resume/speed) in message
- Speaker icon in header shows playback status
- 11 voice settings:
  - Provider (Google, ElevenLabs, Azure, browser native)
  - Voice ID
  - Speed (0.5x – 2.0x)
  - Pitch (optional, provider-dependent)
  - Volume
  - Expressiveness (per character, 0–100%)
  - Auto-play (on/off)
  - Pause on input (if user starts typing while AI speaks, pause)
  - Languages/accents
  - Quality tier
  - Output device

### 2.6 Input Bar (Bottom)

**Text Input**
- Multiline textarea (grows to ~4 lines, then scrolls)
- Character count optional (if close to API limit, show warn)
- Placeholder: "Type a message... or tap the mic"

**Buttons (Right of Input)**
- Mic toggle: tap to listen, hold to record (press-to-toggle model)
- Send button:
  - Flat → glossy 3D style (gradient + top highlight + soft shadow, pressed = depressed)
  - Accent color (user-selected or character theme color)
  - Disabled state if input empty or API request in flight
  - Loading spinner on send (streaming enabled)

**Status Indicators (Above Input)**
- Temporary: "Switching to [character]..." (clears after 2.5s)
- Temporary: "Mic warning: low volume" (if detected)
- Temporary: "Using [external mic label]" (if detected)
- Temporary: API error feedback (red, dismissible)

### 2.7 Portrait Panel (Personality Mode, Desktop Only)

**Visual Treatment**
- True cutout: image rendered uncropped, transparent background
- Floats against app background (no card/frame behind it)
- Positioned on right sidebar (desktop) or hidden (mobile)
- Size: ~200-300px tall (user-configurable in theme settings)

**Elements Overlaid on Portrait**
- Character name + emotion badge (small pill below face)
- Optional: relationship status (if feature added later)
- Optional: ambient glow/aura behind character (accent color, animated)
- Optional: hover/idle animation (breathing, subtle sway)

**Per-Emotion Portrait Upload**
- Happy, Sad, Angry, Surprised slots (150KB cap each)
- Falls back to default portrait if slot unset
- User uploads: FileReader → base64 → localStorage (500KB total portrait cap per character)

---

## 3. CHARACTER SELECT & CREATION

### 3.1 Character Select Screen (CharacterSelect.tsx)

**Landing (First-Time User)**
- Two panels side-by-side (desktop) or stacked tabs (mobile):
  - **Generic Mode**: "Search & Switch" — cyan/teal accent
    - Browse/search any character in Fandom/AniList/MAL database
    - Switch anytime mid-session
    - No session commitment
  - **Personality Mode**: "Create & Lock" — amber/gold accent
    - Create a custom character snapshot
    - One locked character per session
    - Immutable once created (can fork or delete only)

**Saved Characters List**
- Grid or list view (user toggle in settings)
- Thumbnail + name + mode badge (cyan for Generic fetch, amber for Personality saved)
- Stats: messages sent, last used, created date
- Actions: switch/load, edit (Personality fork only), delete, duplicate

**Generic Mode Panel**
- "Search any character" input
- Recent searches / trending characters carousel
- Fetch from Fandom/AniList/MAL live
- Citation shown first response this session

**Personality Mode Panel**
- "Create New Character" button → opens creation flow (modal or slide-out)
- Saved custom characters: grid/list
- Each card shows: portrait thumbnail, name, Lore-Locked vs Open-World badge, fork count, delete button

### 3.2 Character Creation Flow (Modal/Drawer)

**Step 1: Basic Info**
- Name
- Source (original character, game, anime, book, etc)
- Short bio (1-3 sentences)
- Is this character original or from existing media?

**Step 2: Personality & Behavior**
- Core traits (3-5 keywords: brave, sarcastic, thoughtful, etc)
- Speak style (formal, casual, poetic, etc)
- Mood (optimistic, cynical, neutral)
- Free-form custom instructions (what to emphasize in responses)

**Step 3: Knowledge Mode**
- Lore-Locked: confined to source world, unfamiliar with modern concepts
- Open-World: full general knowledge, filtered through personality
- Implicit: character can't know it's an AI (hardcoded system rule)

**Step 4: Appearance (Optional but Encouraged)**
- Upload portrait image (FileReader, 500KB cap, transparent background recommended)
- Per-emotion portraits (happy/sad/angry/surprised, 150KB each)
- Theme color: hex input + spectrum picker
- Theme tint options: which UI elements use this color

**Step 5: Relationships & Context (Optional)**
- Relationship to user (friend, mentor, rival, love interest, etc) — text description
- Reference link (wiki URL, character sheet link for lookup)
- Seed context (user-curated snippet, capped 2000 chars, used for fork lineage only)

**Step 6: Review & Create**
- Summary of all fields
- "Create Character" button
- On create: character stored to localStorage, user lands in chat with that character locked

---

## 4. SETTINGS MODAL (SettingsModal.tsx)

**Modal Presentation**
- Overlay with semi-transparent backdrop (glass blur behind)
- Drawer-style (slides in from right on mobile, floats centered on desktop)
- Persistent across screens (can open from chat, character select, etc)
- Dismiss: X button, ESC key, click backdrop

**6 Tabs (Vertical on Mobile, Horizontal on Desktop)**

### 4.1 General
- Display name / user profile nickname
- Character count: "You have X saved characters"
- "Clear all characters" button (double-confirm popup)
- Theme/appearance quick toggle (already in Appearance tab, but linked here)
- Auto-save toggle (on/off for localStorage debounce)
- Export/import data (future)

### 4.2 Standard Assistant
- API key input (Anthropic, OpenAI, Gemini) with format validation
- Test connection button → quick API call to verify key works
- Model selection dropdown (varies per provider)
- Temperature slider (0.0 – 2.0, live preview of setting)
- Max tokens slider (optional, provider-dependent)
- System prompt preview (read-only, shows the hardcoded immersion rules)

### 4.3 Character Management
- Profanity tolerance dropdown: (Off / Light / Moderate / Strict)
  - Controls how aggressively the character filters swearing
  - Saved to localStorage, affects all character responses
- Character creation template suggestions (optional, future)
- Batch delete (select multiple saved characters, delete)

### 4.4 Advanced
- Reduce visual effects toggle (for low-power devices; disables glass/glow)
- Debug mode toggle (shows API request/response in console)
- Cache clear button (localStorage history, character cache)
- Session timeout slider (how long before idle auto-logout, if implemented)
- Data storage limit info (localStorage is ~5-10MB, show current usage)

### 4.5 Appearance
- **Theme Mode**
  - Light / Dark / OLED (radio buttons)
  - Immediate preview on selection

- **Background**
  - Animation style: Aurora (animated gradient mesh) / Gradient (static) / Solid (flat color)
  - Animated toggle (if Aurora/Gradient, can slow down animation)
  - Background image upload (future: currently hardcoded Tailwind classes)

- **Glass & Effects**
  - Blur slider (0 – 100%, controls backdrop-filter blur)
  - Sheen slider (0 – 100%, controls glass shine/reflectiveness)
  - Saturation slider (50% – 150%, tint intensity)
  - Contrast slider (50% – 150%, overall contrast)
  - All apply live to chat + UI elements

- **Motion & Transitions**
  - Motion style: Smooth (standard easing) / Jelly (bouncy) / Fade (opacity only) / Instant (no animation)
  - Speed (0.5x – 2.0x multiplier on all transitions)

- **Color & Theming**
  - Preset themes: 4 color combos from VISUAL_NOVEL_UI_SPEC (Neon Purple, Deep Cyan, Sunset Amber, etc)
  - Custom color picker: 
    - Primary accent color (spectrum/hex input)
    - Secondary accent color (optional, spectrum/hex input)
  - Live preview: sends button, message bubble, sidebar glow update as you pick

### 4.6 Voice & Speech
- **Global Voice Settings**
  - Voice output toggle (on/off)
  - Provider: Google / ElevenLabs / Azure / Browser Native (if available)
  - Voice ID (dropdown, provider-specific)
  - Speed (0.5x – 2.0x)
  - Pitch (provider-dependent, may be locked)
  - Volume (0% – 200%, live test button)
  - Expressiveness (0 – 100%, AI warmth/emphasis)

- **Per-Character Voice Overrides**
  - Volume override (per character)
  - Expressiveness override (per character)
  - Voice ID override (per character)

- **Speech Input (Mic)**
  - Continuous listening toggle (stay open after transcribed)
  - Auto-send on silence: off / 1s / 2s / 3s
  - Language: English (en-US, en-GB, etc)

- **Playback**
  - Auto-play responses (on/off)
  - Pause AI speech if user starts typing (on/off)
  - Playback device (if multiple audio outputs detected)

---

## 4.7 VOICELAB PAGE (Added 2026-10-03 — standalone screen)

VoiceLab is a **dedicated full-screen page**, not just a Settings tab. It is the destination when a user taps VoiceLab in the nav. The Settings modal's Voice & Speech tab links here.

### Layout
- Left: nav sidebar (same as all screens)
- Center: VoiceLab content (full width on mobile)

### Sections
1. **Provider & Voice Selection**: dropdown for provider (Google/ElevenLabs/Azure/Browser), voice ID selector, test connection button
2. **Voice Controls**: Speed slider, Pitch slider, Volume slider, Expressiveness slider — all with live preview button
3. **Per-Character Overrides**: list of saved characters with individual volume/expressiveness/voice ID overrides
4. **Speech Input**: continuous listening toggle, auto-send on silence (off/1s/2s/3s), language selector
5. **Playback**: auto-play toggle, pause-on-typing toggle, output device selector
6. **Test Panel**: text input + "Preview Voice" button → plays sample in selected voice/settings

### Visual Treatment
- Glass panels for each section
- Waveform visualization on test playback
- Sliders use accent color fill
- "Preview Voice" uses btn-3d

---

## 5. SIDEBAR & NAVIGATION (Updated 2026-10-03)

### 5.1 Desktop Left Sidebar (220px, always visible)
**Top Section:**
- App logo + brand mark (24px SVG mark + "StageEgo" wordmark)
- Tagline: "Different Characters. Infinite Conversations."

**Nav Items (6 total, icon + label):**
- Home (House icon) — Dashboard
- Chat (MessageSquare icon) — ChatWindow, active chat
- Characters (Users icon) — CharacterSelect
- Sessions (Clock icon) — full session history list
- VoiceLab (Mic icon) — VoiceLab page
- Settings (Settings icon) — opens Settings overlay

**Active state:** accent color pill background on current nav item.
**Hover state:** subtle glass highlight, icon brightens.

**Bottom Section:**
- User profile card: avatar + display name + mode badge (Guest/Account)
- Click → opens UserProfileModal

### 5.2 Sessions Page (destination of "Sessions" nav item)
- Full-screen list of all past sessions
- Search box at top
- Grouped by date: Today / Yesterday / This Week / Older
- Each row: character avatar (24px) + session name + last message preview + timestamp + mode badge
- Hover: rename / delete / fork icons appear
- Click: loads that session in ChatWindow

### 5.3 Mobile Bottom Tab Bar (replaces sidebar on mobile)
4 tabs, always visible at bottom:
| Tab | Icon | Destination |
|---|---|---|
| Chat | MessageSquare | ChatWindow |
| Characters | Users | CharacterSelect |
| Voice | Mic | VoiceLab |
| Settings | Settings | Settings overlay |

Home accessible via logo tap or swipe-left on Chat tab.
Active tab: accent color icon + label, rest muted.
Tab bar: glass surface, safe-area padding for notch/home-indicator.

---

## 6. VISUAL LANGUAGE & DESIGN TOKENS

### 6.1 Color Palette
- **Accent Colors**: User-selectable via spectrum picker
  - Primary: tints send button, message bubbles, sidebar glow
  - Secondary: optional, for UI accents and borders
  - Fallback (if no user theme): teal (#14b8a6) or cyan (#06b6d4)

- **Glass/Transparency**: 
  - Background: rgba(15, 23, 42, 0.5) (dark mode) / rgba(248, 250, 252, 0.7) (light mode)
  - Backdrop-filter: blur + saturation
  - Border: 1px solid with accent tint

- **Text**
  - Primary (foreground): #0f172a (dark mode) / #f8fafc (light mode)
  - Secondary (muted): dim by ~40%
  - On glass: slightly higher contrast due to backdrop blur

### 6.2 Typography
- **Fonts**: System stack or single web font (TBD)
- **Scale**: 
  - XS (11px): captions, tags
  - SM (13px): labels, secondary text
  - BASE (14-16px): body copy, message text
  - MD (18px): input text, message author
  - LG (20px): tab titles, headers
  - XL (24px): chat title, main heading
  - 2XL (32px): logo/mark, landing headline

### 6.3 Spacing & Layout
- Base unit: 4px (TailwindCSS default)
- Component padding: 8-16px
- Container max-width: 1280px (desktop)
- Message bubble max-width: 70% (desktop), 85% (mobile)
- Gaps: 8px (compact), 16px (normal), 24px (loose)

### 6.4 Glass/Glow Effects
- Backdrop-filter: blur + saturation per appearance settings
- Box-shadow: soft outer glow (accent color tinted)
- Hover state: inner top highlight (lighter gradient)
- Active/pressed: shadow reduces (depressed effect)

### 6.5 Animations & Transitions
- Duration: 200ms (fast) / 300ms (normal) / 500ms (slow), scaled by motion setting
- Easing: ease-out (default) / cubic-bezier(0.34, 1.56, 0.64, 1) (jelly bounce)
- Fade: opacity 0 → 1
- Slide: translateX/Y
- Glow pulse: opacity + shadow breathe on idle

### 6.6 Motion Styles (Appearance Setting)
- **Smooth**: ease-out, 300ms
- **Jelly**: bounce easing, 400ms (more playful)
- **Fade**: opacity only, 250ms (minimal motion, cleaner)
- **Instant**: 0ms (accessibility/performance escape hatch)

---

## 7. SCREEN TRANSITIONS & MICRO-INTERACTIONS

### 7.1 Page Load
1. Auth shell appears (animated mark + sweep bar)
2. Background layer renders behind
3. React mounts, shell fades out (250ms)
4. Auth screen or ChatWindow fades in

### 7.2 Auth → ChatWindow
- Auth screen slides out left (or fades)
- ChatWindow slides in from right
- Sidebar + main chat stagger in (50ms delays)

### 7.3 Character Switch (Generic Mode)
- Switch notice appears below header ("Switching to [name]...")
- Character thumbnail in header updates (fade in)
- Ambient glow behind name shifts to new accent color (smooth transition)
- Notice auto-dismisses after 2.5s

### 7.4 Message Receive
- User message send: shake feedback or scale-up bounce, send button disabled
- API streaming starts: "loading..." indicator (pulsing dot or typingcarousel)
- AI message appears: fade in with scale-up (soft entry)
- Emotion-reactive portrait updates on `[emotion:x]` tag: cross-fade to emotion-specific image
- Voice playback starts: waveform animation plays (if visible)

### 7.5 Settings Open
- Backdrop appears (dark overlay, glass blur behind)
- Modal slides in from right (desktop) or bottom (mobile)
- Tabs stagger-fade in (50ms apart)
- First tab content renders (Appearance live-previews changes as you adjust)

### 7.6 Theme/Appearance Change
- Background gradient animates to new state (smooth color transition)
- Glass colors update (accent tint shifts)
- Button styles re-apply (shadow/highlight adjust)
- Text contrast updates
- All within 300-500ms (no jarring flash)

### 7.7 Mic Toggle
- Tap to activate: waveform icon animates (breathing or pulse)
- Listening state: visual feedback (icon glows, input placeholder changes)
- Transcription arrives: fade in below input, replace as it streams
- Tap to send or auto-send on silence: icon returns to normal, waveform clears

### 7.8 Portrait Update
- New emotion portrait fetches: cross-fade (opacity)
- Ambient glow updates: smooth transition (2-3s)
- No jarring swap

---

## 8. ERROR & LOADING STATES

### 8.1 Loading States
- Message streaming: animated dots (•••) or typing carousel
- Character fetch (Generic Mode): multi-line progress ("Searching Fandom... Checking AniList... Found!")
- Settings save: spinner with "Saving..." text, "Saved!" confirmation
- API error: red banner with error text + retry button, persists until dismissed or message sent successfully

### 8.2 Error Messages
- Empty input send: brief feedback ("Type something first")
- API failure: error text + "Retry" button
- Character not found: "No results for [search]" + suggestions
- Auth failure: clear error message + hint (wrong password? typo?)
- Offline/network: "No internet connection" + retry when online

---

## 9. MOBILE & RESPONSIVE DESIGN

### 9.1 Breakpoints
- Mobile: < 640px (portrait phone)
- Tablet: 640px – 1024px (landscape phone / small tablet)
- Desktop: ≥ 1024px

### 9.2 Mobile-Specific Changes
- Sidebar: hamburger drawer (swipe or tap menu icon)
- Portrait panel: hidden entirely (too tall for screen)
- Chat messages: full-width, tight margins
- Input bar: adjusted for thumb reach (taller touch targets, 44px minimum height)
- Modal: full-screen or slide from bottom (not centered float)
- Settings tabs: vertical stack (not horizontal)

### 9.3 Touch Targets
- Minimum 44px × 44px (Apple HIG standard)
- Buttons, icons, interactive elements respect this
- Spacing on mobile: tighter (8px gaps instead of 12px)

---

## 10. ACCESSIBILITY CONSIDERATIONS

### 10.1 Visual
- Text contrast: WCAG AA minimum (4.5:1 for body)
- Focus rings: visible, accent color
- Color not only signal (icons + text, not just color)
- Reduced motion honored (`prefers-reduced-motion`)

### 10.2 Semantic HTML
- Buttons use `<button>` (not `<div onClick>`)
- Links use `<a>` with proper href
- Labels for all form inputs
- ARIA labels for icon-only buttons (mic, voice, settings)

### 10.3 Keyboard Navigation
- Tab order: logical flow (left-to-right, top-to-bottom)
- ESC closes modals
- Enter sends message
- Arrow keys navigate lists (if implemented)

---

## 11. FUTURE FEATURES (Deferred, Not in Brief)

- User background image upload (needs IndexedDB, localStorage bottleneck)
- Per-device appearance settings (desktop vs mobile, synced to account)
- Avatar creation tool upgrade (currently "a bit blocky", per Arthur)
- Per-character settings (Known Issue #17)
- Account-level sync for data (currently localStorage only, Phase 9)
- Batch character operations

---

## 12. HOW TO USE THIS BRIEF

**For Finding Reference Images:**
- Search "modern chat app interface", "liquid glass UI", "neon accent chat", "character selection screen"
- Look for: clean layouts, glass effects, smooth animations, modern color palettes
- Apps to reference: Claude.ai, Discord, Character.AI, Telegram, Linear, Figma
- Button style: glossy/3D (gradient + inner highlight + soft shadow)
- Portrait treatment: layered cutout or stacked panels

**For Briefing an AI Image Generator:**
- Copy sections 1–11 above into your prompt
- Add: "Redesign this app to feel modern, advanced, and visually rich"
- Specify: "Liquid glass surfaces, neon accent colors, smooth micro-interactions"
- Include: "Mobile first, responsive to desktop"
- Result: Will get stylized mockup/inspiration for direction

**For Next Steps with Claude:**
- Upload reference images you find
- Send this brief + images → I'll create detailed design docs (layout, color, spacing, animations)
- We agree on structure → I build components
- Iterate based on local test

---

