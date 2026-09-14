import { EMOTION_EMOJI, type Emotion } from '../lib/emotionDetect';

interface CharacterPortraitProps {
  characterName: string;
  emotion: Emotion;
  /** Optional real portrait image for this emotion state. Falls back to an
   * initial + emoji badge when not provided - lets the panel work today
   * and slot in uploaded art later without changing callers. */
  portraitUrl?: string;
}

/**
 * VN-style character "cutout." Redesigned 2026-09-14 away from the old
 * boxed/cropped panel: no card background, no border, no object-cover
 * crop - the image renders with object-contain so a portrait with a
 * transparent background reads as a figure standing directly against the
 * app's own background rather than a framed photo. This only produces a
 * true cutout look when the uploaded image itself has a transparent
 * background; StageEgo does not run background removal on uploaded art,
 * so an ordinary photo/full-background portrait will still show its own
 * background here. Name and emotion are small floating glass chips
 * (reusing the existing .glass-surface utility) instead of a solid
 * gradient banner, since there's no card edge for a banner to sit on.
 */
export default function CharacterPortrait({ characterName, emotion, portraitUrl }: CharacterPortraitProps) {
  const initial = (characterName[0] || '?').toUpperCase();

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {portraitUrl ? (
        <img
          key={emotion}
          src={portraitUrl}
          alt={`${characterName} - ${emotion}`}
          className="flex-1 min-h-0 w-full object-contain object-bottom drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-opacity duration-300 animate-[fadeIn_0.3s_ease-out]"
        />
      ) : (
        <div
          key={emotion}
          className="flex-1 min-h-0 w-full flex items-center justify-center transition-all duration-300 animate-[fadeIn_0.3s_ease-out]"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-4xl font-bold text-slate-900 shadow-lg">
              {initial}
            </div>
            <span className="text-3xl">{EMOTION_EMOJI[emotion]}</span>
          </div>
        </div>
      )}

      {/* Name chip - floats near the top, absolute so it doesn't take up
          column space the cutout needs */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 max-w-[90%] glass-surface rounded-full px-3 py-1">
        <span className="text-sm font-semibold text-white truncate block">{characterName}</span>
      </div>

      {/* Emotion chip - sits right under the character, in normal flow */}
      <div className="glass-surface flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white mb-2 shrink-0">
        <span>{EMOTION_EMOJI[emotion]}</span>
        <span className="capitalize">{emotion}</span>
      </div>
    </div>
  );
}
