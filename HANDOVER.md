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
- [x] Profanity tolerance setting is decorative — **re-checked 2026-09-10, already correctly wired** (`apiClient.ts`'s `buildSystemPrompt()` reads `profanity_filter` from localStorage and appends a language instruction for 'strict'/'off'). Checkbox was just stale — no code change needed.
- [ ] Fandom fetch endpoint unverified — CORS may silently fail. **Still genuinely open** — needs a live network test this sandbox can't do; not something to fix blind.
- [x] No image compression on upload — **re-checked 2026-09-10, already correctly wired** (`CharacterSelect.tsx` calls `compressPortrait()` for both the default portrait and per-emotion slots). Checkbox was just stale — no code change needed.
- [x] Generic Mode character history is stateless — **resolved as a side effect of the 2026-09-08 conversation-memory fix** (Phase 10 additions): Generic Mode's full message thread is now sent as `history` to the API regardless of which character was being embodied at the time, so switching back to a previously-embodied character does retain that context now.
- [x] UserProfileModal.tsx never reviewed — **reviewed 2026-09-10** as part of a cross-phase audit. Found and fixed one real bug: `handleSave()` called `localStorage.setItem` unguarded (quota errors on a full localStorage — e.g. several character portraits already stored — would throw uncaught with no user feedback). Now caught and surfaced via the existing `avatarError` banner.

**Additional bugs found during the 2026-09-10 cross-phase audit** (Phases 1-6, 6.5, 8, 8.5, 10 reviewed for problems, at user's request):
- [x] `characterStore.ts`'s `writeAll()` had the same unguarded `localStorage.setItem` quota-error gap as the UserProfileModal one above — same fix pattern applied (catches and re-throws a clear message, matching this module's existing throw-Error convention for validation errors).
- [x] All 6 `!response.ok` branches in `apiClient.ts` (3 streaming + 3 non-streaming provider methods) called `response.json()` directly on error bodies — a non-JSON error body (proxy/gateway timeout page, CORS failure, empty body) would throw an unhandled parse error instead of showing a clean message. Fixed with a shared `parseErrorMessage()` helper that reads the body as text first and never throws.
- Reviewed for the same class of issue and found clean: all `addEventListener` calls have matching `removeEventListener` cleanup (no listener leaks); the abort-controller/streaming lifecycle in `ChatWindow.tsx` is correctly scoped (new sends are blocked via `isStreaming` while a stream is in flight, so no overlapping-stream race is possible); `voiceEngine.ts`'s only other `JSON.parse` call (voice package import) was already properly guarded.
- [x] **Polish addition (2026-09-10, not a bug fix): Stop button for in-flight responses.** Previously the only way to interrupt a response was New Chat, which also wipes the conversation. New `handleStopGenerating()` aborts via the existing `abortControllerRef` without resetting `activeMode`/`messages`; Send button swaps to a red Stop button while `isStreaming`. Whatever text had already streamed in is kept on screen (appended with "*(stopped)*") rather than overwritten by the generic cancellation message.

### Phase 6 — Voice & Audio System 🔄 IN PROGRESS
**Free-tier research completed 2026-09-02** (hard constraint: no payment method entry, ever — free signup + API key only):

| Option | Cost | Card required? | Cloning? | Verdict |
|---|---|---|---|---|
| Web Speech API (browser-native) | $0 forever | No signup at all | No | **Chosen starting point** — zero setup, zero limits |
| Edge TTS (open-source wrapper) | $0 | No signup | No | Backup option, community tooling not official |
| Free.ai TTS | 30k tokens/day free | No card | No | Possible later upgrade, needs email signup |
| ElevenLabs | Small free tier (~10k chars/mo) | Signup only for free plan | **No on free tier** — cloning requires paid Starter ($5/mo); free tier only offers Voice Design (synthetic voice from text description) | **Decision: skip real cloning for now** — conflicts with no-payment-method rule. Documented as a future paid option only if user chooses to pay later. |

**Decision (2026-09-02):** No free, reputable voice-cloning option exists. Proceeding with Web Speech API (primary, $0, unlimited) + Free.ai TTS as a secondary voice-picker option (30k tokens/day, resets daily). Pitch/rate tuning is the practical substitute for "sounds like them" without true cloning.

**Built 2026-09-02 (`voiceAnalysis.ts`):** analysis-assist tool for pitch/rate. Uploads an audio sample, runs autocorrelation-based pitch detection (median across overlapping windows) and amplitude-envelope-based syllable rate estimation, maps both onto the existing 0-2 pitch / 0.5-2 rate sliders as a suggested starting point. Explicitly documented as NOT cloning — confidence is always 'low' or 'medium', never 'high'. Wired into Voice Studio UI in CharacterSelect.tsx.

**Confirmed 3-part roadmap (user direction, 2026-09-02), in order:**
1. ✅ Pitch/rate analysis-assist tool — DONE (above)
2. ✅ Prosody/pacing improvements — DONE. `EMOTION_PROSODY` table in voiceEngine.ts nudges pitch/rate/volume per detected emotion (angry=faster+clipped, sad/thinking=slower+longer pauses+quieter, happy=brighter+quicker, etc.) on top of the character's base voice. `buildProsodyPlan()` splits text into clause-level chunks at punctuation with pause durations sized to punctuation type and scaled by emotion. `speakExpressive()` is now what ChatWindow calls instead of plain `speakQueue`. Honestly documented as punctuation/emotion-driven heuristics, not neural prosody modeling like server-side voice-mode products.
3. ✅ Voice package portability — DONE. Two-pronged fix, both honestly scoped after research confirmed the Web Speech API has no universal cross-platform voice ID and browsers cannot install new voices on a device (only read whatever the OS already has):
   - **Graceful fallback matching** (`pickBestVoice()` in voiceEngine.ts): exact voiceName → same `lang` → same language family → browser default, each tier logged. `VoiceSettings` gained an optional `lang` field, captured automatically when a voice is picked in Voice Studio.
   - **Export/import as portable settings** (`exportVoicePackage`/`downloadVoicePackage`/`parseVoicePackage`): a character's voice settings can be downloaded as a `.json` file and re-imported — reuses a tuned voice across characters (fits the app's immutable-character/fork model) or across devices. Explicitly documented in code and UI copy that this carries *settings*, not an installable voice.

**All 3 parts of the user-directed extension plan are now complete.**
| Azure F0 | 500k chars/mo free | Azure account + billing setup (friction) | No | Deprioritized — setup friction |
| Google Cloud TTS | 4M chars/mo standard | **Requires credit card to activate** | No | Ruled out — violates hard constraint |

**Build plan (revised, free-first):**
- [x] Voice engine: Web Speech API (`SpeechSynthesis`) — playback engine built (voiceEngine.ts)
- [x] Per-character voice settings stored on `SavedCharacter`: selected system voice name, pitch, rate
- [x] Voice Studio section in character creation: pick from available system voices, live preview button
- [x] "Voice Mode" / "Call" toggle in chat toolbar → reads AI responses aloud automatically
- [x] Sentence-boundary chunking wired into ChatWindow send flow — AI responses spoken via `speakQueue(splitIntoSentences(...))`
- [x] Mic input (`SpeechRecognition`) — wired into chat input, browser-native, $0
- [ ] **Deferred, needs real API key from user:** ElevenLabs integration for true voice cloning — user provides their own free-tier ElevenLabs key in Settings (same pattern as the existing AI provider keys), never a payment method
- [ ] Voice orb visualizer: CSS scale or canvas tied to `AnalyserNode` frequency data — client-side only, no cost implication

### Phase 6.5 — Speech Recognition Robustness ✅ COMPLETE 2026-09-03 (added same day, user-directed)
Two-part scope, both requested together, built one focused piece at a time:

1. **Mixed-language / code-switched word flagging** ✅ COMPLETE 2026-09-03 — browser `SpeechRecognition` takes a single `lang` and cannot natively transcribe code-switched speech (e.g. English sentence with a Spanish name or phrase dropped in). Honest scope boundary: this is NOT true multi-language transcription (Chrome's API doesn't expose that). What's buildable: post-hoc scan of the final transcript for low-frequency/unmatched tokens against a common-word list for the active language, flag them inline (not silently auto-corrected), user confirms/edits. Applies to both voice-transcribed and typed text.
   - [x] Common-word frequency list/dictionary for flagging — DONE 2026-09-03. `wordFlagging.ts`: bundled common-English-word set + `flagUnusualTokens()`. English-only for now; extensible to other languages later (Unicode-aware tokenizer already in place).
   - [x] Token-flagging pass on final transcript + typed input — DONE 2026-09-03. Applied to all `role==='user'` messages regardless of whether they arrived via mic or typing (both go through the same `handleSend` path into `messages`, so one flagging pass covers both).
   - [x] Inline flag UI — DONE 2026-09-03. Dotted amber underline on flagged words in ChatWindow, via `renderContent()`'s `highlightFlagged`. Never auto-substitutes — purely visual, user notices and can look into it themselves.
   - [x] Optional: on-demand micro-lookup — DONE 2026-09-03. Clicking a flagged word calls the existing `fetchCharacterInfo()` pipeline (characterFetch.ts) rather than a new dictionary API; result cached per-word in session state, shown as a small note under the message. "No match" is treated as a normal outcome.

2. **Mic input robustness** ✅ COMPLETE 2026-09-03 — currently Phase 6 only touches `SpeechRecognition`, never raw `getUserMedia`/Web Audio, so there's no noise handling, quality feedback, or device awareness at all.
   - [x] Engine layer built (voiceEngine.ts, 2026-09-03): `checkMicSignalQuality()` (short getUserMedia sample with `echoCancellation`/`noiseSuppression`/`autoGainControl` enabled, reports silent/quiet/ok + muffled flag), `listAudioInputDevices()` + `watchAudioInputDevices()` (device enumeration + devicechange watcher), `isLikelyExternalAudioDevice()` (Bluetooth/headset label heuristic). NOT yet wired into any UI — next step.
   - [x] Wired into ChatWindow mic toggle (2026-09-03): quality check runs in parallel with listening (never blocks it), surfaces an amber advisory line on quiet/silent/muffled results.
   - [x] Device watcher wired into UI (2026-09-03): "Using <device label>" hint shown while listening if a likely Bluetooth/external mic is detected.
   - [ ] Honest limit: cannot reliably diagnose "damaged hardware" specifically from client-side signal analysis. Symptom-based fallback only — persistent near-silent/garbled input across attempts triggers a generic "having trouble hearing you" prompt, never a hardware diagnosis claim.

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

### Phase 8 — Avatar Creation & Customization Tool ⏳ IN PROGRESS (started 2026-09-03, Phase 6/6.5 now both complete)
**Confirmed scope (2026-09-02 discussion with user):**
- Core idea: user uploads ANY custom image — original art, a famous actor in a specific role, any character — and it gets transformed into a 2D avatar
- Output can be either animated OR broken into multiple frames to express different emotions (ties into existing `emotionPortraits` sparse-slot system from Phase 3)
- Combines both an in-app builder (style/feature customization) AND possible AI-driven image generation/transformation from the uploaded source
- **Open concern from user:** this is a heavy-free-tier web app — need to carefully research which AI image generation/transformation tools have usable free tiers, or consider building a lightweight custom solution that works within free-tier constraints (cost is the primary blocker, not concept)
- Not yet spec'd in technical detail — needs a dedicated scoping session before implementation starts

**Free-tier AI image tooling research (2026-09-03) — findings:**
- **Google Gemini 2.5 Flash Image ("Nano Banana")** is the standout candidate: ~500 requests/day free via an AI Studio API key, no credit card required. **Strong architectural fit** — StageEgo already has a Gemini provider integrated for chat (`apiClient.ts sendToGemini()`, BYOK model via `user_api_key` localStorage key), so avatar generation could plausibly reuse the same API key field instead of requiring separate key management UI. Primary candidate.
- **Cloudflare Workers AI** — genuine recurring free tier (not expiring credits). Elevated to the confirmed #2 fallback (see chain below), not just "a viable option" — specifically useful as an overflow route once Gemini's daily cap is hit, since it's a separate free-tier bucket entirely.
- **Hugging Face Inference (free tier + Spaces)** — genuine free tier but unpredictable wait times/caps on public Spaces. Better fit later as a style-variety option (many open models) than a reliability-critical fallback link.
- **FLUX.1 [schnell]** (self-hosted, open-source) — not a free API, but the long-term "exit ramp" if free tiers ever get squeezed across the board, since it's open-weight and self-hostable rather than another vendor quota that could vanish. Logged for later, not part of the near-term chain.
- **Client-side ML (TensorFlow.js / ONNX Runtime Web)** — a real option worth a future research spike specifically because it sidesteps the "free tier could change/vanish" risk entirely (zero server dependency at all). Conflicts with the project's current "offline explicitly off the table until feature-complete" stance (Section 8), so this is a Phase 9+ idea, logged here so it isn't lost, not something to chase now.
- **Caution flagged by research:** most "free tier" image APIs found (Leonardo, Replicate, Stability, Freepik/Magnific, ImaginePro, Apiframe) are signup *credit grants* that expire once spent, not recurring free tiers — excluded from the chain below entirely, they're trial credits, not a stable free tier.

**Confirmed direction (2026-09-08, user-directed): 2-tier chain, Cloudflare dropped.**
StageEgo already proves this exact pattern in `characterFetch.ts` (try source A → B, normalize results into one shape) — reusing that architecture for avatar generation is lower-risk than introducing a new pattern. Chain, richest/most-capable first:
1. **Gemini 2.5 Flash Image** — primary. Best fit, reuses existing BYOK key infra.
2. **Canvas-filter fallback (`avatarFilters.ts`, already built)** — always-available. Fires if Gemini fails, is rate-limited, or the user has no API key configured at all. Zero-cost, zero-dependency, already shipped.
- [x] Design the normalized result shape — `AvatarGenerationResult { dataUrl, source: 'gemini' | 'canvas-filter' }` in `avatarGenerate.ts`
- [x] Design the try-chain function itself — `generateAvatar()` in `avatarGenerate.ts`, mirrors the source-priority pattern already in characterFetch.ts

- [x] **Zero-cost emotion-variant fallback tier** — DONE 2026-09-03. `avatarFilters.ts`: `generateEmotionVariant()`/`generateAllEmotionVariants()` produce tinted per-emotion variants of one base portrait via canvas `ctx.filter` (brightness/saturate/hue-rotate/contrast), no external API, no cost. Wired into CharacterSelect.tsx's existing per-emotion art upload UI as a "✨ Fill gaps from base photo" button — fills only empty emotion slots, never overwrites a manually-uploaded one. Honest limit stated in both code comments and the button's UI tooltip: this tints/tones only, it cannot redraw facial expression/pose. Not a replacement for true AI-generated multi-frame art — a same-day-usable baseline tier underneath it. Now also serves as the confirmed tier 2 fallback of the chain above.
- [x] Prototype Gemini 2.5 Flash Image avatar generation against the existing BYOK key infra (chain tier 1) — WRITTEN 2026-09-03, `avatarGenerate.ts`: `generateAvatarViaGemini()`. **Not yet live-tested** — sandbox has no network path to generativelanguage.googleapis.com and no real key to test with. Written strictly per Google's documented REST format; needs a real-key smoke test before being trusted or wired into any UI. Same "written but not device/network verified" status Phase 6's iOS fix carried before real-device testing happened.
- [x] **Cloudflare credential decision — RESOLVED 2026-09-08: dropped, not deferred-with-UI-field.** User chose option (c): skip Cloudflare from the near-term chain entirely rather than add Settings UI complexity for a two-credential provider. `generateAvatarViaCloudflare()` and its helpers were removed from `avatarGenerate.ts` (recoverable from git history at commit `affe659` if revisited later — e.g. if Gemini's rate limits prove too tight in practice).
- [x] Build the fallback-chain orchestration function — DONE 2026-09-08, `avatarGenerate.ts`: `generateAvatar(baseImageDataUrl, prompt, apiKey, emotion?)`. Tries Gemini first; on failure/no-key, falls back to canvas-filter tinting if an `emotion` was passed (returns `null` if neither tier can produce a result, e.g. no emotion given and Gemini failed). **Not yet wired into any UI component** — CharacterSelect.tsx still only has the direct "Fill gaps from base photo" canvas-filter button from the zero-cost tier above; this orchestrator exists as a library function ready to be called but has no caller yet.
- [x] Wire `generateAvatar()` into CharacterSelect's avatar builder UI — DONE 2026-09-08. The "Fill gaps from base photo" button now: tries AI-redrawn expressions per empty emotion slot via `generateAvatar()` when a user API key is configured (Gemini, with internal canvas-filter fallback per-slot on failure); skips straight to the existing bulk canvas-filter path if no key is configured, avoiding N doomed network calls. Never overwrites a manually-uploaded slot. **Important caveat unchanged:** the Gemini tier itself is still unverified against a live key/network in this sandbox — this wiring is correct per the documented contract, but the AI path hasn't been smoke-tested end-to-end. First real-world use with a real key is the actual test.
- [ ] In-app style/feature customization builder — not yet spec'd
- [ ] Live/animated mode — technology candidates (Live2D, PixiJS, talkinghead.js) still just candidates, no decision made
- [ ] Full technical scoping session still needed before the AI-generation path or live/animated mode are built — the canvas-filter tier above is intentionally the only piece built without that session, since it's low-risk/reversible

**Prior technical notes (from earlier design discussion, still relevant):**
- [ ] Static Mode (default): 2D emotion sprites — already built in Phase 2/3
- [ ] Live Mode (toggle): animated avatar replaces sprite panel
- [ ] Technology candidates: Live2D Cubism WebGL SDK, PixiJS with .moc3 model files
- [ ] Lip-sync: TTS engines provide viseme timestamps → passed to Live2D jaw controller
- [ ] Free/open-source transformation candidates to research: SadTalker, LivePortrait, Hallo (image + audio → animated video) — verify current free-tier/self-host feasibility before committing
- [ ] Architecture option: TTS audio → hosted SadTalker/LivePortrait API → .mp4 stream played in chat
- [ ] Client-side alternative (no server cost): talkinghead.js / Canvas 2D mesh morphing — likely the safer free-tier-first starting point
- [ ] Face landmark detection: lightweight JS library for auto-cropping on upload

**No longer fully deferred — the zero-cost fallback tier above is being built now since it needs no scoping decision. AI-generation path and live mode remain deferred pending a dedicated scoping session.**

### Phase 8.5 — Guided Assistant / Onboarding Helper ✅ COMPLETE 2026-09-03 (started same day, user-directed)
**Goal (user's own framing):** help new/first-time users understand how to navigate a given setting or feature, beyond what the per-field help popups already cover in isolation.

**What got built, in order:**
1. `helpContent.ts` — shared data source (6 topics total: 4 migrated from the original bespoke popups + 2 new whole-app-orientation topics), plus `findHelpTopic()`/`searchHelpTopics()`.
2. `HelpPopup.tsx` — generic component rendering any topic by id. All 4 original bespoke popups (SettingsModal's API key, CharacterSelect's Voice Studio/Emotion-art/Fork) swapped to use it. ~180 lines of duplicated JSX removed; bundle size dropped accordingly, confirming genuine deduplication not just relocation.
3. `HelpHub.tsx` — searchable modal listing every topic, opens individual topics via the same `HelpPopup`. One rendering, two entry points (per-field "?" or the Hub).
4. Entry point: "?" icon in `Sidebar.tsx`'s top bar, next to the Settings gear — reachable from anywhere in the app once a session is active.
5. Two new topics added specifically for the Hub (not tied to any single field): "Getting started — Generic vs Personality Mode" (the core two-sided-coin concept) and "Finding your way around" (a map of where things live).
6. First-time-user detection — `CharacterSelect.tsx`: detects no saved characters + no `stageego_visited` localStorage flag, shows a small dismissible teal banner pointing to the Help icon, sets the flag as soon as the decision to show is made (so it's a true one-time nudge even if the user never touches it). Deliberately just a banner, not a modal or forced tour, per the "unobtrusive and skippable" requirement.

**Result:** adding topic #7 onward going forward is just one array entry in `helpContent.ts` — no new component code needed for either the per-field popups or the Hub.

- [x] Topic data shape + migrate 4 existing popups
- [x] Help Hub UI (search + topic list, detail view via shared HelpPopup)
- [x] Entry point decided + built (Sidebar "?" icon)
- [x] First-time-user detection (dismissible banner, one-time via localStorage flag)
- [x] Additional topics: Generic vs Personality mode, general navigation


### Phase 9 — Backend / Data Sovereignty ⏳ DEFERRED
- [ ] Move all character data from localStorage to Supabase (user-scoped, row-level security)
- [ ] Real file/object storage for portrait images (removes 500KB cap entirely)
- [ ] Copyright/IP protection: user-generated chat data never fed into model training pipelines
- [ ] All user data compartmentalized in encrypted per-user storage buckets
- [ ] User retains full copyright ownership of their created characters and sessions
- [ ] Export/import: users can back up their characters as JSON
- [ ] Requires full Supabase auth flow to be working first — do not start before that

### Phase 10 — Performance & Loading Optimization ⏳ DEFERRED
- [x] App shell first (lightweight HTML/CSS frame, <1s render) — DONE 2026-09-08. `index.html`: inline critical CSS + static shell (spinner + "StageEgo" title) matching the dark theme, painted before any JS loads/executes. `App.tsx`: adds `app-ready` class to `<body>` on mount so the shell fades out via CSS transition instead of hard-cutting to the real UI, then removes the shell node from the DOM afterward.
- [x] Cached local data second (characters, API keys, chat logs from localStorage/IndexedDB) — DONE 2026-09-08. **Discovery during this task:** characters and the API key were already read synchronously from `localStorage`, so those two were effectively already instant — no work needed there. **Chat logs, however, had zero persistence** (lived only in React state, lost on every refresh) — that was the real gap. Added `src/lib/chatLogStore.ts`: per-thread localStorage persistence (`'generic'` for Generic Mode's one shared thread, `'personality:<characterId>'` per Personality Mode character), same size-cap conventions as `characterStore.ts` (300 msgs / ~800KB per thread, oldest trimmed first, never throws). `ChatWindow.tsx` now loads an existing thread on character/mode reselection instead of always seeding a fresh greeting, and auto-saves on message changes. **Scoping note:** "New Chat" still only resets session state and returns to character-select — it does NOT clear persisted history; a separate explicit "clear this conversation" button would be a distinct feature (`clearThread()` already exists, just not wired to any UI yet).
- [x] SSE text streaming third (character-by-character response streaming) — DONE 2026-09-08. `apiClient.ts`: new `sendMessageStream()` + shared `parseSSELines()` SSE parser, plus per-provider `streamFrom{Anthropic,OpenAI,Gemini}()` methods (each speaks that provider's own SSE chunk shape). Original non-streaming `sendMessage()`/`sendTo*` methods left untouched. `ChatWindow.tsx` now streams tokens into a placeholder AI message, adding it only on the first token so the bouncing-dots indicator hands off cleanly to the growing text bubble. New `isStreaming` state gates send/Enter/mic for the whole request; `isTyping` narrowed to just the pre-first-token dots window. Chat-log save-effect debounced (400ms) since messages now update per-token during a stream. **Not yet live-tested against a real key/network** — same sandbox limitation as the Gemini avatar tier; written strictly per each provider's documented streaming format (Anthropic's `content_block_delta` events, OpenAI's `delta.content` chunks terminated by `[DONE]`, Gemini's `streamGenerateContent?alt=sse`). First real-world use is the actual test.
- [x] **Addition to the original list (user-requested 2026-09-08): client-side session token budget + clearer rate-limit errors.** Not one of the original 9 Phase 10 items — added in response to a direct concern about long sessions burning through API credits/hitting rate limits. New `src/lib/sessionBudget.ts`: `estimateTokens()` (~4 chars/token heuristic) + `classifyBudget()` (warning at 40k, hard stop at 60k estimated tokens per session). **Explicitly documented as a heuristic client-side safety net, NOT real provider credit accounting** — chat completion APIs don't expose account balance to the client, so this can't know a real remaining-credits number; it can only stop the app from silently sending request after request once a conversation has clearly gotten long. `apiClient.ts`: HTTP 429 responses across all three streaming methods now return a clear "rate limited, wait a moment" message instead of each provider's raw error JSON. `ChatWindow.tsx`: tracks `sessionTokenEstimate` per turn, resets on New Chat; blocks sending past the hard-stop threshold with a clear message, shows a one-time heads-up on first crossing the warning threshold.
- [x] **Second half of the same user-requested addition (2026-09-08): fixed conversation memory.** Discovery made while investigating the budget request: every API request was sending ONLY the system prompt + the latest single message — the AI had zero memory of earlier turns within a session despite the UI showing full scrollback. `apiClient.ts`: new `ChatTurn` type; `sendMessageStream()` and all three `streamFrom{Anthropic,OpenAI,Gemini}()` methods now accept and include a `history` param (Anthropic/OpenAI as `messages[]` entries, Gemini mapped to its `model`/`user` role naming). `ChatWindow.tsx`: builds history from existing `messages` state, capped at `MAX_HISTORY_MESSAGES = 20` (~10 exchanges) specifically to keep this from working against the budget item above — history is now real, resent-every-turn cost, and the budget's per-turn accounting was updated to include it. Shipped as a deliberate pair with the item above for that reason. **Not yet live-tested against a real key** — same sandbox limitation as every other Phase 8/10 item touching a live provider.
- [ ] Heavy media lazy-loaded last (portraits, audio) — never blocks text chat
- [x] **API call logging system (2026-09-11):** `apiLogger.ts` — local-only IndexedDB log of every provider call (latency, success/error/cancelled, provider, model, estimated prompt/response tokens), 7-day auto-prune, fire-and-forget so it can never block/break the chat flow. Wired into both `sendMessage()` and `sendMessageStream()` in `apiClient.ts` via a shared `logCall()` helper — covers all 6 provider methods without duplication. Viewer UI shipped same session: new "Performance Log" tab in `SettingsModal.tsx` (summary stats, per-provider breakdown, last 50 calls, export-as-JSON, clear). Built ahead of live Gemini testing (see Section 6 open item below) so it's ready to capture that test once network access allows it.
- [ ] WebP/AVIF conversion for all portrait images
- [ ] Network speed detection: `navigator.connection.effectiveType` → auto-enable Speed Mode on 2G/3G
- [ ] Speed Mode: native Web Speech API (zero bytes) instead of cloud TTS, static sprites instead of animated avatar
- [ ] Service Worker / PWA: cache framework files on first visit, zero-network subsequent launches
- [ ] Target: app usable in under 2 seconds even on slow connections

### Phase 11 — Offline Architecture ❌ CUT FROM STAGEEGO SCOPE (2026-09-08)
**This phase is no longer part of StageEgo's roadmap.** The offline/native-mobile direction this phase was scoping is already being built properly as a separate, dedicated project (ChatBuddy — an offline-first Android companion app with its own 11-phase plan and its own atomic task registry), rather than bolted onto this web app after the fact. Do not resurrect this phase here; if offline/mobile work is needed for StageEgo specifically in the future, it should be re-scoped fresh rather than picking this list back up, since it was written before that separation was made.
<details>
<summary>Original phase content (kept for historical reference only)</summary>

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

</details>

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
| 28 | **Phase 6 (2/N):** voiceEngine.ts playback wrapper | voiceEngine.ts | Web Speech API wrapper: `getAvailableVoices()`, `speak()`, `speakQueue()`, `stopSpeaking()`, `isSpeaking()`, `splitIntoSentences()`. Zero cost, no signup. Not yet wired into UI. |
| 29 | **Phase 6 (3/N):** Voice Studio picker UI | CharacterSelect.tsx | Optional "Set a voice" section in character creation: system voice dropdown, pitch/rate sliders, live preview button. `voiceSettings` wired into `createCharacter()`, only stored if user changed a default. |
| 30 | **Phase 6 (4/N):** Voice Mode toggle — core playback loop complete | ChatWindow.tsx | `voiceModeOn` toggle (persisted, mobile+desktop headers). AI responses now speak aloud via `speakQueue(splitIntoSentences())` on arrival. Personality Mode uses saved character voiceSettings; Generic Mode uses browser default. `stopSpeaking()` on toggle-off and new chat. |
| 31 | **Phase 6 (5/N):** Mic input engine | voiceEngine.ts | Added `isMicSupported()`, `startListening()`, `stopListening()` with minimal ambient `SpeechRecognition` TS types. Browser-native, zero cost. |
| 32 | **Phase 6 (6/N):** Mic button wired into chat | ChatWindow.tsx | Mic button next to Send, gated by `isMicSupported()`. Live interim transcripts, auto-stop on final result, `stopListening()` on new chat. Phase 6 core loop complete both directions (speak-to-send + Voice Mode read-back). |
| 33 | **Phase 6 (7/N):** Voice analysis-assist engine | voiceAnalysis.ts | Autocorrelation pitch detection (median across windows) + amplitude-envelope syllable rate estimation. Maps both to pitch/rate slider ranges. Explicitly NOT cloning — confidence capped at 'medium'. |
| 34 | **Phase 6 (8/N):** Voice analysis UI wiring | CharacterSelect.tsx | "Upload sample" section in Voice Studio: shows estimated pitch/pace/confidence, "Apply suggested" button sets sliders. Clear non-cloning disclaimer in UI copy. |
| 35 | **Phase 6 (9/N):** Emotion-aware prosody engine | voiceEngine.ts | `EMOTION_PROSODY` table + `buildProsodyPlan()` (clause splitting at punctuation, pause sizing) + `speakExpressive()` (pitch/rate/volume nudges per emotion on top of character base voice). Punctuation/emotion-driven heuristics, not neural prosody. |
| 36 | **Phase 6 (10/N):** speakExpressive wired into ChatWindow | ChatWindow.tsx | Replaced `speakQueue(splitIntoSentences(...))` with `speakExpressive(cleanedText, voiceSettings, emotion)` — the already-detected emotion now drives voice delivery, not just the portrait panel. |
| 37 | **Phase 6 (11/N):** VoiceSettings.lang field | characterStore.ts | Added optional `lang` (BCP-47) alongside voiceName, for cross-device fallback matching. |
| 38 | **Phase 6 (12/N):** pickBestVoice() fallback matching | voiceEngine.ts | Centralized voice lookup (was duplicated 3x) into one function: exact name → same lang → same language family → browser default. Each tier logged. |
| 39 | **Phase 6 (13/N):** Voice lang captured in Voice Studio | CharacterSelect.tsx | Dropdown onChange now also stores the selected voice's `.lang`, feeding pickBestVoice()'s fallback tiers. |
| 40 | **Phase 6 (14/N):** Voice package export/import engine | voiceEngine.ts | `exportVoicePackage()`, `downloadVoicePackage()`, `parseVoicePackage()`. Honestly scoped as portable settings, not an installable voice (browsers can't install OS-level TTS voices — confirmed via research). |
| 41 | **Phase 6 (15/N):** Voice package UI wiring | CharacterSelect.tsx | Export/Import buttons in Voice Studio. Reuses a tuned voice across characters, fits the app's immutable-character/fork design. Completes the 3-part extension plan. |
| 42 | **Phase 6:** iOS Safari speech-priming fix | voiceEngine.ts, ChatWindow.tsx | `primeSpeechIfNeeded()` fires a silent utterance synchronously on first user gesture (Send/mic/Voice Mode toggle) to unlock speech synthesis on iOS Safari before Voice Mode's post-await `speak()` call. Not yet verified on real iOS hardware. |
| 43 | **Phase 10:** API call logging engine | apiLogger.ts, apiClient.ts | IndexedDB log of every provider call — latency, status, model, est. token counts. 7-day auto-prune, fire-and-forget. Wired into both public entry points in apiClient.ts via shared `logCall()`. |
| 44 | **Phase 10:** Performance Log viewer UI | SettingsModal.tsx | New 5th settings tab: summary stats, per-provider breakdown, last 50 calls, export-as-JSON, clear-with-confirm. Lazy-loads only when tab opened. |
| 45 | **UI polish:** liquid-glass + neon glow (backfilled log entry) | index.css, ChatWindow.tsx | **Committed 2026-09-10 (commit `514f206`), never logged in this file until now — documentation gap, not a code gap.** Verified complete 2026-09-11 by reading the actual committed code. `.glass-surface` utility (translucent blurred panel, light-reflective top edge) applied to: chat input field, Send button, Mic button, Stop-generation button. `.glow-neon` utility (teal/amber/red variants) applied to: typing-indicator dots (teal, pulsing) and mic icon while actively listening (red). Explicitly NOT built: no audio-reactive waveform/spectrum visualizer anywhere in the app — checked in the same commit, would be a new feature not a restyle. |
| 46 | **UI polish (2/2):** glass/neon refinements | index.css | `.glass-surface` transition now includes `background` (smoother hover), plus `will-change: backdrop-filter, transform` so the browser pre-promotes it to a GPU layer — keeps hover/press smooth with several glass surfaces on screen at once. `@media (prefers-reduced-motion: reduce)` now auto-falls-back the pulsing glow to static, respecting the OS accessibility setting independent of the manual toggle below. |
| 47 | **"Reduce Visual Effects" toggle** | App.tsx, SettingsModal.tsx, index.css | New Settings > Advanced toggle, **off by default** (full effects run for everyone until someone opts out) — adds `reduce-effects` class to `<html>` via the same event-driven pattern as the existing theme toggle. `html.reduce-effects` CSS rules swap blur for a solid background and disable the glow pulse. Plain-language label/description, not technical jargon, per requirement that this stay easy to find and read. |
| 48 | **BUG FIX:** stale "AI performance coach" branding | index.html, package.json, App.tsx | CORE_VISION.md claimed this misalignment was "fully corrected" — it wasn't in these three spots (meta description/keywords/title, package.json description, `document.title`). Also what `stageego.netlify.app`'s live page metadata was showing. Caught while reviewing the liquid-glass UI, not the original task — fixed and logged separately per user's "correct accuracy as you go" instruction. |
| 49 | **BUG FIX:** Known Issue #12, `gemini-pro` deprecated | apiClient.ts, apiValidator.ts | Confirmed via Google's docs + a community bug report that `gemini-pro` was fully removed (404), not just stale. Replaced 3 chat references + the validator ping with the `gemini-flash-latest` alias, chosen over a fixed dated model specifically because the current `gemini-2.5-*` generation itself shuts down Oct 2026. |
| 50 | **NEW FEATURE:** OpenRouter as a 4th AI provider | apiClient.ts, apiLogger.ts, apiValidator.ts, SettingsModal.tsx, helpContent.ts | User-requested (2026-09-12) — OpenRouter tends to be more reliably reachable than Gemini and routes to many models (including free) through one key. Full `sendToOpenRouter`/`streamFromOpenRouter` pair mirroring the existing OpenAI methods (OpenRouter's API is OpenAI-compatible). Default model is `openrouter/free` (OpenRouter's own auto-selecting free-model router) rather than a pinned model ID, for the same reason as the `gemini-flash-latest` fix — individual free model slugs get rotated/deprecated often. Key detection (`sk-or-` prefix) added to both `detectAPIProvider()` and `validateAPIKey()`, checked ahead of the generic `sk-` → OpenAI fallback. Validated via OpenRouter's dedicated `/auth/key` endpoint. Settings key label and the in-app "Getting an API key" help popup both updated with OpenRouter's setup steps. **Not added:** a manual model-override field — OpenRouter's real value is model choice, and this shipped as a "paste key and go" change per what was actually asked; worth adding later if a specific model is wanted instead of the free router. **✅ CONFIRMED WORKING — Arthur tested locally 2026-09-12 with his own OpenRouter key, reported it "perfect."** |
| 51 | **NEW FEATURE:** Character search system - multi-source, confidence-scored, disambiguation-ready | characterFetch.ts, CharacterSearchModal.tsx, ChatWindow.tsx, CharacterSelect.tsx, characterStore.ts | User-requested (2026-09-12), directly motivated by a real failure: auto-search mismatched Chino from "Is the Order a Rabbit?" (a lesser-known character) with a wrong personality/background. Rebuilt in 5 commits: (1) `characterFetch.ts` foundation - added Wikipedia as a 4th CORS-friendly source (fills the live-action/real-person gap the other 3 anime/game-wiki sources don't cover), thumbnails on all 4 sources, a documented 0-100 confidencePercent heuristic (source tier + name-match quality + content richness + thumbnail presence, capped at 95), and `searchCharacterCandidates()` which queries all 4 concurrently and returns EVERY hit as a separate candidate rather than merging same-named results - deliberately, since merging two different fictional characters sharing a name would be actively wrong, not just imprecise. (2) `CharacterSearchModal.tsx` - shared search UI, live per-source progress narration (genuine, not a canned animation), results as pickable cards with thumbnail/source/confidence%/snippet. Personality Mode gets a stricter <50% confidence gate (explicit "use anyway or enter manually" choice) since that mode has no take-backs; Generic Mode has no gate, staying quick/reversible. (3) Wired into Generic Mode: search-icon button next to the chat input, floating "Switching to X..." status reusing the existing mic-warning text slot. (4) `characterStore.ts`: added `appearance`, `relationships`, `referenceLink` fields - manual-entry-only, since the 4 fetch sources return one bio blob, not neatly separated categories. (5) Wired into Personality Mode: "Search the web" button + "Enter/edit details manually" collapsible section (5 textareas + reference link) BOTH feed the same fields, and a search pick pre-fills + reveals them for review/editing rather than applying silently - directly answers "does search actually do better than typing it myself?" by making it visible and comparable per-character. **Bug caught and fixed while wiring this:** the AI-facing bio context (ChatWindow.tsx, both the actual chat prompt and the word-flagging allowlist) only ever read summary/personality/background - appearance/relationships would have been saved but silently never reached the AI without this fix. |

---

## 6. Known Issues & Error Handling

| # | Issue | Status | File | Fix Required |
|---|-------|--------|------|-------------|
| 11 | Netlify deploy credits exhausted (2026-09-11) | **PENDING — waiting on external reset** | N/A (infra) | `stageego.netlify.app` is up on existing "operational" credits, but no new deploys can go out until Netlify credits refresh (expected next month, per Arthur). Workflow while blocked: keep committing/pushing to GitHub as normal; Arthur pulls locally into VS Code (`npm run dev`) to test rather than via the live URL. Do not treat GitHub pushes as "deployed" during this window — HANDOVER.md's completion bar (Section 0, rule 3) is unaffected, this only blocks the *live* Netlify build specifically. |
| 12 | Gemini model hardcoded to `gemini-pro` | **✅ FIXED 2026-09-12** | apiClient.ts, apiValidator.ts | Confirmed `gemini-pro` was fully removed by Google (404, not just stale) via official docs + a matching community bug report. Replaced with the `gemini-flash-latest` alias (not a fixed dated model) across all 3 chat references + the key-validation ping, specifically so the currently-stable `gemini-2.5-*` models' own Oct 2026 shutdown doesn't cause a repeat of this same issue. |
| 13 | Gemini key provided 2026-09-11 not yet tested | **PENDING — blocked by sandbox network, confirmed 2026-09-11** | N/A | Both `curl` (bash tool) and `web_fetch` were tried against `generativelanguage.googleapis.com` — the former isn't on this sandbox's egress allowlist, the latter refuses URLs that weren't already fetched/searched earlier in the same conversation. No remaining tool path in this environment can reach Google's API; this is a hard block, not something to keep retrying. Note: key detection logic (`apiClient.ts`'s `detectAPIProvider()`, `apiValidator.ts`'s `validateAPIKey()`) does NOT require the `AIzaSy...` prefix — it's just "not sk-/sk-ant-, length > 30" → Gemini, so Arthur's differently-formatted key (`AQ.Ab8RN6...`, 53 chars, generated from an account with a Google subscription) already routes correctly with no code change needed. As of 2026-09-12 the model-name bug (issue #12) that would have caused a false-negative 404 is now fixed, so a local test should isolate purely on key validity. What's actually unverified is whether Google's backend accepts this key for the Generative Language API specifically — that can only be confirmed by Arthur testing locally (npm run dev, Settings > Standard Assistant > Test Connection) or by this sandbox's network settings being opened to that domain. Do not paste real API keys into this file or into committed code — this row intentionally omits the actual key value. |
| 14 | `avatarGenerate.ts` image model (`gemini-2.5-flash-image`) shuts down Oct 2, 2026 | **PENDING — flagged 2026-09-12, not fixed** | avatarGenerate.ts | Found while researching issue #12. Separate model, separate feature (Phase 8 Avatar Creation) — deliberately left untouched today to stay focused on the chat-model fix. About 3 weeks of runway as of this writing; worth prioritizing before Phase 8 is next picked up. |
| 15 | Liquid-glass UI (issue #45/#46 above) reportedly not visible in Arthur's local test | **UNRESOLVED — reported 2026-09-12, not investigated** | Unknown — likely environment, not code | Arthur pulled from GitHub and ran locally, said the glass/glow styling "felt as if the changes were not made." The code IS committed and correct (verified directly against the files both when it shipped and again this session). Candidate causes, none confirmed: a stale `npm run dev` process that didn't pick up the pull, browser cache, a `git pull` that didn't actually fast-forward, or the effect being subtle enough (small glass-surface accents, not a whole-UI change) that it didn't register against expecting something more dramatic. **Likely superseded** by issue #18 below (full UI redesign from scratch) rather than worth debugging in isolation — noted here so the discrepancy isn't lost. |
| 16 | Speech-to-text cuts off ~5-10 seconds before the person finishes speaking | **PENDING — reported 2026-09-12, not fixed** | voiceEngine.ts | Real bug, not a mic-hardware issue on Arthur's end (the existing mic-quality warning correctly told him about a separate muffled-mic issue elsewhere, so that part works as intended — this is specifically recognition cutting off early, likely an overly aggressive silence-detection/timeout in the SpeechRecognition config). Not investigated yet — deprioritized behind the UI redesign per Arthur's own stated sequencing, but flagged clearly so it isn't forgotten. |
| 17 | No per-character (or per-Generic-Mode) settings exist — only global app settings | **PENDING — reported 2026-09-12, not fixed** | SettingsModal.tsx (global only) | Arthur noticed there's nowhere to configure something specific to one created character or to Generic Mode specifically — everything lives in the single global Settings modal. Likely folds naturally into the UI redesign (issue #18) rather than being a separate bolt-on fix — worth deciding placement during that planning pass rather than patching the current Settings modal now. |
| 18 | **MAJOR:** Full UI/UX redesign requested — planning phase, not started | **IN PLANNING as of 2026-09-12** | Everything visual | See new Section 10 below for full detail. Arthur wants the entire UI rebuilt from scratch, benchmarked against Claude.ai's own chat interface for cleanliness/modernity, with StageEgo's actual feature set as the differentiator layered on top — not a copy of Claude's UI, a comparable quality bar. Explicitly wants a full navigational/structural plan (user journey from app load through every screen) BEFORE any implementation starts. An existing `VISUAL_NOVEL_UI_SPEC.md` (24K, fairly detailed - portraits, themes, settings panel, responsive breakpoints) already exists in the repo and appears to have gone largely unimplemented — whether to revise/build on it or discard it entirely is an open question flagged directly to Arthur, not decided unilaterally. |
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
- [x] **Non-verbal action formatting** — DONE 2026-09-03. `renderContent()` in ChatWindow.tsx now matches single-asterisk *action* text and renders it as italic slate-400, alongside the existing **bold** handling. Pure render-layer, no data model change.
- **Multi-session continuity:** Long-term memory across separate chat sessions with the same character (currently each chat session starts fresh). Requires backend.

---

## 8. Key Things to Remember

- **App title in index.html** may still reference old name — verify it says StageEgo.
- **Tailwind brand colors:** `brand.DEFAULT: #14b8a6`, `brand.dark: #0d9488`, `brand.light: #2dd4bf`.
- **Mode string format (do not change):** `'generic'` or `'personality:behavior:name:characterId'` — parsed by `parseMode()` in ChatWindow.tsx. Adding a 5th segment would break parsing.
- **localStorage keys in use:** `user_api_key`, `profanity_filter`, `ai_temperature`, `stageego_characters`.
- **Events in use:** `profileUpdated` (re-init API client), `charactersUpdated` (refresh saved list).
- **Help-popup pattern established (2026-09-03):** circular "?" (HelpCircle icon) next to a field label, opens a step-by-step instructions popup on its own higher-z-index overlay (`z-[60]`, `fixed inset-0` backdrop, `onClick={(e) => e.stopPropagation()}` on the card so clicking the backdrop closes it). Four instances built so far, all in this exact pattern:
  1. API Key field — Settings > Standard Assistant (`SettingsModal.tsx`, `showKeyHelp`)
  2. Voice Studio — CharacterSelect.tsx, `showVoiceStudioHelp`
  3. Emotion-specific art slots — CharacterSelect.tsx, `showEmotionSlotsHelp`
  4. Fork/character-immutability — CharacterSelect.tsx, `showForkHelp`
  Considered but deliberately skipped: Temperature slider and Profanity Tolerance (Settings > Advanced/Characters) — both already have adequate one-line inline explanations with no hidden multi-step mechanics, so a popup there would be decorative rather than genuinely useful. Reuse this exact pattern for any future field that needs in-context instructions rather than inventing a new help UI each time.
- **No Supabase for character data yet** — everything is localStorage. Don't assume otherwise.
- **Portrait images are base64 in localStorage** — this is prototype-only. Move to Supabase Storage in Phase 9.
- **Deployment URL:** `maihuku.netlify.app` — ⚠️ flagged to deal with later, not confirmed aligned with current build.
- **Offline is explicitly off the table** until the web app is fully feature-complete and stable.

---

## 9. Priority Order for Next Session

**2026-09-12 status (updated, later in the same session):** OpenRouter
is **confirmed working** — Arthur tested it locally himself and called
it "perfect." Gemini's key is still untested by him as of this
writing (he tested OpenRouter first). Netlify deploys remain blocked
on exhausted credits (Known Issue #11, expected back next month) —
work continues via GitHub + Arthur testing locally in VS Code
(`npm run dev`).

**Everything below this point is now second priority.** Arthur was
explicit: **the full UI/UX redesign (Known Issue #18, detailed in new
Section 10 below) is the top priority going forward**, ahead of Phase
6.5 real-device testing, Phase 8 Avatar Creation, and the open voice/
TTS architecture decision (still undecided — see the paragraph below,
unchanged from before). Do not start Phase 8 or real-device testing
next session without first checking whether the UI planning
conversation in Section 10 has concluded — jumping ahead of it would
go directly against explicit sequencing instructions.

**Open decision, still not made — voice/TTS direction:** Arthur was
asked to choose between (1) keep free browser TTS and just polish it,
(2) add a paid cloud TTS provider (e.g. ElevenLabs), or (3) explore a
Python backend. His answer was garbled in transcription (dictated) —
something like keeping free TTS while *also* somehow merging in a
Python backend and ElevenLabs into "one single tool" — genuinely
unclear, and he immediately said to put TTS aside again ("for the
second time or third time") to focus on the character search system
instead. **Do not assume an answer from that garbled reply** — ask
him to clarify plainly before touching Phase 6/TTS architecture again.

Also flagged, not yet acted on: Known Issue #14 (avatar image model
deprecation), #16 (STT cuts off early), #17 (no per-character
settings) — all deprioritized behind the UI redesign per Arthur's own
sequencing, not forgotten.

**Phase 6 (Voice & Audio) and Phase 6.5 (Speech Recognition Robustness)
are both fully built and code-complete. Nothing is half-finished.**
Here's exactly what's done and what's next:

**Done:**
- [x] Core: VoiceSettings data model, Web Speech API playback engine, Voice Studio UI, Voice Mode toggle, mic input
- [x] Extension 1/3: Voice analysis-assist tool (upload a sample → suggested pitch/rate)
- [x] Extension 2/3: Emotion-aware prosody/pacing (speakExpressive)
- [x] Extension 3/3: Voice package portability (fallback matching + export/import)
- [x] iOS Safari speech-priming fix (primeSpeechIfNeeded, not yet device-tested)
- [x] Phase 6.5 Part 1: mixed-language/unusual-word flagging (flagUnusualTokens, inline UI, click-to-lookup) — see Section 3 for full detail
- [x] Phase 6.5 Part 2: mic signal quality preflight + external device detection (checkMicSignalQuality, device watcher, UI wiring) — see Section 3 for full detail

**Once the Section 10 planning conversation has concluded, resume here:**
1. **Real-device testing** — this sandbox cannot test physical hardware, so nothing in Phase 6 or 6.5 has been verified on an actual phone/mic yet. This now covers MORE ground than before Phase 6.5 was added: test on iOS Safari (mic input, priming fix, AND the new mic-quality-check permission flow — two separate getUserMedia-adjacent calls now happen around mic use), Android Chrome, desktop Firefox (weakest Web Speech API support of the major browsers), and specifically test with a Bluetooth headset connected/disconnected mid-session to verify the device-change watcher fires correctly. Fix whatever real-device testing turns up, including Known Issue #16 (STT early cutoff) found this session.
2. Once that testing is clean → **Phase 8, Avatar creation & customization tool** (explicitly deferred until Phase 6 was done — see Section 8 above for full confirmed scope: custom image upload → 2D avatar, animated or multi-frame for emotions, free-tier AI image tooling still needs research before any build starts). Fix Known Issue #14 (deprecated image model) as part of, or just before, this phase.
3. Phase 7 (Professional Coaching Modules) remains further out, after Phase 8.

---

## 10. UI/UX Redesign — Planning Phase (started 2026-09-12)

**Status: planning conversation in progress, NO implementation has
started.** Arthur was explicit that a full navigational/structural
plan must exist and be agreed on BEFORE any redesign code is written
— this section exists so that plan has somewhere durable to live as
it develops, rather than being lost between chat sessions.

**What prompted this:** Arthur said the current UI "did not change
from what it looked like when I last saw it probably a month ago,"
compared it unfavorably to Claude.ai's own chat interface, and asked
for a complete rebuild "from scratch." He does NOT want a copy of
Claude's UI — the comparison is about cleanliness/modernity as a
quality bar, with StageEgo's actual feature set (character switching,
Personality Mode's lock-in, voice, portraits, theming) as what
differentiates it. He explicitly used the word "2020-and-plus" to
describe what he wants to move away from.

**What he asked for, in order:**
1. A full structural/navigational document: how a user moves through
   the entire app, starting from page load — auto-login if an account
   is linked, or a choice between signing in vs. continuing as guest
   for a new user — through to every major screen and how each is
   reached. This is a document/diagram to agree on, not code.
2. Only after that structure is agreed → the actual visual redesign:
   colors, layout, component placement, styling, everything "worthy of
   today" rather than dated.

**`VISUAL_NOVEL_UI_SPEC.md` — read in full 2026-09-12, assessment below.**
This ~24K doc specs a portrait-centric Visual Novel-style layout:
character portrait as a persistent sidebar element with emotion-based
image swapping, an emoji+label "emotion badge" overlay, a 5-color
theme system, and a settings panel with VN-specific options (portrait
size, chat style, emotion display mode). Cross-checked against the
real codebase: its CORE technical patterns already exist in some form
— `emotionDetect.ts`, `CharacterPortrait.tsx`, the theme toggle in
`App.tsx`, and `emotionPortraits`/`themeColor` on `SavedCharacter` all
correspond to concepts in this doc. So this is NOT an ignored spec —
it's mostly a description of what got built, likely written partway
through or just written up afterward, and only stale in its literal
CSS/class-name details (the real components almost certainly don't
use these exact class names — they're Tailwind-utility-based).

**The real, sharper question this raises for Arthur (surface this
directly, don't guess):** the VN spec's whole premise — a persistent
character-portrait panel with an emoji emotion badge — is a
*different visual language* than the "closer to your own chat style"
benchmark Arthur set (Claude.ai's interface has no persistent avatar
sidebar or emoji status badges; presence is expressed far more
minimally). These aren't automatically incompatible, but reconciling
them is a real design decision, not a formality: does Arthur want to
(a) keep the portrait-centric VN layout but modernize its visual
execution, (b) shrink character presence down to something more
minimal (small avatar + name, no big sidebar/badge) and lean on other
features to differentiate from a plain chat UI, or (c) something in
between? Whichever the new session decides, it isn't unilateral to
pick without asking.

**Related open items that likely fold into this redesign** (don't
solve separately unless Arthur says otherwise): Known Issue #17 (no
per-character settings), and several items already sitting in Section
7 (Future Design Ideas) that overlap directly — "Character creation
loading states" (partially achieved already, this session, via
CharacterSearchModal's live per-source progress narration — worth
noting to Arthur as a preview of the direction), "Right-hand character
info drawer," and "Character 'Extra Data' field" (now partially
covered by this session's appearance/relationships/referenceLink
fields, but the UI redesign may want to present this differently).

**Do not start writing redesign code, even small pieces, until the
structural plan in point 1 above has been explicitly agreed on with
Arthur.** This is a direct, repeated instruction from him, not a
guideline to weigh against convenience.

**Session handoff note (2026-09-12):** this whole planning phase is
being handed to a fresh chat session (a long conversation was getting
unwieldy) via a new preamble prompt Arthur will paste in. That new
session's entire priority is this Section 10 — the structural plan
first, then the visual redesign (colors, layout, icons, logo, menus,
nav bars, everything). If you're reading this as that new session:
start by proposing the navigational structure document, and put the
VN-spec question above to Arthur before assuming an answer either way.
