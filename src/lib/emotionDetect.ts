// Emotion Detection
//
// Two detection paths, per VISUAL_NOVEL_UI_SPEC.md:
//   1. Explicit tag: the AI is asked to prefix/embed [emotion:happy] in its
//      reply. We strip that tag before showing text to the user and use it
//      to drive the portrait panel.
//   2. Keyword fallback: if no tag is present (e.g. the model ignored the
//      instruction, or this is the user's own message), scan for emotional
//      keywords as a best-effort guess.
//
// This never blocks rendering - if nothing matches, emotion stays 'neutral'.

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'confused'
  | 'embarrassed'
  | 'thinking'
  | 'romantic'
  | 'fearful';

export const EMOTION_EMOJI: Record<Emotion, string> = {
  neutral: '\u{1F610}',
  happy: '\u{1F60A}',
  sad: '\u{1F622}',
  angry: '\u{1F620}',
  surprised: '\u{1F62E}',
  confused: '\u{1F914}',
  embarrassed: '\u{1F633}',
  thinking: '\u{1F9E0}',
  romantic: '\u{1F60D}',
  fearful: '\u{1F628}',
};

const EMOTION_TAG_PATTERN = /\[emotion:\s*([a-z]+)\s*\]/i;

const KEYWORD_MAP: Record<Exclude<Emotion, 'neutral'>, string[]> = {
  happy: ['happy', 'great', 'love this', 'wonderful', 'amazing', 'excited', 'thrilled', 'yay', 'awesome'],
  sad: ['sad', 'depressed', 'lonely', 'hurt', 'crying', 'miserable', 'heartbroken'],
  angry: ['angry', 'furious', 'mad', 'rage', 'frustrated', 'annoyed', 'pissed'],
  surprised: ['wow', 'shocked', 'surprised', 'incredible', 'no way', 'what?!'],
  confused: ['confused', 'huh', 'unclear', 'puzzled', "don't understand", 'what do you mean'],
  embarrassed: ['embarrassed', 'awkward', 'blush', 'flustered', 'so embarrassing'],
  thinking: ['hmm', 'let me think', 'consider', 'pondering', 'analyzing'],
  romantic: ['love you', 'adore', 'beautiful', 'charming', 'my heart'],
  fearful: ['scared', 'afraid', 'terrified', 'frightened', 'anxious', 'worried'],
};

function isEmotion(value: string): value is Emotion {
  return value in EMOTION_EMOJI;
}

/**
 * Strips a leading/embedded [emotion:x] tag from AI text and returns both
 * the cleaned text and the detected emotion. Falls back to keyword scanning
 * if no tag is present.
 */
export function parseEmotion(text: string): { cleanedText: string; emotion: Emotion } {
  const tagMatch = text.match(EMOTION_TAG_PATTERN);
  if (tagMatch) {
    const cleanedText = text.replace(EMOTION_TAG_PATTERN, '').trim();
    const candidate = tagMatch[1].toLowerCase();
    return {
      cleanedText,
      emotion: isEmotion(candidate) ? candidate : 'neutral',
    };
  }

  const lower = text.toLowerCase();
  for (const [emotion, keywords] of Object.entries(KEYWORD_MAP) as [Exclude<Emotion, 'neutral'>, string[]][]) {
    if (keywords.some(kw => lower.includes(kw))) {
      return { cleanedText: text, emotion };
    }
  }

  return { cleanedText: text, emotion: 'neutral' };
}

/**
 * System-prompt fragment instructing the model to emit emotion tags.
 * Callers can append this to buildSystemPrompt's output when portrait
 * emotion tracking is enabled for a chat.
 */
export const EMOTION_TAG_INSTRUCTION =
  'Start your reply with a short emotion tag reflecting your current mood, ' +
  'in the exact format [emotion:x] where x is one of: neutral, happy, sad, angry, ' +
  'surprised, confused, embarrassed, thinking, romantic, fearful. Example: ' +
  '[emotion:happy] Great to see you! This tag will be stripped before the ' +
  'user sees your message, so use it naturally without acknowledging it.';
