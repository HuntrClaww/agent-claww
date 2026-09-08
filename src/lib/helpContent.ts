/**
 * helpContent.ts
 *
 * Single source of truth for in-app help topics (Phase 8.5). Each
 * topic's steps/notes are plain strings (no JSX) so the same content
 * can drive both the per-field "?" popups (via HelpPopup.tsx) and the
 * global searchable Help Hub, without the two ever drifting apart.
 *
 * Adding a topic here + rendering it via <HelpPopup topicId="..." />
 * is now the standard way to add in-app guidance - see the
 * "Help-popup pattern" note in HANDOVER.md Section 8.
 */

export interface HelpTopic {
  id: string;
  title: string;
  /** Short framing sentence(s) shown above the numbered steps. */
  intro?: string;
  /** Numbered steps. Omit for topics that are just intro + note. */
  steps?: string[];
  /** Small closing note, rendered in muted text below everything else. */
  note?: string;
  /** Keywords beyond the title that should surface this topic in Hub search. */
  keywords?: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'api-key',
    title: 'Getting an API key',
    intro:
      "You only need ONE of these — pick whichever provider you'd like StageEgo to use. Keys are pasted into the API Key field in Settings and stored only in your browser, never sent anywhere but that provider's API.",
    steps: [
      'Google Gemini (has a free tier — good starting point): go to aistudio.google.com, sign in, click "Get API key", create one, and paste it in.',
      "Anthropic (Claude): go to console.anthropic.com, open API Keys, click Create Key, and paste it in. Requires billing set up — no free tier.",
      'OpenAI: go to platform.openai.com, open API keys from the account menu, click "Create new secret key" and copy it immediately (only shown once), and paste it in. Requires billing set up — no free tier.',
    ],
    note: 'Having trouble? Double-check you copied the whole key with no extra spaces, and that you\'re pasting it into this app\'s key field, not a provider\'s own chat interface.',
    keywords: ['gemini', 'anthropic', 'openai', 'claude', 'key', 'provider', 'settings'],
  },
  {
    id: 'voice-studio',
    title: 'How Voice Studio works',
    intro:
      "Voice Studio lets a character speak their replies aloud using your browser's built-in text-to-speech — no external service, no cost. Everything here is optional.",
    steps: [
      "Pick a system voice — one of the speech voices already built into your browser/device (not something StageEgo creates). Different browsers and devices offer different voices, so the same character may sound different on different devices.",
      'Adjust pitch and speed with the sliders to shape how that voice sounds.',
      'Preview to hear the current settings before saving.',
      "Optional: upload a sample clip. If you have an audio clip of how the character should sound, StageEgo will suggest starting pitch/speed values based on it. This does NOT clone the voice — it only estimates and pre-fills the sliders, which you can still adjust.",
      "Optional: export/import. Export saves this voice's settings (not audio) as a small file, so you can reuse the same choice on a different character or share it. Importing matches to the closest available voice on that device.",
    ],
    note: "None of this is required — a character works fine with no voice set at all, StageEgo just won't read their replies aloud.",
    keywords: ['voice', 'speech', 'pitch', 'rate', 'audio', 'tts', 'speak'],
  },
  {
    id: 'emotion-art',
    title: 'Emotion-specific art',
    intro:
      "By default a character shows one portrait no matter what they're feeling. These slots let you add different art for different emotions — when the AI's reply reads as one of those emotions, that portrait shows instead. Every slot is optional.",
    steps: [
      'Upload your own art for a specific emotion — click any slot and choose an image.',
      '"✨ Fill gaps from base photo" — a one-click option that generates a variant for every empty slot from your existing base photo. This shifts color and tone to suggest a mood — it does NOT redraw the face or change the expression. It never overwrites a slot you\'ve filled yourself.',
    ],
    note: "You can mix both — some slots with your own uploaded art, others filled by the generator, and some left blank entirely.",
    keywords: ['emotion', 'portrait', 'avatar', 'art', 'happy', 'sad', 'angry', 'expression'],
  },
  {
    id: 'fork-immutability',
    title: 'Why fork instead of edit?',
    intro:
      "Characters in StageEgo are locked once created — you can delete one, but you can't edit its core details (name, personality, behavior mode) afterward.",
    steps: [
      "Forking is how you make a changed version: it creates a brand-new character that starts from the original's details, which you can then adjust before saving. The original character is untouched and still exists separately.",
      '"Paste what to carry over" is optional — if you want the new fork to remember something specific from before, paste just that (a quote, a fact), not a full chat transcript. Leave it blank for a clean fork.',
    ],
    note: "This keeps each character's identity stable and predictable over time, rather than quietly drifting after repeated small edits.",
    keywords: ['fork', 'edit', 'immutable', 'character', 'delete', 'change'],
  },
  {
    id: 'getting-started',
    title: 'Getting started — Generic vs Personality Mode',
    intro:
      "StageEgo works like two sides of the same coin. When you start a session, you choose one of two modes — you can always leave and flip the coin again later.",
    steps: [
      "Generic Mode (Side A): a general-purpose chat where you can ask about any character or ask the AI to become one on the spot, without saving anything. Good for quick, one-off conversations.",
      "Personality Mode (Side B): create and save a specific character with their own name, personality, voice, and art, then chat with just them. This is where Voice Studio, emotion-specific art, and forking all live.",
      "Behavior mode (only in Personality Mode): choose Lore-Locked (the character sticks strictly to canon/established facts about them) or Open-World (more creative freedom in how they respond).",
    ],
    note: "Neither mode is 'better' — Generic is for browsing/exploring, Personality is for building a character you'll come back to.",
    keywords: ['generic', 'personality', 'mode', 'getting started', 'coin', 'side a', 'side b', 'behavior', 'lore-locked', 'open-world'],
  },
  {
    id: 'navigation',
    title: 'Finding your way around',
    intro:
      "A quick map of where things live, if you're not sure where to look.",
    steps: [
      "Sidebar (left): switch or start a new session, open Settings (⚙️) or this Help (?) from the top bar.",
      "Settings > Standard Assistant: set your AI provider's API key (needed for chat to work at all) — see the 'Getting an API key' topic for how.",
      "Settings > Character Management: see/delete your saved characters from one place.",
      "Character creation screen (Personality Mode, Side B): name, portrait, Voice Studio, emotion-specific art, and behavior mode are all set up here before a character is saved.",
      "Once in a chat: the mic and speaker icons (if your browser supports them) let you talk to and hear the character; the message box supports **bold** and *action text* formatting.",
    ],
    keywords: ['navigation', 'where', 'find', 'sidebar', 'menu', 'layout', 'how does this work'],
  },
];

export function findHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find(t => t.id === id);
}

/** Simple case-insensitive search across title/intro/steps/keywords. */
export function searchHelpTopics(query: string): HelpTopic[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_TOPICS;
  return HELP_TOPICS.filter(t => {
    const haystack = [
      t.title,
      t.intro || '',
      ...(t.steps || []),
      ...(t.keywords || []),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
