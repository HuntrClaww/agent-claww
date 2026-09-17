// src/components/VoiceLab.tsx
//
// The interactive front-end for voiceFX.ts + voiceStorage.ts, covering
// the pipeline Arthur asked for: upload/record -> analyze -> auto-match
// -> tweak -> save. See voiceFX.ts's header for what "auto-match" is
// honestly capable of (not cloning) and voiceStorage.ts's header for
// what "save" honestly means right now (this device, not cloud sync).
//
// SCOPE NOTE, worth stating plainly rather than discovering later: this
// processes a RECORDED OR UPLOADED clip into a saveable, playable
// result. It does not make the in-chat spoken voice route through these
// effects - the browser's speechSynthesis output can't be intercepted
// or captured for post-processing (no captureStream/raw-PCM handoff
// exists on it), which is a platform limitation, not a gap in this
// build. Voice Lab is a real, standalone way to design and audition a
// character's vocal identity as an actual audio clip - useful for a
// voice-lines soundboard, an intro clip, or just creative exploration -
// not (yet) a way to change what the character sounds like mid-chat.

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, Square, Upload as UploadIcon, Play, Pause, Save, Download, Wand2, Trash2, AlertCircle } from 'lucide-react';
import { Section, Row, Slider, Toggle } from './SettingsControls';
import { analyzeVoiceSample, type VoiceAnalysisResult } from '../lib/voiceAnalysis';
import {
  applyVoiceFX, floatToWav, resampleLinear, VOICE_FX_PRESETS,
  DEFAULT_VOICE_FX_PARAMS, type VoiceFXParams, type VoiceFXPresetId,
} from '../lib/voiceFX';
import {
  saveVoiceProfile, listVoiceProfiles, deleteVoiceProfile, exportVoiceProfile,
  parseVoiceProfileFile, estimateStorage, type VoiceProfile,
} from '../lib/voiceStorage';

const WORKING_SAMPLE_RATE = 22050; // enough for speech, keeps storage/processing light
const MAX_CLIP_SECONDS = 20;

interface DecodedClip { pcm: Float32Array; sampleRate: number; }

async function decodeFileToMono(file: File | Blob, targetRate: number): Promise<DecodedClip> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    let mono: Float32Array;
    if (decoded.numberOfChannels === 1) {
      mono = decoded.getChannelData(0).slice();
    } else {
      const ch0 = decoded.getChannelData(0);
      const ch1 = decoded.getChannelData(1);
      mono = new Float32Array(ch0.length);
      for (let i = 0; i < ch0.length; i++) mono[i] = (ch0[i] + ch1[i]) / 2;
    }
    const capped = mono.length > decoded.sampleRate * MAX_CLIP_SECONDS
      ? mono.slice(0, Math.round(decoded.sampleRate * MAX_CLIP_SECONDS))
      : mono;
    const resampled = resampleLinear(capped, decoded.sampleRate, targetRate);
    return { pcm: resampled, sampleRate: targetRate };
  } finally {
    ctx.close();
  }
}

function suggestPresets(analysis: VoiceAnalysisResult): { preset: VoiceFXPresetId; reason: string }[] {
  const pitch = analysis.estimatedPitchHz;
  if (!pitch) return [];
  if (pitch < 130) {
    return [
      { preset: 'deepVillain', reason: `Your sample's pitch (~${Math.round(pitch)}Hz) is already on the low side - this leans into it` },
      { preset: 'giant', reason: 'Pushes that same low pitch further, plus size' },
    ];
  }
  if (pitch > 220) {
    return [
      { preset: 'chipmunk', reason: `Your sample's pitch (~${Math.round(pitch)}Hz) is already fairly high - this leans into it` },
      { preset: 'ghost', reason: 'Keeps a lighter pitch but adds distance and air' },
    ];
  }
  return [
    { preset: 'telephone', reason: `Your sample's pitch (~${Math.round(pitch)}Hz) is fairly central - a texture effect often reads better than a pitch push here` },
    { preset: 'robot', reason: 'Same reasoning - texture over pitch for a mid-range voice' },
  ];
}

export default function VoiceLab({ characterId, characterName, onClose }: {
  characterId: string | null;
  characterName?: string;
  onClose: () => void;
}) {
  const [clip, setClip] = useState<DecodedClip | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [fxParams, setFxParams] = useState<VoiceFXParams>(DEFAULT_VOICE_FX_PARAMS);
  const [processedPcm, setProcessedPcm] = useState<Float32Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoPreview, setAutoPreview] = useState(true);

  const [profileName, setProfileName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<VoiceProfile[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usedMB: number; quotaMB: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentUrlRef = useRef<string | null>(null);

  // Load this character's saved profiles + a storage estimate on open.
  useEffect(() => {
    listVoiceProfiles(characterId).then(setSavedProfiles).catch(() => setSavedProfiles([]));
    estimateStorage().then(setStorageInfo);
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeVoiceSample(file);
      setAnalysis(result);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const loadSource = useCallback(async (file: File, label: string) => {
    setDecodeError(null);
    setIsDecoding(true);
    setAnalysis(null);
    setProcessedPcm(null);
    try {
      const decoded = await decodeFileToMono(file, WORKING_SAMPLE_RATE);
      setClip(decoded);
      setSourceLabel(label);
      runAnalysis(file);
    } catch {
      setDecodeError("Couldn't read that as audio — try a different file or recording.");
    } finally {
      setIsDecoding(false);
    }
  }, [runAnalysis]);

  const startRecording = async () => {
    setDecodeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        loadSource(new File([blob], 'recording', { type: blob.type }), 'Recorded clip');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds(s => {
          if (s + 1 >= MAX_CLIP_SECONDS) { stopRecording(); }
          return s + 1;
        });
      }, 1000);
    } catch {
      setDecodeError("Couldn't access the microphone — check your browser's permission for this site.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    loadSource(file, file.name);
  };

  // Re-render the FX preview whenever the source or params change, unless
  // the user turned auto-preview off (e.g. on a slow device, to only
  // process on demand via the Preview button instead).
  useEffect(() => {
    if (!clip || !autoPreview) return;
    setIsProcessing(true);
    const t = window.setTimeout(() => {
      try {
        const out = applyVoiceFX(clip.pcm, clip.sampleRate, fxParams);
        setProcessedPcm(out);
      } finally {
        setIsProcessing(false);
      }
    }, 30); // yield one tick so the "Processing..." state actually paints first
    return () => window.clearTimeout(t);
  }, [clip, fxParams, autoPreview]);

  const renderNow = () => {
    if (!clip) return;
    setIsProcessing(true);
    window.setTimeout(() => {
      try {
        setProcessedPcm(applyVoiceFX(clip.pcm, clip.sampleRate, fxParams));
      } finally {
        setIsProcessing(false);
      }
    }, 20);
  };

  const playProcessed = () => {
    if (!clip) return;
    const pcm = processedPcm ?? clip.pcm;
    const wav = floatToWav(pcm, clip.sampleRate);
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    const url = URL.createObjectURL(wav);
    currentUrlRef.current = url;
    if (!audioElRef.current) audioElRef.current = new Audio();
    audioElRef.current.src = url;
    audioElRef.current.onended = () => setIsPlaying(false);
    audioElRef.current.play();
    setIsPlaying(true);
  };

  const stopPlaying = () => {
    audioElRef.current?.pause();
    setIsPlaying(false);
  };

  const handleSave = async () => {
    if (!clip) return;
    setSaveError(null);
    setSaveOk(false);
    const pcm = processedPcm ?? clip.pcm;
    const profile: VoiceProfile = {
      id: `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      characterId,
      name: profileName.trim() || sourceLabel || 'Untitled voice',
      sampleRate: clip.sampleRate,
      pcm,
      fxParams,
      createdAt: Date.now(),
    };
    try {
      await saveVoiceProfile(profile);
      setSaveOk(true);
      setSavedProfiles(await listVoiceProfiles(characterId));
      estimateStorage().then(setStorageInfo);
    } catch (err) {
      setSaveError(
        err instanceof Error && /abort|quota/i.test(err.message)
          ? 'Storage is full — try deleting an older saved voice, then save again.'
          : "Couldn't save that voice — please try again."
      );
    }
  };

  const handleExport = (profile: VoiceProfile) => {
    const blob = exportVoiceProfile(profile);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/[^a-z0-9_-]+/gi, '_') || 'voice'}.stageego-voice.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProfile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseVoiceProfileFile(text);
    if (!parsed) { setSaveError('That file doesn\'t look like a valid exported voice.'); return; }
    setClip({ pcm: parsed.pcm, sampleRate: parsed.sampleRate });
    setSourceLabel(parsed.name);
    setFxParams(parsed.fxParams);
    setProfileName(parsed.name);
    setAnalysis(null);
  };

  const handleDeleteProfile = async (id: string) => {
    await deleteVoiceProfile(id);
    setSavedProfiles(await listVoiceProfiles(characterId));
  };

  const suggestions = analysis ? suggestPresets(analysis) : [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
      <div className="glass-panel border rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Wand2 size={18} style={{ color: 'var(--user-accent)' }} />
            Voice Lab{characterName ? ` — ${characterName}` : ''}
          </h2>
          <button onClick={onClose} aria-label="Close Voice Lab" className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-5 flex-1">
          {/* Stage 1: Upload / Record */}
          <Section title="1 · UPLOAD OR RECORD" icon={<Mic size={14} />}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="glass-surface flex items-center gap-1.5 text-[12px] text-slate-200 rounded-lg px-3 py-1.5"
                >
                  <Mic size={13} /> Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 text-[12px] text-white bg-red-500/80 hover:bg-red-500 rounded-lg px-3 py-1.5"
                >
                  <Square size={12} fill="currentColor" /> Stop ({recordSeconds}s)
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-[12px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                <UploadIcon size={13} /> Upload file
              </button>
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
            </div>
            <p className="text-[11px] text-slate-500">Up to {MAX_CLIP_SECONDS}s — a clear few seconds of speech analyzes best.</p>
            {isDecoding && <p className="text-[11px] text-slate-400 mt-1.5">Reading audio…</p>}
            {decodeError && <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{decodeError}</p>}
            {clip && !isDecoding && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--user-accent)' }}>
                ✓ {sourceLabel} loaded ({(clip.pcm.length / clip.sampleRate).toFixed(1)}s)
              </p>
            )}
          </Section>

          {/* Stage 2: Analyze */}
          {clip && (
            <Section title="2 · ANALYZE" icon={<Wand2 size={14} />}>
              {isAnalyzing ? (
                <p className="text-[12px] text-slate-400">Analyzing…</p>
              ) : analysis ? (
                <div className="text-[12px] text-slate-300 space-y-1">
                  <p>Pitch: {analysis.estimatedPitchHz ? `~${Math.round(analysis.estimatedPitchHz)}Hz` : 'unclear'}</p>
                  <p>Pace: {analysis.estimatedSyllablesPerSec ? `~${analysis.estimatedSyllablesPerSec.toFixed(1)} syll/sec` : 'unclear'}</p>
                  <p className="text-slate-500 italic">confidence: {analysis.confidence}</p>
                </div>
              ) : (
                <p className="text-[12px] text-slate-500">No analysis yet.</p>
              )}
            </Section>
          )}

          {/* Stage 3: Auto-match ("Replicator") - honestly framed */}
          {clip && analysis && (
            <Section title="3 · AUTO-MATCH" hint="Suggestions based on your sample's own measurements — not a voice clone" icon={<Wand2 size={14} />}>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                This can't reproduce a specific voice — that needs a trained AI model, which isn't something built into StageEgo. What it can honestly do: measure your sample and suggest which effect below plays to what's already there.
              </p>
              {suggestions.length === 0 ? (
                <p className="text-[11px] text-slate-500">Couldn't get a clear enough pitch reading to suggest anything — try tweaking manually below.</p>
              ) : (
                <div className="space-y-1.5">
                  {suggestions.map(s => (
                    <button
                      key={s.preset}
                      onClick={() => setFxParams(p => ({ ...p, preset: s.preset }))}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        fxParams.preset === s.preset ? 'opt-selected' : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-[12px] text-slate-200 font-medium">{VOICE_FX_PRESETS.find(p => p.id === s.preset)?.label}</span>
                      <span className="block text-[11px] text-slate-500">{s.reason}</span>
                    </button>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Stage 4: Further tweaking */}
          {clip && (
            <Section title="4 · TWEAK" icon={<Wand2 size={14} />}>
              <Row label="Preset" stack control={
                <div className="grid grid-cols-2 gap-1.5">
                  {VOICE_FX_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setFxParams(f => ({ ...f, preset: p.id }))}
                      title={p.hint}
                      className={`text-[11px] px-2 py-1.5 rounded-lg border transition-colors text-left ${
                        fxParams.preset === p.id ? 'opt-selected' : 'border-slate-700 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              } />
              <Row label="Pitch" hint="semitones, on top of the preset" stack control={
                <Slider ariaLabel="Pitch shift semitones" value={fxParams.pitchSemitones} min={-12} max={12} step={1} unit="st" decimals={0}
                  onChange={(v) => setFxParams(f => ({ ...f, pitchSemitones: v }))} />
              } />
              <Row label="Formant" hint="voice 'size' — lower is bigger, on top of the preset" stack control={
                <Slider ariaLabel="Formant shift factor" value={fxParams.formantShiftFactor} min={0.6} max={1.8} step={0.05} unit="x" decimals={2}
                  onChange={(v) => setFxParams(f => ({ ...f, formantShiftFactor: v }))} />
              } />
              <Row label="Intensity" hint="how strongly the preset itself is applied" stack control={
                <Slider ariaLabel="Effect intensity" value={fxParams.intensity} min={0} max={150} step={5} unit="%" decimals={0}
                  onChange={(v) => setFxParams(f => ({ ...f, intensity: v }))} />
              } />
              <Row label="Auto-preview" hint="Process live as sliders move (turn off on a slow device)" control={
                <Toggle ariaLabel="Auto preview" checked={autoPreview} onChange={setAutoPreview} />
              } />

              <div className="flex items-center gap-2 pt-2">
                {!autoPreview && (
                  <button onClick={renderNow} disabled={isProcessing} className="glass-surface text-[12px] text-slate-200 rounded-lg px-3 py-1.5 disabled:opacity-50">
                    {isProcessing ? 'Processing…' : 'Render'}
                  </button>
                )}
                <button
                  onClick={isPlaying ? stopPlaying : playProcessed}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-[12px] rounded-lg px-3 py-1.5 text-slate-900 font-medium disabled:opacity-50"
                  style={{ background: 'var(--user-accent)' }}
                >
                  {isPlaying ? <><Pause size={12} /> Stop</> : <><Play size={12} /> Preview</>}
                </button>
                {isProcessing && autoPreview && <span className="text-[11px] text-slate-500">Processing…</span>}
              </div>
            </Section>
          )}

          {/* Stage 5: Save */}
          {clip && (
            <Section title="5 · SAVE" hint="On this device for now — see note below" icon={<Save size={14} />}>
              <Row label="Name" stack control={
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={sourceLabel || 'e.g. Gruff intro line'}
                  className="w-full bg-slate-900/60 border border-slate-600/70 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-200 focus:outline-none focus:border-slate-400"
                />
              } />
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button onClick={handleSave} className="flex items-center gap-1.5 text-[12px] rounded-lg px-3 py-1.5 text-slate-900 font-medium" style={{ background: 'var(--user-accent)' }}>
                  <Save size={12} /> Save to this device
                </button>
                <button onClick={() => profileFileInputRef.current?.click()} className="flex items-center gap-1.5 text-[12px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg px-3 py-1.5">
                  <UploadIcon size={12} /> Import a saved file
                </button>
                <input ref={profileFileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => handleImportProfile(e.target.files?.[0])} />
              </div>
              {saveOk && <p className="text-[11px] mt-1.5" style={{ color: 'var(--user-accent)' }}>Saved.</p>}
              {saveError && <p className="text-[11px] text-red-400 mt-1.5">{saveError}</p>}
              {storageInfo && storageInfo.usedMB / storageInfo.quotaMB > 0.8 && (
                <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> Storage is {(100 * storageInfo.usedMB / storageInfo.quotaMB).toFixed(0)}% full ({storageInfo.usedMB.toFixed(0)}MB / {storageInfo.quotaMB.toFixed(0)}MB) — consider deleting an older saved voice.
                </p>
              )}
              <p className="text-[11px] text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-700/60">
                "Save" keeps this on this browser, this device — StageEgo doesn't have cloud storage connected yet, so there's no automatic sync to your other devices. "Import a saved file" is the manual way to move a voice to another device today: export it there, bring the file here.
              </p>
            </Section>
          )}

          {/* Saved profiles library */}
          {savedProfiles.length > 0 && (
            <Section title={`SAVED (${savedProfiles.length})`} defaultOpen={false} icon={<Save size={14} />}>
              <div className="space-y-1.5">
                {savedProfiles.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-[12px] text-slate-300 bg-slate-900/30 rounded-lg px-2.5 py-1.5">
                    <span className="flex-1 truncate">{p.name}</span>
                    <button
                      onClick={() => {
                        const wav = floatToWav(p.pcm, p.sampleRate);
                        const url = URL.createObjectURL(wav);
                        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
                        currentUrlRef.current = url;
                        if (!audioElRef.current) audioElRef.current = new Audio();
                        audioElRef.current.src = url;
                        audioElRef.current.play();
                      }}
                      className="text-slate-400 hover:text-slate-200" title="Play"
                    ><Play size={13} /></button>
                    <button onClick={() => handleExport(p)} className="text-slate-400 hover:text-slate-200" title="Export as file"><Download size={13} /></button>
                    <button onClick={() => handleDeleteProfile(p.id)} className="text-slate-400 hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="h-3" />
        </div>
      </div>
    </div>
  );
}
