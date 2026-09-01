# StageEgo — Project Handover Document

> **Purpose:** This file exists to survive context-window compression. Every new session should start by reading this file. It reflects the true current state of the project — not assumptions from training data.

---

## 1. Project Overview

**StageEgo** is a web-based AI character chatbot with a two-sided-coin architecture. It is NOT a generic AI assistant and NOT a performance coaching tool (earlier misalignment — corrected).

**Tech stack:** React 18 + TypeScript + Tailwind CSS + Vite + Lucide React  
**Deployment:** Netlify (`maihuku.netlify.app`)  
**Backend:** Supabase (auth — partially wired; character/chat data currently localStorage-only)  
**Repo:** `https://github.com/HuntrClaww/agent-claww`  
**Git identity for commits:** `user.name = Claude UI Upgrade`, `user.email = arthur@dev.local`

### The Two-Sided Coin

**SIDE A — Generic Mode (cyan)**
- No character lock. User says "be Sherlock" → AI searches Fandom/AniList/MAL on-demand and embodies that character. User can switch at any time.
- Each character learned live via `characterFetch.ts`.

**SIDE B — Personality Mode (amber)**
- One character locked per session. Two knowledge-access sub-options:
  - **Lore-Locked:** Confined strictly to their source world. No modern world knowledge.
  - **Open-World:** Full general knowledge, filtered entirely through their personality.
- Characters are created as **immutable one-time snapshots** — no editing after creation. Only deletion is allowed.
- To "evolve" a character: fork it into a new character and paste curated snippets as seed context (capped at 2000 chars).

### Core Rules (Baked Into System Prompt)
- Characters NEVER break character to say "I am an AI" — zero tolerance.
- Characters never escalate to romantic/intimate territory unless explicitly defined that way at creation.
- Characters process real-world knowledge through their personality lens, not as neutral encyclopedia.

---

## 2. File Structure

```
src/
├── components/
│   ├── Auth.tsx
│   ├── CharacterPortrait.tsx     ← VN-style emotion-reactive portrait panel
│   ├── CharacterSelect.tsx       ← Two-sided-coin picker, creation flow
│   ├── ChatWindow.tsx            ← Main chat, mode logic, portrait wiring
│   ├── SettingsModal.tsx         ← Vertical-tab settings (General/Assistant/Characters/Advanced)
│   ├── Sidebar.tsx
│   └── UserProfileModal.tsx      ← NOT YET REVIEWED
├── lib/
│   ├── apiClient.ts              ← Anthropic/OpenAI/Gemini, temperature support
│   ├── apiValidator.ts
│   ├── characterFetch.ts         ← Fandom → AniList → MAL priority chain
│   ├── characterStore.ts         ← Immutable create/delete/fork, portrait/theme storage
│   ├── emotionDetect.ts          ← [emotion:x] tag parsing + keyword fallback
│   └── supabase.ts
├── App.tsx
└── index.css                     ← fadeIn keyframe added
```

---

## 3. Tasks / Phases

### Phase 1 — Core Architecture ✅
- Two-sided-coin UI (CharacterSelect, CharacterSelect rebuild)
- Real API integration (Anthropic, OpenAI, Gemini with key detection)
- Generic Mode "be X" detection wired to character fetch tool
- Immutable character creation model (characterStore)

### Phase 2 — VN-Style Visuals ✅
- Emotion detection utility (tag-based + keyword fallback)
- CharacterPortrait component (emotion-reactive, placeholder + real image)
- Portrait wired into Personality Mode chat (desktop panel)
- Per-emotion portrait upload (happy/sad/angry/surprised slots, collapsible)

### Phase 3 — Character Customization ✅
- Real portrait image upload (500KB localStorage cap, size validation)
- Per-character theme color (color picker, hex validation, live on send button + message bubble)
- Character fork UI (fork banner, seed context textarea, lineage metadata)

### Phase 4 — Settings & Configuration ✅
- Settings panel restructured into vertical tabs
  - General: data/privacy, clear all characters
  - Standard Assistant: API key + test connection
  - Character Management: profanity tolerance
  - Advanced: temperature slider (0.0–2.0)
- Temperature wired end-to-end: Settings → localStorage → ChatWindow → APIClient → all 3 providers

### Phase 5 — Professional Coaching Modules ⏳ PENDING
- Speech coach (filler word tracking, pacing, tone analysis)
- Negotiation simulator (branching dialogue trees, post-session debrief)
- Pitch arena (boardroom personas, real-time sentiment meter)
- Daily 60-second gauntlet (streak system, radar chart)
- Design source: Gemini design chat (full transcript saved to project)

### Phase 6 — Backend / Data Sovereignty ⏳ DEFERRED
- Move characters from localStorage to Supabase (user-scoped, encrypted)
- Copyright protection: user data never fed into model training pipelines
- Real file storage for portrait images (removes 500KB localStorage cap)
- Requires real auth flow to be completed first

### Phase 7 — Offline Architecture ⏳ EXPLICITLY DEFERRED
- Do not start until web app is fully stable and feature-complete
- WebLLM/WebGPU local inference, on-device Whisper, local vector DB
- Tauri/Capacitor wrapper for native mobile (bypasses browser memory limits)

---

## 4. Completed Items Log

| # | Item | File(s) | Notes |
|---|------|---------|-------|
| 1 | Two-sided-coin CharacterSelect rebuild | CharacterSelect.tsx | Cyan (Generic) vs Amber (Personality) |
| 2 | Real API integration | apiClient.ts | Anthropic, OpenAI, Gemini |
| 3 | CORE_VISION.md + VISUAL_NOVEL_UI_SPEC.md | docs | Alignment documents |
| 4 | characterFetch.ts | lib/ | Fandom → AniList → MAL chain |
| 5 | Generic Mode "be X" detection | ChatWindow.tsx | Fetch on-demand, citation display |
| 6 | characterStore.ts immutable model | lib/ | create/delete/fork only |
| 7 | System prompt hardened | apiClient.ts | Never breaks character, platonic boundary guardrail |
| 8 | Lore-Locked / Open-World reframe | CharacterSelect + ChatWindow | Replaces True-to-Character / Off-Script labels |
| 9 | emotionDetect.ts | lib/ | [emotion:x] tag parsing + keyword fallback |
| 10 | CharacterPortrait component | components/ | Emotion-reactive, placeholder + real image |
| 11 | Portrait wired into chat | ChatWindow.tsx | Personality Mode, desktop panel |
| 12 | Portrait image upload | CharacterSelect.tsx | 500KB cap, FileReader, size validation |
| 13 | Per-emotion portrait slots | CharacterSelect + characterStore | happy/sad/angry/surprised, 150KB/slot |
| 14 | resolvePortraitForEmotion() | characterStore.ts | Falls back to default when slot unset |
| 15 | Per-character theme color | CharacterSelect + ChatWindow | Color picker, hex validation, live CSS |
| 16 | Settings panel restructure | SettingsModal.tsx | Vertical tabs, all controls functional |
| 17 | Temperature control | apiClient + ChatWindow + Settings | End-to-end, all 3 providers |
| 18 | Fork seed context actually sent to API | ChatWindow.tsx | Was stored but never used — fixed |
| 19 | **BUG FIX:** OpenAI system prompt | apiClient.ts | Was top-level field (ignored); moved to system role message — character immersion was silently broken for all OpenAI users |
| 20 | **BUG FIX:** Character bio in Personality Mode | ChatWindow.tsx | Stored bio was never sent to API — fixed |

---

## 5. Known Issues / Error Handling

| # | Issue | Status | File | Notes |
|---|-------|--------|------|-------|
| 1 | Profanity tolerance is decorative | **PENDING** | apiClient.ts | Saved to localStorage but never read into `buildSystemPrompt`. Needs a 1-line read + prompt injection. |
| 2 | Fandom fetch endpoint unverified | **PENDING** | characterFetch.ts | Written against community.fandom.com search, but CORS may silently fail in browser. Top-priority source may always fail without anyone knowing. Needs test + graceful fallback logging. |
| 3 | No image compression on upload | **PENDING** | CharacterSelect.tsx | Large phone photos (3-8MB) flatly rejected by 500KB cap instead of being auto-compressed. Should use `canvas.toBlob()` to compress client-side before the cap check. |
| 4 | Generic Mode has no character switch history | **PENDING** | ChatWindow.tsx | Each "be X" is stateless. If user switches back to a previous character, context is gone. Needs a `genericCharacterHistory` state or similar. |
| 5 | UserProfileModal.tsx never reviewed | **PENDING** | UserProfileModal.tsx | Exists since session 1. Scope unknown — may need alignment with the rest of the redesign. |
| 6 | OpenAI system prompt field | **HANDLED** | apiClient.ts | Was `system: systemPrompt` at top level (OpenAI ignores this). Fixed to `{ role: 'system', content: systemPrompt }` inside `messages[]`. |
| 7 | Character bio never sent to API (Personality Mode) | **HANDLED** | ChatWindow.tsx | `getCharacter()` was called but `.summary/.personality/.background` never included in `extraContext`. Fixed. |
| 8 | Fork seed context stored but unused | **HANDLED** | ChatWindow.tsx | `seedContext` was persisted to `characterStore` but never read into API calls. Fixed — now included in `extraContext` for Personality Mode. |
| 9 | Character portrait always showed default image | **HANDLED** | ChatWindow.tsx | Was using `.portraitUrl` directly; now uses `resolvePortraitForEmotion()` which picks the emotion-specific slot first. |

---

## 6. Session Notes

- **Remote dev setup:** Claude commits directly to GitHub via PAT. Repo cloned to `/home/claude/agent-claww/` in the container.
- **PAT:** Stored in project memory — ask Claude to read `/areas/stageego.md` or check the transcript journal if missing.
- **Gemini design chat:** Full transcript was saved (MHTML upload). Key extracts: dual-mode UI architecture, VN emotion sprites, per-character theme engine, voice orb/TTS streaming, coaching module designs, offline deferred.
- **Priority order for next session:** Fix remaining PENDING items (#1 profanity, #2 Fandom CORS, #3 image compression), then #4 generic mode history, then #5 UserProfileModal review.
