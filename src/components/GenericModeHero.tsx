// src/components/GenericModeHero.tsx
//
// Generic Mode's welcome moment - shown once, before any real exchange
// (replaces the plain greeting bubble, which still exists underneath as
// the actual stored message so conversation history/threads are
// unaffected; this is a presentational swap only).
//
// Modeled on the reference ChatGPT screenshot's pattern - a glowing
// orb as the emotional anchor of an empty chat, with a few quick-action
// suggestions underneath - but using StageEgo's own BrandMark rather
// than their logo (as asked), plus an orbital ring flourish pulled from
// a second reference (an orbit/mood-selector concept app) layered
// behind the orb rather than copied as its own feature.

import { BrandMark } from './Brand';
import { Search, Shuffle, Sparkles } from 'lucide-react';

const STARTER_PROMPTS = [
  'Become Sherlock Holmes',
  'Become a wise old wizard',
  'Surprise me with a character',
];

export default function GenericModeHero({
  onPickPrompt,
  onOpenSearch,
}: {
  onPickPrompt: (prompt: string) => void;
  onOpenSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center pt-6 pb-2">
      {/* Orb + orbit rings */}
      <div className="relative w-24 h-24 mb-5">
        <div className="orbit-ring ring-a" style={{ inset: '-14px', transform: 'rotate(-12deg)' }} />
        <div className="orbit-ring ring-b" style={{ inset: '-26px', transform: 'rotate(18deg)' }} />
        <div className="orb-glow relative w-full h-full rounded-full glass-panel border flex items-center justify-center">
          <BrandMark size={48} />
        </div>
        <span className="sparkle" style={{ top: '-2px', right: '2px' }} />
      </div>

      <h2 className="text-xl font-bold mb-1.5 text-holographic">Chat with any character</h2>
      <p className="text-sm text-slate-400 max-w-xs mb-5">
        Ask about someone specific, tell me who to become, or just start talking.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPickPrompt(p)}
            className="suggestion-chip glass-surface flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm text-slate-200 text-left"
          >
            {p === 'Surprise me with a character'
              ? <Shuffle size={14} className="shrink-0" style={{ color: 'var(--user-accent)' }} />
              : <Sparkles size={14} className="shrink-0" style={{ color: 'var(--user-accent)' }} />}
            {p}
          </button>
        ))}
        <button
          onClick={onOpenSearch}
          className="suggestion-chip glass-surface flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm text-slate-200 text-left"
        >
          <Search size={14} className="shrink-0" style={{ color: 'var(--user-accent)' }} />
          Search for a character
        </button>
      </div>
    </div>
  );
}
