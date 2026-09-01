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
 * VN-style character portrait panel. Shows either a real uploaded image
 * (once the upload system exists) or a generated placeholder that still
 * reacts to emotion changes via color and the emoji badge, per
 * VISUAL_NOVEL_UI_SPEC.md.
 */
export default function CharacterPortrait({ characterName, emotion, portraitUrl }: CharacterPortraitProps) {
  const initial = (characterName[0] || '?').toUpperCase();

  return (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-xl">
      {portraitUrl ? (
        <img
          key={emotion}
          src={portraitUrl}
          alt={`${characterName} - ${emotion}`}
          className="w-full h-full object-cover transition-opacity duration-300 animate-[fadeIn_0.3s_ease-out]"
        />
      ) : (
        <div
          key={emotion}
          className="w-full h-full flex items-center justify-center transition-all duration-300 animate-[fadeIn_0.3s_ease-out]"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-4xl font-bold text-slate-900 shadow-lg">
              {initial}
            </div>
            <span className="text-3xl">{EMOTION_EMOJI[emotion]}</span>
          </div>
        </div>
      )}

      {/* Emotion badge overlay */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white">
        <span>{EMOTION_EMOJI[emotion]}</span>
        <span className="capitalize">{emotion}</span>
      </div>

      {/* Name plate */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/60 to-transparent px-3 py-2.5">
        <span className="text-sm font-semibold text-white truncate block">{characterName}</span>
      </div>
    </div>
  );
}
