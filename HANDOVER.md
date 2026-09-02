# StageEgo — Project Handover Document

> **This file is the single source of truth for the StageEgo project.**
> It must be read at the start of every new session before any work begins.
> It must be updated after every completed task or phase — not at the end of a session, but immediately after each item is done.

---

## RULES FOR ANY CLAUDE SESSION READING THIS FILE

1. **Read this file first, always.** Before touching any code, fetch and read this file from the repo. Do not rely on training data or conversation history alone.
2. **Update after every completed task.** As soon as a task or phase is finished and committed, update this file in the same commit or immediately after. Do not batch updates to the end of a session — context windows compress and credits get consumed without warning.
3. **Never mark something complete unless it is committed and pushed.** Typecheck passed + build passed + `git push` confirmed = complete. Nothing else counts.
4. **When adding a new task or phase** (given by the user or self-identified), add it to Section 3 immediately, before starting work.
5. **When fixing a bug or discovering an issue**, add it to Section 5 as PENDING immediately. Mark it HANDLED only after it is committed and pushed.
6. **Update the "Priority order for next session"** at the bottom of Section 7 before ending any session.
7. **Do not remove old completed or handled entries** — the log is permanent for reference.

---

## 1. Project Overview

**StageEgo** is a web-based AI character chatbot with a two-sided-coin architecture. It is NOT a generic AI assistant and NOT a performance coaching tool (earlier misalignment — fully corrected and old docs deleted).

**Tech stack:** React 18 + TypeScript + Tailwind CSS + Vite + Lucide React
**Repo:** `https://github.com/HuntrClaww/agent-claww`
**Deployment:** Netlify — `maihuku.netlify.app` — ⚠️ DEAL WITH LATER (deployment pipeline not yet confirmed aligned with current build)
**Backend:** Supabase (auth partially wired; character/chat data currently localStorage-only — full migration deferred to Phase 6)
**Git identity for commits:** `user.name = Claude UI Upgrade`, `user.email = arthur@dev.local`
**Repo path in container:** `/home/claude/agent-claww/`
**PAT:** Check Claude memory file `/areas/stageego.md` or the transcript journal at `/mnt/transcripts/` if missing

---

## 2. The Two-Sided Coin (Core Vision — Do Not Drift From This)

### SIDE A — Generic Mode (cyan)
- No character lock. No session commitment.
- User types "be Sherlock" / "become Naruto" / "switch to X" → AI detects the switch, calls `characterFetch.ts`, embodies the character on the spot.
- User can switch to any other character at any time mid-session.
- Each character learned on-demand via the fetch priority chain: Fandom → AniList → MAL → model knowledge.
- Citation tag shown on the first response from a newly-fetched character.

### SIDE B — Personality Mode (amber)
- One character locked for the entire session. Cannot switch mid-session.
- Two knowledge-access sub-options (chosen at character creation):
  - **Lore-Locked:** Strictly confined to their source world. No modern world knowledge. Reacts to unfamiliar concepts with in-character confusion or wonder.
  - **Open-World:** Full general knowledge and modern info, but filtered entirely through their personality. Ash Ketchum talks about the NBA finals the way a fiercely competitive trainer would.
- Characters created as **immutable one-time snapshots** — once created, core fields (name, behavior, bio, personality, background) are frozen. No editing.
- Only allowed mutations: **deletion** or **fork into a new character**.
- Fork carries optional user-curated seed context (capped at 2000 chars) — never automatic inheritance.
- Live session drift (Off-Script/Open-World mode learning during chat) never writes back to the saved character definition. Drift is session-only.

### Core Rules Baked Into Every System Prompt
- Characters **NEVER** say "I am an AI", "as a language model", or break immersion in any way — zero tolerance, non-negotiable.
- Characters **never** escalate to romantic or intimate territory unless the character was explicitly created that way by the user.
- Characters process real-world knowledge through their personality lens — not as a neutral encyclopedia.
- All of the above are in `buildSystemPrompt()` in `apiClient.ts`. Do not dilute them.

---

## 3. File Structure

```
src/
├── components/
│   ├── Auth.tsx
│   ├── CharacterPortrait.tsx     ← VN-style emotion-reactive portrait panel
│   ├── CharacterSelect.tsx       ← Two-sided-coin picker + full creation flow
│   ├── ChatWindow.tsx            ← Main chat, mode logic, portrait + theme wiring
│   ├── SettingsModal.tsx         ← Vertical-tab settings (4 tabs, all functional)
│   ├── Sidebar.tsx               ← Session history (currently placeholder grouping)
│   └── UserProfileModal.tsx      ← ⚠️ NOT YET REVIEWED — unknown scope
├── lib/
│   ├── apiClient.ts              ← Anthropic/OpenAI/Gemini, temperature, system prompt
│   ├── apiValidator.ts           ← Key format validation before test call
│   ├── characterFetch.ts         ← Fandom → AniList → MAL priority fetch chain
│   ├── characterStore.ts         ← Immutable create/delete/fork, portrait/theme/emotion storage
│   ├── emotionDetect.ts          ← [emotion:x] tag parsing + keyword fallback
│   └── supabase.ts               ← Auth client (partial)
├── App.tsx
└── index.css                     ← fadeIn keyframe + base background
HANDOVER.md                       ← THIS FILE
CORE_VISION.md                    ← Core design principles
VISUAL_NOVEL_UI_SPEC.md           ← VN portrait/emotion/theme spec
README.md
```

---

## 4. All Phases & Tasks

### Phase 1 — Core Architecture ✅ COMPLETE
- [x] Two-sided-coin CharacterSelect UI (cyan Generic vs amber Personality panels)
- [x] Real API integration: Anthropic, OpenAI, Gemini with auto-detection from key format
- [x] Generic Mode "be X" / "become X" / "switch to X" detection in ChatWindow
- [x] `characterFetch.ts` — Fandom → AniList → MAL priority chain with citation tags
- [x] `characterStore.ts` — immutable create/delete/fork model with fork lineage metadata
- [x] System prompt hardened: character immersion rules + platonic boundary guardrail
- [x] CORE_VISION.md written and committed
- [x] Old misaligned performance-coaching docs deleted from repo

### Phase 2 — VN-Style Visuals ✅ COMPLETE
- [x] `emotionDetect.ts` — [emotion:x] tag stripping + keyword-fallback detection
- [x] `CharacterPortrait.tsx` — emotion-reactive panel, placeholder (initial+emoji) until real image uploaded
- [x] Portrait panel wired into ChatWindow Personality Mode (desktop sidebar, hidden mobile)
- [x] Lore-Locked / Open-World terminology reframe (replaced True-to-Character / Off-Script labels across all UI)
- [x] VISUAL_NOVEL_UI_SPEC.md written and committed
- [x] `fadeIn` CSS keyframe added to index.css for portrait transitions

### Phase 3 — Character Customization ✅ COMPLETE
- [x] Portrait image upload: FileReader → base64 → 500KB localStorage-safe cap → stored on `SavedCharacter`
- [x] Thumbnail preview on saved characters list in CharacterSelect
- [x] Per-emotion portrait upload slots: happy/sad/angry/surprised (collapsible section, 150KB/slot cap)
- [x] `resolvePortraitForEmotion()` — falls back to default portrait when slot unset
- [x] Per-character theme color: color picker, hex validation, applied live to send button + AI message bubble accent
- [x] Character fork UI: fork icon on saved-character rows, fork banner, seed context textarea with char counter
- [x] `isPortraitSizeOk()` + `isEmotionPortraitSizeOk()` + `isValidHexColor()` validators exported from store

### Phase 4 — Settings & Configuration ✅ COMPLETE
- [x] SettingsModal restructured into vertical tabs (General / Standard Assistant / Character Management / Advanced)
- [x] General tab: character count display, "Clear all characters" with double-confirm
- [x] Standard Assistant tab: API key input, test connection button, validation feedback
- [x] Character Management tab: profanity tolerance dropdown (saved to localStorage)
- [x] Advanced tab: temperature slider (0.0–2.0, live readout, stored as `ai_temperature`)
- [x] Temperature wired end-to-end: Settings → localStorage → ChatWindow init → APIClient → all 3 provider request bodies

### Phase 5 — Bug Fixes & Corrections (ongoing) 🔄 IN PROGRESS
- [x] OpenAI system prompt field bug (was top-level, silently ignored — fixed to role:system message)
- [x] Character bio never sent to API in Personality Mode (fixed)
- [x] Fork seed context stored but never sent to API (fixed)
- [x] Portrait always showed default image (fixed — now calls resolvePortraitForEmotion)
- [ ] Profanity tolerance setting is decorative — not wired into buildSystemPrompt
- [ ] Fandom fetch endpoint unverified — CORS may silently fail
- [ ] No image compression on upload — large files flatly rejected instead of auto-compressed
- [ ] Generic Mode character history is stateless — switching back to a previous character loses all context
- [ ] UserProfileModal.tsx never reviewed — unknown scope

### Phase 6 — Voice & Audio System 🔄 IN PROGRESS
**Free-tier research completed 2026-09-02** (hard constraint: no payment method entry, ever — free signup + API key only):

| Option | Cost | Card required? | Cloning? | Verdict |
|---|---|---|---|---|
| Web Speech API (browser-native) | $0 forever | No signup at all | No | **Chosen starting point** — zero setup, zero limits |
| Edge TTS (open-source wrapper) | $0 | No signup | No | Backup option, community tooling not official |
| Free.ai TTS | 30k tokens/day free | No card | No | Possible later upgrade, needs email signup |
| ElevenLabs | Small free tier (~10k chars/mo) | Signup only for free plan | **Yes — real voice cloning** | The eventual cloning option once basic voice system is live; free quota is small, needs testing |
| Azure F0 | 500k chars/mo free | Azure account + billing setup (friction) | No | Deprioritized — setup friction |
| Google Cloud TTS | 4M chars/mo standard | **Requires credit card to activate** | No | Ruled out — violates hard constraint |

**Build plan (revised, free-first):**
- [x] Voice engine: Web Speech API (`SpeechSynthesis`) — data model added
- [x] Per-character voice settings stored on `SavedCharacter`: selected system voice name, pitch, rate
- [ ] Voice Studio section in character creation: pick from available system voices, live preview button
- [ ] "Voice Mode" / "Call" toggle in chat toolbar → reads AI responses aloud automatically
- [ ] Sentence-boundary chunking (buffer until `.!?`) so long responses start speaking before the full reply finishes generating
- [ ] Mic input (optional, later): `SpeechRecognition` API — also browser-native, $0
- [ ] **Deferred, needs real API key from user:** ElevenLabs integration for true voice cloning — user provides their own free-tier ElevenLabs key in Settings (same pattern as the existing AI provider keys), never a payment method
- [ ] Voice orb visualizer: CSS scale or canvas tied to `AnalyserNode` frequency data — client-side only, no cost implication

### Phase 7 — Professional Coaching Modules ⏳ PENDING (future, third pillar)
- [ ] This is a THIRD PILLAR beyond the two-mode system — do not fold into Generic/Personality
- [ ] Speech & Diction Coach: filler word tracker, pacing analysis, tone evaluator
- [ ] Scenario Practice Hub: simulated high-stakes environments (interviews, negotiations, client calls)
- [ ] Boardroom & Shark Tank Pitch Arena: dynamic investor AI archetypes, real-time sentiment HUD, gotcha question generator
- [ ] Corporate RPG / Dialogue-Tree Leadership Sims: skill trees (De-escalation, Executive Presence), consequence tracking
- [ ] Interrupt-Driven Speech Stress Test: AI cuts you off on filler words, arcade-style penalty/bonus ticks
- [ ] Custom Coach Deck & Archetype Workshop: mix behavioral traits to build custom mentor personas
- [ ] Daily 60-Second Impromptu Gauntlet: random challenge drop, streak multipliers, radar chart
- [ ] Zero-gating philosophy applies here too: full access on day one, no XP/level locks
- [ ] Supabase schema needed: `coaching_sessions`, `user_skills` tables (SQL draft exists in Gemini chat)

### Phase 8 — Avatar Creation & Customization Tool ⏳ PENDING (future, deferred until after Phase 6)
**Confirmed scope (2026-09-02 discussion with user):**
- Core idea: user uploads ANY custom image — original art, a famous actor in a specific role, any character — and it gets transformed into a 2D avatar
- Output can be either animated OR broken into multiple frames to express different emotions (ties into existing `emotionPortraits` sparse-slot system from Phase 3)
- Combines both an in-app builder (style/feature customization) AND possible AI-driven image generation/transformation from the uploaded source
- **Open concern from user:** this is a heavy-free-tier web app — need to carefully research which AI image generation/transformation tools have usable free tiers, or consider building a lightweight custom solution that works within free-tier constraints (cost is the primary blocker, not concept)
- Not yet spec'd in technical detail — needs a dedicated scoping session before implementation starts

**Prior technical notes (from earlier design discussion, still relevant):**
- [ ] Static Mode (default): 2D emotion sprites — already built in Phase 2/3
- [ ] Live Mode (toggle): animated avatar replaces sprite panel
- [ ] Technology candidates: Live2D Cubism WebGL SDK, PixiJS with .moc3 model files
- [ ] Lip-sync: TTS engines provide viseme timestamps → passed to Live2D jaw controller
- [ ] Free/open-source transformation candidates to research: SadTalker, LivePortrait, Hallo (image + audio → animated video) — verify current free-tier/self-host feasibility before committing
- [ ] Architecture option: TTS audio → hosted SadTalker/LivePortrait API → .mp4 stream played in chat
- [ ] Client-side alternative (no server cost): talkinghead.js / Canvas 2D mesh morphing — likely the safer free-tier-first starting point
- [ ] Face landmark detection: lightweight JS library for auto-cropping on upload

**Explicitly deferred until Phase 6 (Voice & Audio) is complete.**

### Phase 9 — Backend / Data Sovereignty ⏳ DEFERRED
- [ ] Move all character data from localStorage to Supabase (user-scoped, row-level security)
- [ ] Real file/object storage for portrait images (removes 500KB cap entirely)
- [ ] Copyright/IP protection: user-generated chat data never fed into model training pipelines
- [ ] All user data compartmentalized in encrypted per-user storage buckets
- [ ] User retains full copyright ownership of their created characters and sessions
- [ ] Export/import: users can back up their characters as JSON
- [ ] Requires full Supabase auth flow to be working first — do not start before that

### Phase 10 — Performance & Loading Optimization ⏳ DEFERRED
- [ ] App shell first (lightweight HTML/CSS frame, <1s render)
- [ ] Cached local data second (characters, API keys, chat logs from localStorage/IndexedDB)
- [ ] SSE text streaming third (character-by-character response streaming)
- [ ] Heavy media lazy-loaded last (portraits, audio) — never blocks text chat
- [ ] WebP/AVIF conversion for all portrait images
- [ ] Network speed detection: `navigator.connection.effectiveType` → auto-enable Speed Mode on 2G/3G
- [ ] Speed Mode: native Web Speech API (zero bytes) instead of cloud TTS, static sprites instead of animated avatar
- [ ] Service Worker / PWA: cache framework files on first visit, zero-network subsequent launches
- [ ] Target: app usable in under 2 seconds even on slow connections

### Phase 11 — Offline Architecture ⏳ EXPLICITLY DEFERRED — DO NOT START YET
- [ ] Do not begin until the web app is fully stable and feature-complete online
- [ ] WebLLM / Transformers.js via WebGPU for local LLM inference
- [ ] On-device Whisper (Tiny/Base) via WASM for speech recognition without cloud STT
- [ ] Local vector DB: IndexedDB + mxbai-embed-xsmall for semantic memory
- [ ] Client-side ONNX TTS for offline voice synthesis
- [ ] Service Worker shell for full offline lifecycle
- [ ] One-time download payload: ~1.2–2.8GB (LLM weights + Whisper + assets)
- [ ] Success rate: ~75–85% on modern consumer hardware; OOM on low-RAM mobile
- [ ] Tauri or Capacitor wrapper for native mobile (bypasses browser memory sandbox)
- [ ] Arthur's personal account: full offline autonomy with personalized session data
- [ ] Accent/slang normalization pipeline: Trie-based preprocessing before LLM input
- [ ] Emoji/symbol semantic mapping: 💀 = amused_exaggeration, etc.

---

## 5. Completed Items Log

| # | Item | File(s) | Session Notes |
|---|------|---------|---------------|
| 1 | Two-sided-coin CharacterSelect rebuild | CharacterSelect.tsx | Cyan Generic vs Amber Personality, coin-edge OR divider |
| 2 | Real API integration | apiClient.ts | Anthropic (`claude-opus-4-1`), OpenAI (`gpt-4o-mini`), Gemini |
| 3 | CORE_VISION.md + VISUAL_NOVEL_UI_SPEC.md | repo root | Alignment documents, canonical design reference |
| 4 | `characterFetch.ts` | lib/ | Fandom → AniList → MAL priority, `CharacterInfo` interface, `citationTag()` |
| 5 | Generic Mode "be X" detection | ChatWindow.tsx | Regex pattern, fetch on switch, citation on first response |
| 6 | `characterStore.ts` immutable model | lib/ | `createCharacter()` / `deleteCharacter()` / `getCharacter()` / `listCharacters()` |
| 7 | System prompt hardened | apiClient.ts | No AI breaks, no romantic escalation, knowledge lens framing |
| 8 | Lore-Locked / Open-World reframe | CharacterSelect + ChatWindow | Replaced Strict/Off-Script labels everywhere |
| 9 | `emotionDetect.ts` | lib/ | Tag parser, keyword map, `EMOTION_TAG_INSTRUCTION` export |
| 10 | `CharacterPortrait.tsx` | components/ | Emotion-reactive, initial+emoji placeholder, real image slot |
| 11 | Portrait panel wired into chat | ChatWindow.tsx | Desktop only (`hidden md:block`), Personality Mode only |
| 12 | Portrait image upload | CharacterSelect.tsx | FileReader → base64, 500KB cap, preview thumbnail |
| 13 | Per-emotion portrait slots | CharacterSelect + characterStore | happy/sad/angry/surprised, 150KB/slot, collapsible UI |
| 14 | `resolvePortraitForEmotion()` | characterStore.ts | Sparse map fallback to default portrait |
| 15 | Per-character theme color | CharacterSelect + ChatWindow | Color picker, hex validation, send button + bubble accent |
| 16 | Settings panel restructure | SettingsModal.tsx | Vertical tabs, all 4 sections functional |
| 17 | Temperature control end-to-end | apiClient + ChatWindow + Settings | Slider → localStorage → APIClient → all 3 providers |
| 18 | Fork seed context sent to API | ChatWindow.tsx | Was stored, never used — now in `extraContext` |
| 19 | **BUG FIX:** OpenAI system prompt | apiClient.ts | Was top-level `system:` field (ignored by OpenAI). All character instructions were silently dropped for OpenAI users. Fixed to `role:'system'` inside `messages[]`. |
| 20 | **BUG FIX:** Character bio not sent to API | ChatWindow.tsx | `getCharacter()` was called, `.summary/.personality/.background` never passed to API |
| 21 | HANDOVER.md created | repo root | This file — persistent session continuity document |
| 22 | **BUG FIX #1:** Profanity tolerance wired | apiClient.ts | `buildSystemPrompt()` now reads `profanity_filter` from localStorage and appends the appropriate instruction (strict/off/moderate). Was purely decorative before. |
| 23 | **BUG FIX #2:** Fandom endpoint + fetch logging | characterFetch.ts | Fixed broken Fandom URL (was HTML page, not JSON). Added visible `[characterFetch]` console warnings at every failure/fallback point in all three sources and the orchestrator. |
| 24 | **BUG FIX #3:** Portrait auto-compression | imageCompress.ts, CharacterSelect.tsx | New Canvas-based compress utility. Both upload handlers now compress before size check. Large photos silently fit instead of hard-rejecting. |
| 25 | **BUG FIX #4:** Generic Mode session cache | ChatWindow.tsx | `genericCharacterCache` useRef Map — cache hit skips fetch. Cleared on new chat. |
| 26 | **REVIEW:** UserProfileModal rewrite | UserProfileModal.tsx | Full design-system alignment (teal→amber), avatar URL→file upload with compression, X close, Enter-to-save, hover overlay. |
| 27 | **Phase 6 (1/N):** VoiceSettings data model | characterStore.ts | Added `VoiceSettings` type (voiceName/pitch/rate) + `isValidVoiceSettings()` guard on `SavedCharacter`. Foundation only, no UI yet. |

---

## 6. Known Issues & Error Handling

| # | Issue | Status | File | Fix Required |
|---|-------|--------|------|-------------|
| 1 | Profanity tolerance is decorative | **HANDLED** | apiClient.ts | Fixed. `buildSystemPrompt()` now reads `localStorage.getItem('profanity_filter')`: strict → clean language instruction appended; off → natural profanity allowed; moderate (default) → no instruction, character judgment used. |
| 2 | Fandom fetch endpoint unverified | **HANDLED** | characterFetch.ts | Fixed endpoint from HTML search page to `/api/v1/Search/List` (actual JSON API). Added `[characterFetch]` prefixed `console.warn` in every catch block and every empty-result branch. Orchestrator logs each step (✓ resolved / ✗ exhausted) so CORS failures are visible in devtools instead of silently swallowed. |
| 3 | No image compression on upload | **HANDLED** | imageCompress.ts, CharacterSelect.tsx | New `imageCompress.ts`: Canvas compress (resize to 512px, JPEG quality 0.85→0.35). Both portrait and emotion-slot handlers now compress first, only show error if still over cap at minimum quality. |
| 4 | Generic Mode character history is stateless | **HANDLED** | ChatWindow.tsx | Added `genericCharacterCache` (`useRef<Map>`) — session-scoped cache keyed by lowercased name. Cache hit skips fetch entirely. Cache miss fetches and stores (null stored on failure to prevent re-fetching). Cleared on `handleNewChat()`. |
| 5 | `UserProfileModal.tsx` never reviewed | **HANDLED** | UserProfileModal.tsx | Full rewrite: teal→amber design alignment, avatar URL field replaced with file upload + `compressPortrait()`, X close button, Enter-to-save, hover overlay on avatar, backdrop blur. |
| 6 | OpenAI system prompt field | **HANDLED** | apiClient.ts | Was `system: systemPrompt` at top level (OpenAI API ignores this). Fixed to `{ role: 'system', content: systemPrompt }` inside `messages[]`. |
| 7 | Character bio never sent to API (Personality Mode) | **HANDLED** | ChatWindow.tsx | `getCharacter()` called but `.summary/.personality/.background` never included in `extraContext`. Fixed. |
| 8 | Fork seed context stored but unused | **HANDLED** | ChatWindow.tsx | `seedContext` persisted to store but never read into API calls. Fixed — now included in `extraContext` labeled as "Carried over from a previous character by the user's own choice". |
| 9 | Portrait always showed default image | **HANDLED** | ChatWindow.tsx | Was passing `.portraitUrl` directly. Now calls `resolvePortraitForEmotion(savedChar, currentEmotion)` which checks the sparse emotion slots map first. |
| 10 | Character bio never sent (pre-fix) | **HANDLED** | ChatWindow.tsx | `activeMode.characterId` was used to look up the character but the bio fields were not included in `extraContext`. Fixed in Phase 5. |

---

## 7. Future Design Ideas (From Gemini Design Session)

These are ideas discussed and agreed upon but not yet built. Do not discard.

- **Character marketplace / sharing:** Export fully customized characters (sprites + theme + prompts + voice) as a shareable card (JSON or embedded PNG, standard in AI roleplay community). Import cards by URL or paste. Public marketplace is a stretch goal.
- **Right-hand character info drawer:** Collapsible panel in Personality Mode chat showing the character's Core Identity and Psychology tabs for quick reference mid-conversation.
- **Character creation loading states:** Staged feedback text during creation ("Constructing persona..." → "Injecting background lore..." → "Waking up [Name]...") instead of a plain spinner.
- **Quick Import in character creation:** URL input bar → auto-fills character fields from scraped data (basically what `characterFetch.ts` does, but surfaced in the creation form as a UX flow).
- **Chat bubble style customization:** Per-user or per-character options for chat bubble shape, font size, layout.
- **Character "Extra Data" field:** Freeform text box in creation form for anything that doesn't fit name/personality/background — specific instructions, targeted characteristics, fictional world rules. Currently no dedicated field for this.
- **Gamified daily challenge (non-gating):** Optional daily 60-second random prompt drop ("Defend a project delay to an angry client in 45 seconds") with radar charts tracking growth over time. Cosmetic only — never gates features.
- **Friendship/Trust/Affinity system:** Invisible stat that alters how a character responds over time — not XP gating, just adds realism to long-term sessions.
- **Secret-revealing mechanic:** Characters can have hidden information flags that only surface after enough trust is built in Off-Script/Open-World mode.
- **Spontaneous character initiative:** Characters can occasionally ask the user a question first rather than always being passive responders.
- **Non-verbal action formatting:** Physical actions rendered as italicized text (*smirks and crosses arms*) alongside dialogue — common in roleplay, gives characters more physical presence.
- **Multi-session continuity:** Long-term memory across separate chat sessions with the same character (currently each chat session starts fresh). Requires backend.

---

## 8. Key Things to Remember

- **App title in index.html** may still reference old name — verify it says StageEgo.
- **Tailwind brand colors:** `brand.DEFAULT: #14b8a6`, `brand.dark: #0d9488`, `brand.light: #2dd4bf`.
- **Mode string format (do not change):** `'generic'` or `'personality:behavior:name:characterId'` — parsed by `parseMode()` in ChatWindow.tsx. Adding a 5th segment would break parsing.
- **localStorage keys in use:** `user_api_key`, `profanity_filter`, `ai_temperature`, `stageego_characters`.
- **Events in use:** `profileUpdated` (re-init API client), `charactersUpdated` (refresh saved list).
- **No Supabase for character data yet** — everything is localStorage. Don't assume otherwise.
- **Portrait images are base64 in localStorage** — this is prototype-only. Move to Supabase Storage in Phase 9.
- **Deployment URL:** `maihuku.netlify.app` — ⚠️ flagged to deal with later, not confirmed aligned with current build.
- **Offline is explicitly off the table** until the web app is fully feature-complete and stable.

---

## 9. Priority Order for Next Session

**All known bugs cleared. Phase 6 in progress — free-tier TTS research done, data model started.**

1. **Phase 6 — Voice & Audio System** (see Section 6 above for full spec + research table)
   - [x] VoiceSettings data model added to characterStore.ts
   - [ ] Web Speech API playback engine (speak AI responses aloud)
   - [ ] Voice Studio UI in character creation (voice picker + live preview)
   - [ ] Voice Mode toggle in chat toolbar
   - [ ] Sentence-boundary chunking for streaming playback
   - [ ] Mic input (SpeechRecognition) — lower priority, after playback works
   - [ ] Avatar tool (Phase 8) remains explicitly deferred until Phase 6 is complete

