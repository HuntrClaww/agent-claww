import { useState, useEffect } from 'react';
import { Search, Shuffle, Lock, BookLock, Sparkles, ArrowRight, GitFork, Trash2, ImagePlus, X } from 'lucide-react';
import { fetchCharacterInfo, citationTag } from '../lib/characterFetch';
import { createCharacter, listCharacters, deleteCharacter, isPortraitSizeOk, PORTRAIT_MAX_KB, SEED_CONTEXT_LIMIT, type SavedCharacter, type BehaviorMode } from '../lib/characterStore';

const DEFAULT_THEME_COLOR = '#f59e0b'; // matches the app's existing amber accent

export default function CharacterSelect({ onSelect }: { onSelect: (mode: string) => void }) {
  const [characterName, setCharacterName] = useState('');
  const [behavior, setBehavior] = useState<BehaviorMode>('off-script');
  const [saved, setSaved] = useState<SavedCharacter[]>([]);
  const [forkFromId, setForkFromId] = useState<string | null>(null);
  const [seedContext, setSeedContext] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [portraitDataUrl, setPortraitDataUrl] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);

  useEffect(() => {
    const refresh = () => setSaved(listCharacters());
    refresh();
    window.addEventListener('charactersUpdated', refresh);
    return () => window.removeEventListener('charactersUpdated', refresh);
  }, []);

  const handleUseSaved = (character: SavedCharacter) => {
    onSelect(`personality:${character.behavior}:${character.name}:${character.id}`);
  };

  const handlePortraitFile = (file: File | undefined) => {
    setPortraitError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPortraitError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!isPortraitSizeOk(dataUrl)) {
        setPortraitError(`Image is too large (max ${PORTRAIT_MAX_KB}KB) — try a smaller or more compressed image.`);
        return;
      }
      setPortraitDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handlePersonalityStart = async () => {
    const trimmed = characterName.trim();
    if (!trimmed || isFetching) return;

    setIsFetching(true);
    const info = await fetchCharacterInfo(trimmed);
    setIsFetching(false);

    const character = createCharacter({
      name: trimmed,
      behavior,
      summary: info?.summary,
      source: info ? citationTag(info) : 'user-provided',
      forkedFrom: forkFromId || undefined,
      seedContext: forkFromId ? seedContext : undefined,
      portraitUrl: portraitDataUrl || undefined,
      themeColor: themeColor !== DEFAULT_THEME_COLOR ? themeColor : undefined,
    });

    onSelect(`personality:${character.behavior}:${character.name}:${character.id}`);
  };

  const forkSource = saved.find(c => c.id === forkFromId);

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
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Choose a character for this session and pick how strictly they stay in character.
            </p>

            {/* Saved characters (immutable - use or delete only) */}
            {saved.length > 0 && (
              <div className="mb-5">
                <span className="text-xs font-medium text-slate-500 mb-1.5 block">Your characters</span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {saved.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 group"
                    >
                      <button
                        onClick={() => handleUseSaved(c)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        {c.portraitUrl ? (
                          <img src={c.portraitUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {c.name[0]?.toUpperCase()}
                          </span>
                        )}
                        <span className="text-sm text-slate-200 truncate">{c.name}</span>
                        <span className="text-[9px] uppercase tracking-wide text-amber-300/70 shrink-0">
                          {c.behavior === 'true-to-character' ? 'Lore-Locked' : 'Open-World'}
                        </span>
                      </button>
                      <button
                        onClick={() => setForkFromId(c.id)}
                        title="Fork into a new character"
                        className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
                      >
                        <GitFork size={13} />
                      </button>
                      <button
                        onClick={() => deleteCharacter(c.id)}
                        title="Delete"
                        className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fork banner */}
            {forkSource && (
              <div className="mb-4 flex items-start gap-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-3 py-2.5">
                <GitFork size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-cyan-300">
                    Forking from <span className="font-medium">{forkSource.name}</span> — this creates a brand new character.
                  </p>
                  <button
                    onClick={() => { setForkFromId(null); setSeedContext(''); }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 underline mt-1"
                  >
                    Cancel fork
                  </button>
                </div>
              </div>
            )}

            {/* Character name + portrait upload */}
            <div className="flex gap-3 mb-3">
              <label className="block flex-1">
                <span className="text-xs font-medium text-slate-500 mb-1.5 block">
                  {forkSource ? 'New character name' : 'Character name'}
                </span>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g. Sherlock Holmes"
                  className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </label>

              <div className="shrink-0">
                <span className="text-xs font-medium text-slate-500 mb-1.5 block">Portrait</span>
                <label className="relative block w-[42px] h-[42px] rounded-lg border border-dashed border-slate-600 hover:border-amber-400 cursor-pointer transition-colors overflow-hidden bg-slate-900/70">
                  {portraitDataUrl ? (
                    <img src={portraitDataUrl} alt="Portrait preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <ImagePlus size={16} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePortraitFile(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                {portraitDataUrl && (
                  <button
                    onClick={() => { setPortraitDataUrl(null); setPortraitError(null); }}
                    className="text-[10px] text-slate-500 hover:text-red-400 mt-1 flex items-center gap-0.5 mx-auto"
                  >
                    <X size={10} /> clear
                  </button>
                )}
              </div>

              <div className="shrink-0">
                <span className="text-xs font-medium text-slate-500 mb-1.5 block">Color</span>
                <label className="relative block w-[42px] h-[42px] rounded-lg border border-slate-600 cursor-pointer overflow-hidden">
                  <div className="w-full h-full" style={{ backgroundColor: themeColor }} />
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
            {portraitError && (
              <p className="text-[11px] text-red-400 mb-3 -mt-1.5">{portraitError}</p>
            )}

            {/* Seed context, only when forking */}
            {forkSource && (
              <label className="block mb-3">
                <span className="text-xs font-medium text-slate-500 mb-1.5 flex justify-between">
                  <span>Paste what to carry over (optional)</span>
                  <span className={seedContext.length > SEED_CONTEXT_LIMIT * 0.9 ? 'text-amber-400' : ''}>
                    {seedContext.length}/{SEED_CONTEXT_LIMIT}
                  </span>
                </span>
                <textarea
                  value={seedContext}
                  onChange={(e) => setSeedContext(e.target.value.slice(0, SEED_CONTEXT_LIMIT))}
                  placeholder="Paste specific quotes or facts from your old chat — not the whole history."
                  rows={3}
                  className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                />
              </label>
            )}

            {/* Behavior toggle — framed around knowledge access, per design notes */}
            <div className="mb-5">
              <span className="text-xs font-medium text-slate-500 mb-1.5 block">Knowledge Access</span>
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
                  Lore-Locked
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
                  Open-World
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                {behavior === 'true-to-character'
                  ? 'Confined to their own world — no knowledge of anything outside their source material, reacting to modern topics with in-character confusion or wonder.'
                  : 'Full access to real-world knowledge and modern topics, filtered entirely through their personality — same core self, just aware of more.'}
              </p>
            </div>

            <button
              onClick={handlePersonalityStart}
              disabled={!characterName.trim() || isFetching}
              className="mt-auto w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold py-3 rounded-xl transition-colors shadow-md hover:shadow-lg disabled:hover:shadow-md"
            >
              {isFetching ? 'Looking up character...' : 'Lock In Character'}
              {!isFetching && <ArrowRight size={16} />}
            </button>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              This is permanent — you can delete a character later, but not edit it. To change one, fork it into a new character.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          You can leave this session anytime to flip the coin again.
        </p>
      </div>
    </div>
  );
}
