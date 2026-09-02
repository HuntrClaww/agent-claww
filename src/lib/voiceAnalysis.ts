/**
 * voiceAnalysis.ts
 *
 * Analyzes an uploaded audio snippet to estimate pitch and speaking
 * rate, then suggests Voice Studio pitch/rate slider values that get
 * a character's Web Speech API voice closer to a reference sample.
 *
 * IMPORTANT — what this is and isn't:
 * This is NOT voice cloning. It cannot make the browser's synthetic
 * voice sound like the person in the sample. It measures two rough
 * characteristics of the sample (average pitch, approximate speaking
 * rate) and maps them onto the 0-2 pitch / 0.5-2 rate sliders that
 * Web Speech API already exposes, as a starting point for manual
 * tuning. Rate especially is an approximation — true words-per-minute
 * would require actual speech-to-text, which this does not do.
 *
 * Entirely client-side, zero cost, zero API calls.
 */

// Reference baselines used to normalize measurements onto the slider
// scale. These are rough averages for adult conversational speech,
// not a precise standard.
const BASELINE_PITCH_HZ = 165;      // ~midpoint between typical male/female averages
const BASELINE_SYLLABLES_PER_SEC = 4.4; // ~typical conversational English pace

export interface VoiceAnalysisResult {
  estimatedPitchHz: number | null;      // null if no clear pitch was detected (e.g. silence/noise)
  estimatedSyllablesPerSec: number | null;
  suggestedPitch: number;   // 0 - 2, clamped, ready to drop into VoiceSettings.pitch
  suggestedRate: number;    // 0.5 - 2, clamped, ready to drop into VoiceSettings.rate
  confidence: 'low' | 'medium'; // this is always approximate; never claim 'high'
}

/**
 * Decodes an audio File into an AudioBuffer for analysis.
 */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    ctx.close();
  }
}

/**
 * Autocorrelation-based pitch detection on a single window of audio.
 * Returns the detected fundamental frequency in Hz, or -1 if no clear
 * periodicity was found (silence, noise, or below the RMS threshold).
 *
 * This is a standard, compact autocorrelation pitch detector - not
 * novel, but well-suited to a single-voice snippet with modest noise.
 */
function autoCorrelatePitch(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;

  // Skip windows that are essentially silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < threshold) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  }

  const trimmed = buf.slice(r1, r2);
  const trimmedSize = trimmed.length;
  if (trimmedSize < 2) return -1;

  const c = new Array(trimmedSize).fill(0);
  for (let lag = 0; lag < trimmedSize; lag++) {
    for (let i = 0; i < trimmedSize - lag; i++) {
      c[lag] += trimmed[i] * trimmed[i + lag];
    }
  }

  let d = 0;
  while (d < trimmedSize - 1 && c[d] > c[d + 1]) d++;

  let maxVal = -1, maxPos = -1;
  for (let i = d; i < trimmedSize; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  }
  if (maxPos <= 0) return -1;

  const t0 = maxPos;
  // Parabolic interpolation around the peak for sub-sample accuracy
  const x1 = c[t0 - 1] ?? c[t0];
  const x2 = c[t0];
  const x3 = c[t0 + 1] ?? c[t0];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const refinedT0 = a ? t0 - b / (2 * a) : t0;

  const frequency = sampleRate / refinedT0;
  // Human voice fundamental frequency realistically falls in ~70-400Hz
  if (frequency < 60 || frequency > 500) return -1;
  return frequency;
}

/**
 * Estimates average pitch across an AudioBuffer by running
 * autocorrelation on successive overlapping windows and taking the
 * median of the valid detections (median is more robust to outlier
 * windows than a mean).
 */
function estimateAveragePitch(audioBuffer: AudioBuffer): number | null {
  const channel = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = 2048;
  const hop = 1024;

  const detections: number[] = [];
  for (let start = 0; start + windowSize < channel.length; start += hop) {
    const window = channel.subarray(start, start + windowSize);
    const pitch = autoCorrelatePitch(window as Float32Array, sampleRate);
    if (pitch > 0) detections.push(pitch);
  }

  if (detections.length === 0) return null;
  detections.sort((a, b) => a - b);
  return detections[Math.floor(detections.length / 2)];
}

/**
 * Estimates approximate speaking rate as syllable-like pulses per
 * second, using the amplitude envelope of the signal. This counts
 * energy peaks (rough proxy for syllable nuclei) spaced at least
 * ~120ms apart, then divides by the sample's duration.
 *
 * This is a coarse approximation, not a transcription-based rate.
 */
function estimateSyllableRate(audioBuffer: AudioBuffer): number | null {
  const channel = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  if (duration < 0.5) return null; // too short to estimate a meaningful rate

  // Compute a smoothed RMS envelope in ~20ms frames
  const frameSize = Math.round(sampleRate * 0.02);
  const frameCount = Math.floor(channel.length / frameSize);
  const envelope: number[] = [];
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const s = channel[start + i];
      sum += s * s;
    }
    envelope.push(Math.sqrt(sum / frameSize));
  }
  if (envelope.length === 0) return null;

  const maxEnv = Math.max(...envelope);
  if (maxEnv < 0.01) return null; // essentially silent sample

  const threshold = maxEnv * 0.35;
  const minFrameGap = Math.round(0.12 / 0.02); // ~120ms minimum gap between peaks

  let peakCount = 0;
  let lastPeakFrame = -minFrameGap;
  for (let f = 1; f < envelope.length - 1; f++) {
    const isLocalPeak = envelope[f] > threshold && envelope[f] >= envelope[f - 1] && envelope[f] >= envelope[f + 1];
    if (isLocalPeak && f - lastPeakFrame >= minFrameGap) {
      peakCount++;
      lastPeakFrame = f;
    }
  }

  if (peakCount === 0) return null;
  return peakCount / duration;
}

/**
 * Analyzes an uploaded audio file and returns suggested Voice Studio
 * pitch/rate slider values. Never throws for a bad/silent sample —
 * returns nulls for what couldn't be measured and defaults (1, 1)
 * for the suggested values in that case, so the caller can always
 * safely apply the result.
 */
export async function analyzeVoiceSample(file: File): Promise<VoiceAnalysisResult> {
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decodeAudioFile(file);
  } catch (err) {
    console.warn('[voiceAnalysis] Could not decode audio file:', err);
    return {
      estimatedPitchHz: null,
      estimatedSyllablesPerSec: null,
      suggestedPitch: 1,
      suggestedRate: 1,
      confidence: 'low',
    };
  }

  const pitchHz = estimateAveragePitch(audioBuffer);
  const syllableRate = estimateSyllableRate(audioBuffer);

  const suggestedPitch = pitchHz
    ? Math.min(2, Math.max(0, 1 + (pitchHz - BASELINE_PITCH_HZ) / BASELINE_PITCH_HZ))
    : 1;
  const suggestedRate = syllableRate
    ? Math.min(2, Math.max(0.5, syllableRate / BASELINE_SYLLABLES_PER_SEC))
    : 1;

  return {
    estimatedPitchHz: pitchHz,
    estimatedSyllablesPerSec: syllableRate,
    suggestedPitch: Math.round(suggestedPitch * 10) / 10,
    suggestedRate: Math.round(suggestedRate * 10) / 10,
    // 'medium' only when both signals were measurable from a long-enough
    // sample; otherwise 'low' — this never claims to be exact.
    confidence: pitchHz && syllableRate && audioBuffer.duration >= 2 ? 'medium' : 'low',
  };
}
