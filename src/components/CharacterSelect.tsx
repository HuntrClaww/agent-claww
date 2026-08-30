import { useState } from 'react';
import { Search, Shuffle, Lock, BookLock, Sparkles, ArrowRight } from 'lucide-react';

type Behavior = 'true-to-character' | 'off-script';

export default function CharacterSelect({ onSelect }: { onSelect: (mode: string) => void }) {
  const [characterName, setCharacterName] = useState('');
  const [behavior, setBehavior] = useState<Behavior>('off-script');

  const handlePersonalityStart = () => {
    if (!characterName.trim()) return;
    onSelect(`personality:${behavior}:${characterName.trim()}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-5xl w-full py-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2 tracking-tight">
            Two sides. One coin.
          </h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Explore any character freely, or commit to one and go deep.
          </p>
        </div>

        {/* The Coin: two panels + center divider */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0">

          {/* GENERIC MODE */}
          <div className="relative flex flex-col p-7 rounded-2xl md:rounded-r-none bg-slate-800/60 border border-slate-700 md:border-r-0">
            <div className="flex items-center gap-2 mb-1">
              <Shuffle size={16} className="text-cyan-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">Side A · Generic</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Any character, anytime</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              No lock-in. Ask for a character and the AI searches fandoms and archives to
              become them on the spot — then switch to someone else whenever you want.
            </p>

            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Search size={13} />
                <span>Searches wikis, fandoms &amp; public archives</span>
              </div>
              <button
                onClick={() => onSelect('generic')}
                className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                Start Generic Chat
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Coin edge divider */}
          <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-700 z-10 items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-[11px] font-bold text-slate-400">
              OR
            </div>
          </div>

          {/* PERSONALITY MODE */}
          <div className="relative flex flex-col p-7 rounded-2xl md:rounded-l-none bg-slate-800/60 border border-slate-700 md:border-l-0">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={15} className="text-amber-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">Side B · Personality</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">One character, locked in</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Choose a character for this session and pick how strictly they stay in character.
            </p>

            {/* Character name input */}
            <label className="block mb-3">
              <span className="text-xs font-medium text-slate-500 mb-1.5 block">Character name</span>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="e.g. Sherlock Holmes"
                className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </label>

            {/* Behavior toggle */}
            <div className="mb-5">
              <span className="text-xs font-medium text-slate-500 mb-1.5 block">Behavior</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBehavior('true-to-character')}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all ${
                    behavior === 'true-to-character'
                      ? 'bg-amber-500/10 border-amber-400 text-amber-300'
                      : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <BookLock size={16} />
                  True-to-Character
                </button>
                <button
                  onClick={() => setBehavior('off-script')}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all ${
                    behavior === 'off-script'
                      ? 'bg-amber-500/10 border-amber-400 text-amber-300'
                      : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Sparkles size={16} />
                  Off-Script
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                {behavior === 'true-to-character'
                  ? 'Stays strictly canon — won\u2019t acknowledge anything outside their source material.'
                  : 'Same core personality, but can learn, develop, and break the fourth wall.'}
              </p>
            </div>

            <button
              onClick={handlePersonalityStart}
              disabled={!characterName.trim()}
              className="mt-auto w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold py-3 rounded-xl transition-colors shadow-md hover:shadow-lg disabled:hover:shadow-md"
            >
              Lock In Character
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          You can leave this session anytime to flip the coin again.
        </p>
      </div>
    </div>
  );
}
