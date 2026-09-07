import { useState, useEffect, useRef } from 'react';
import { Search, Shuffle, Lock, BookLock, Sparkles, ArrowRight, GitFork, Trash2, ImagePlus, X, HelpCircle } from 'lucide-react';
import { fetchCharacterInfo, citationTag } from '../lib/characterFetch';
import { createCharacter, listCharacters, deleteCharacter, PORTRAIT_MAX_KB, EMOTION_PORTRAIT_MAX_KB, SEED_CONTEXT_LIMIT, type SavedCharacter, type BehaviorMode, type VoiceSettings } from '../lib/characterStore';
import { compressPortrait } from '../lib/imageCompress';
import { generateAllEmotionVariants } from '../lib/avatarFilters';
import { getAvailableVoices, speak, isVoiceSupported, downloadVoicePackage, parseVoicePackage } from '../lib/voiceEngine';
import { analyzeVoiceSample, type VoiceAnalysisResult } from '../lib/voiceAnalysis';
import { EMOTION_EMOJI, type Emotion } from '../lib/emotionDetect';

const DEFAULT_THEME_COLOR = '#f59e0b'; // matches the app's existing amber accent
// A curated subset of the full emotion set - keeps the creation form usable.
// Any emotion not uploaded here simply falls back to the default portrait.
const OPTIONAL_EMOTION_SLOTS: Emotion[] = ['happy', 'sad', 'angry', 'surprised'];

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
  const [emotionPortraits, setEmotionPortraits] = useState<Partial<Record<Emotion, string>>>({});
  const [emotionError, setEmotionError] = useState<string | null>(null);
  const [showEmotionSlots, setShowEmotionSlots] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>('');
  const [voiceLang, setVoiceLang] = useState<string>('');
  const [voicePitch, setVoicePitch] = useState(1);
  const [voiceRate, setVoiceRate] = useState(1);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showVoiceStudioHelp, setShowVoiceStudioHelp] = useState(false);
  const [showEmotionSlotsHelp, setShowEmotionSlotsHelp] = useState(false);
  const [showForkHelp, setShowForkHelp] = useState(false);
  const [voiceAnalysisResult, setVoiceAnalysisResult] = useState<VoiceAnalysisResult | null>(null);
  const [voiceAnalysisError, setVoiceAnalysisError] = useState<string | null>(null);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const voiceSampleInputRef = useRef<HTMLInputElement>(null);
  const voicePackageInputRef = useRef<HTMLInputElement>(null);
  const [voicePackageError, setVoicePackageError] = useState<string | null>(null);

  useEffect(() => {
    if (isVoiceSupported()) {
      getAvailableVoices().then(setAvailableVoices);
    }
  }, []);

  const handleVoiceSampleFile = async (file: File | undefined) => {
    setVoiceAnalysisError(null);
    setVoiceAnalysisResult(null);
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setVoiceAnalysisError('Please choose an audio file.');
      return;
    }
    setIsAnalyzingVoice(true);
    try {
      const result = await analyzeVoiceSample(file);
      setVoiceAnalysisResult(result);
      if (result.confidence === 'low' && !result.estimatedPitchHz && !result.estimatedSyllablesPerSec) {
        setVoiceAnalysisError("Couldn't detect clear speech in this clip — try a longer or clearer sample.");
      }
    } catch (err) {
      console.warn('[CharacterSelect] Voice analysis failed:', err);
      setVoiceAnalysisError('Analysis failed. Try a different audio file.');
    } finally {
      setIsAnalyzingVoice(false);
    }
  };

  const handleVoicePackageFile = async (file: File | undefined) => {
    setVoicePackageError(null);
    if (!file) return;
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      setVoicePackageError('Please choose a .json voice package file.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseVoicePackage(text);
      if (!parsed) {
        setVoicePackageError("That file doesn't look like a valid voice package.");
        return;
      }
      setVoiceName(parsed.voiceName || '');
      setVoiceLang(parsed.lang || '');
      setVoicePitch(parsed.pitch);
      setVoiceRate(parsed.rate);
    } catch (err) {
      console.warn('[CharacterSelect] Voice package import failed:', err);
      setVoicePackageError('Could not read that file.');
    }
  };

  useEffect(() => {
    const refresh = () => setSaved(listCharacters());
    refresh();
    window.addEventListener('charactersUpdated', refresh);
    return () => window.removeEventListener('charactersUpdated', refresh);
  }, []);

  const handleUseSaved = (character: SavedCharacter) => {
    onSelect(`personality:${character.behavior}:${character.name}:${character.id}`);
  };

  const handlePortraitFile = async (file: File | undefined) => {
    setPortraitError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPortraitError('Please choose an image file.');
      return;
    }
    const dataUrl = await compressPortrait(file, PORTRAIT_MAX_KB * 1000);
    if (!dataUrl) {
      setPortraitError(`Image is too large and couldn't be compressed enough (max ${PORTRAIT_MAX_KB}KB). Try a different image.`);
      return;
    }
    setPortraitDataUrl(dataUrl);
  };

  const handleEmotionSlotFile = async (emotion: Emotion, file: File | undefined) => {
    setEmotionError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEmotionError('Please choose an image file.');
      return;
    }
    const dataUrl = await compressPortrait(file, EMOTION_PORTRAIT_MAX_KB * 1000);
    if (!dataUrl) {
      setEmotionError(`Image is too large and couldn't be compressed enough (max ${EMOTION_PORTRAIT_MAX_KB}KB). Try a different image.`);
      return;
    }
    setEmotionPortraits(prev => ({ ...prev, [emotion]: dataUrl }));
  };

  // Phase 8 zero-cost fallback tier: one-click generated variants from
  // the base portrait via canvas color filters. Never overwrites a
  // slot the user has already manually uploaded - generated variants
  // only fill in gaps.
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const handleGenerateVariants = async () => {
    if (!portraitDataUrl) return;
    setGeneratingVariants(true);
    try {
      const variants = await generateAllEmotionVariants(portraitDataUrl);
      setEmotionPortraits(prev => ({ ...variants, ...prev }));
    } finally {
      setGeneratingVariants(false);
    }
  };

  const clearEmotionSlot = (emotion: Emotion) => {
    setEmotionPortraits(prev => {
      const next = { ...prev };
      delete next[emotion];
      return next;
    });
  };

  const handlePersonalityStart = async () => {
    const trimmed = characterName.trim();
    if (!trimmed || isFetching) return;

    setIsFetching(true);
    const info = await fetchCharacterInfo(trimmed);
    setIsFetching(false);

    const hasVoiceSettings = voiceName !== '' || voicePitch !== 1 || voiceRate !== 1;
    const voiceSettings: VoiceSettings | undefined = hasVoiceSettings
      ? { voiceName: voiceName || undefined, lang: voiceLang || undefined, pitch: voicePitch, rate: voiceRate }
      : undefined;

    const character = createCharacter({
      name: trimmed,
      behavior,
      summary: info?.summary,
      source: info ? citationTag(info) : 'user-provided',
      forkedFrom: forkFromId || undefined,
      seedContext: forkFromId ? seedContext : undefined,
      portraitUrl: portraitDataUrl || undefined,
      emotionPortraits: Object.keys(emotionPortraits).length > 0 ? emotionPortraits : undefined,
      themeColor: themeColor !== DEFAULT_THEME_COLOR ? themeColor : undefined,
      voiceSettings,
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
                  <p className="text-xs text-cyan-300 flex items-center gap-1.5">
                    Forking from <span className="font-medium">{forkSource.name}</span> — this creates a brand new character.
                    <button
                      type="button"
                      onClick={() => setShowForkHelp(true)}
                      title="Why fork instead of edit?"
                      className="text-cyan-500/70 hover:text-teal-300 transition-colors shrink-0"
                    >
                      <HelpCircle size={12} />
                    </button>
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

            {/* Optional per-emotion portrait slots */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowEmotionSlots(v => !v)}
                  className="text-xs text-slate-500 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  {showEmotionSlots ? '\u2212' : '+'} Add emotion-specific art (optional)
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmotionSlotsHelp(true)}
                  title="What is this?"
                  className="text-slate-500 hover:text-teal-300 transition-colors"
                >
                  <HelpCircle size={13} />
                </button>
              </div>
              {showEmotionSlots && portraitDataUrl && (
                <button
                  onClick={handleGenerateVariants}
                  disabled={generatingVariants}
                  title="Fills empty slots with tinted variants of your base photo — a quick color/mood shift, not a redrawn expression. Won't overwrite anything you've already uploaded."
                  className="ml-3 text-xs text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {generatingVariants ? 'Generating…' : '✨ Fill gaps from base photo'}
                </button>
              )}
              {showEmotionSlots && (
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {OPTIONAL_EMOTION_SLOTS.map(emo => (
                    <div key={emo} className="text-center">
                      <label className="relative block w-full aspect-square rounded-lg border border-dashed border-slate-600 hover:border-amber-400 cursor-pointer transition-colors overflow-hidden bg-slate-900/70">
                        {emotionPortraits[emo] ? (
                          <img src={emotionPortraits[emo]} alt={emo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {EMOTION_EMOJI[emo]}
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleEmotionSlotFile(emo, e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-[9px] text-slate-500 capitalize">{emo}</span>
                        {emotionPortraits[emo] && (
                          <button onClick={() => clearEmotionSlot(emo)} className="text-slate-500 hover:text-red-400">
                            <X size={9} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {emotionError && (
                <p className="text-[11px] text-red-400 mt-2">{emotionError}</p>
              )}
            </div>

            {/* Voice Studio - optional per-character voice tuning (Web Speech API, $0 cost) */}
            {isVoiceSupported() && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowVoiceStudio(v => !v)}
                    className="text-xs text-slate-500 hover:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    {showVoiceStudio ? '\u2212' : '+'} Set a voice (optional)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoiceStudioHelp(true)}
                    title="How does Voice Studio work?"
                    className="text-slate-500 hover:text-teal-300 transition-colors"
                  >
                    <HelpCircle size={13} />
                  </button>
                </div>
                {showVoiceStudio && (
                  <div className="mt-2.5 bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-3">
                    <div>
                      <span className="text-xs font-medium text-slate-500 mb-1.5 block">System voice</span>
                      <select
                        value={voiceName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setVoiceName(name);
                          const match = availableVoices.find(v => v.name === name);
                          setVoiceLang(match?.lang || '');
                        }}
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      >
                        <option value="">Browser default</option>
                        {availableVoices.map(v => (
                          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-500 mb-1.5 flex justify-between">
                          <span>Pitch</span><span>{voicePitch.toFixed(1)}</span>
                        </span>
                        <input
                          type="range" min={0} max={2} step={0.1}
                          value={voicePitch}
                          onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-500 mb-1.5 flex justify-between">
                          <span>Speed</span><span>{voiceRate.toFixed(1)}</span>
                        </span>
                        <input
                          type="range" min={0.5} max={2} step={0.1}
                          value={voiceRate}
                          onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </label>
                    </div>
                    <button
                      onClick={() => speak(`Hello, I'm ${characterName.trim() || 'your character'}.`, { voiceName: voiceName || undefined, pitch: voicePitch, rate: voiceRate })}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      ▶ Preview voice
                    </button>

                    {/* Voice package export/import - reuse a tuned voice across characters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => downloadVoicePackage({ voiceName: voiceName || undefined, lang: voiceLang || undefined, pitch: voicePitch, rate: voiceRate }, characterName.trim() || undefined)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        ⬇ Export voice
                      </button>
                      <button
                        onClick={() => voicePackageInputRef.current?.click()}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        ⬆ Import voice
                      </button>
                      <input
                        ref={voicePackageInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={(e) => handleVoicePackageFile(e.target.files?.[0])}
                      />
                    </div>
                    {voicePackageError && (
                      <p className="text-[11px] text-red-400">{voicePackageError}</p>
                    )}
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Export saves this voice's settings so you can reuse them on another character. It doesn't install a new voice on any device — just carries the pitch, speed, and voice choice, matched to the closest available voice on import.
                    </p>

                    {/* Analysis-assist: measure a sample, suggest slider values. NOT cloning. */}
                    <div className="pt-2.5 border-t border-slate-700/60">
                      <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                        Have an audio clip of how this character should sound? Upload it and we'll suggest pitch/speed starting points — this doesn't clone the voice, it just estimates and tunes the sliders above.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => voiceSampleInputRef.current?.click()}
                          disabled={isAnalyzingVoice}
                          className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          {isAnalyzingVoice ? 'Analyzing…' : '📎 Upload sample'}
                        </button>
                        <input
                          ref={voiceSampleInputRef}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleVoiceSampleFile(e.target.files?.[0])}
                        />
                      </div>
                      {voiceAnalysisError && (
                        <p className="text-[11px] text-red-400 mt-1.5">{voiceAnalysisError}</p>
                      )}
                      {voiceAnalysisResult && (
                        <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                          <p>
                            Estimated pitch: {voiceAnalysisResult.estimatedPitchHz ? `${Math.round(voiceAnalysisResult.estimatedPitchHz)}Hz` : 'unclear'}
                            {' · '}
                            Estimated pace: {voiceAnalysisResult.estimatedSyllablesPerSec ? `${voiceAnalysisResult.estimatedSyllablesPerSec.toFixed(1)} syll/sec` : 'unclear'}
                            {' · '}
                            <span className="italic">confidence: {voiceAnalysisResult.confidence}</span>
                          </p>
                          <button
                            onClick={() => {
                              setVoicePitch(voiceAnalysisResult.suggestedPitch);
                              setVoiceRate(voiceAnalysisResult.suggestedRate);
                            }}
                            className="text-amber-300 hover:text-amber-200 underline underline-offset-2"
                          >
                            Apply suggested pitch ({voiceAnalysisResult.suggestedPitch.toFixed(1)}) & speed ({voiceAnalysisResult.suggestedRate.toFixed(1)})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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

      {/* Voice Studio help popup */}
      {showVoiceStudioHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setShowVoiceStudioHelp(false)}>
          <div
            className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-teal-400">How Voice Studio works</h3>
              <button onClick={() => setShowVoiceStudioHelp(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300">
              <p className="text-slate-400">
                Voice Studio lets a character speak their replies aloud using your browser's built-in text-to-speech — no external service, no cost. Everything here is optional.
              </p>

              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  <span className="font-semibold text-slate-200">Pick a system voice.</span> This is one of the speech voices already built into your browser/device (not something StageEgo creates) — different browsers and devices offer different voices, so the same character may sound different on your phone vs your laptop.
                </li>
                <li>
                  <span className="font-semibold text-slate-200">Adjust pitch and speed</span> with the sliders to shape how that voice sounds — higher/lower pitch, faster/slower pace.
                </li>
                <li>
                  <span className="font-semibold text-slate-200">Preview</span> to hear the current settings before saving.
                </li>
                <li>
                  <span className="font-semibold text-slate-200">Optional: upload a sample clip.</span> If you have an audio clip of how the character should sound, upload it and StageEgo will suggest starting pitch/speed values based on it. This does NOT clone the voice — it only estimates and pre-fills the sliders above, which you can still adjust.
                </li>
                <li>
                  <span className="font-semibold text-slate-200">Optional: export/import.</span> Export saves this voice's settings (not audio) as a small file, so you can reuse the same pitch/speed/voice choice on a different character later, or share it. Importing on another device matches to the closest available voice there, since exact voice names aren't guaranteed to exist on every browser.
                </li>
              </ol>

              <p className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                None of this is required — a character works fine with no voice set at all, StageEgo just won't read their replies aloud.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emotion-specific art help popup */}
      {showEmotionSlotsHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setShowEmotionSlotsHelp(false)}>
          <div
            className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-teal-400">Emotion-specific art</h3>
              <button onClick={() => setShowEmotionSlotsHelp(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300">
              <p className="text-slate-400">
                By default a character shows one portrait no matter what they're feeling. These slots let you add different art for different emotions (happy, sad, angry, and so on) — when the AI's reply reads as one of those emotions, that portrait shows instead. Every slot is optional; leave any of them blank and the base portrait is used for that emotion.
              </p>

              <div>
                <p className="font-semibold text-slate-200 mb-1.5">Two ways to fill a slot:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <span className="font-semibold text-slate-200">Upload your own art</span> for that specific emotion — click any slot and choose an image.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-200">"✨ Fill gaps from base photo"</span> — a one-click option that generates a variant for every empty slot using your existing base photo. Important: this shifts color and tone (warmer, cooler, darker, more saturated) to suggest a mood — it does NOT redraw the face or change the expression. It's a quick placeholder, not a substitute for real emotion-specific art. It will never overwrite a slot you've filled yourself.
                  </li>
                </ol>
              </div>

              <p className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                You can mix both — some slots with your own uploaded art, others filled by the generator, and some left blank entirely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fork/immutability help popup */}
      {showForkHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setShowForkHelp(false)}>
          <div
            className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-teal-400">Why fork instead of edit?</h3>
              <button onClick={() => setShowForkHelp(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-sm text-slate-300">
              <p>
                Characters in StageEgo are locked once created — you can delete one, but you can't edit its core details (name, personality, behavior mode) afterward.
              </p>
              <p>
                <span className="font-semibold text-slate-200">Forking</span> is how you make a changed version: it creates a brand-new character that starts from the original's details, which you can then adjust before saving. The original character is untouched and still exists separately.
              </p>
              <p>
                <span className="font-semibold text-slate-200">"Paste what to carry over"</span> is optional — if you want the new fork to remember something specific from before (a quote, a fact, a moment), paste just that, not a full chat transcript. Leave it blank for a clean fork with no extra context.
              </p>
              <p className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                This keeps each character's identity stable and predictable over time, rather than quietly drifting after repeated small edits.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
