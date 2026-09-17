/**
 * voiceFX.ts
 *
 * A from-scratch digital signal processing engine for reshaping a
 * recorded/uploaded voice clip. Every effect here is a real, documented
 * DSP technique implemented directly - no external audio library, no
 * bundled model, no network call. Everything operates on plain
 * Float32Array PCM data at a given sample rate, with zero dependency on
 * the DOM or Web Audio API - which means the actual math is unit
 * testable in plain Node, not just "looks right in a browser nobody can
 * listen through on this end."
 *
 * WHAT THIS IS NOT: voice cloning. None of this can make a voice sound
 * like a specific real person - that needs a trained neural
 * voice-conversion model (a different category of engineering: a model
 * architecture, a training run or a pretrained checkpoint often
 * hundreds of MB+, and normally server-side GPU inference). Everything
 * below is signal processing - reshaping pitch, timbre, and space - not
 * synthesis of a target identity. See CharacterSelect.tsx's "Auto-match"
 * feature for the honest version of "make this sound like the sample":
 * it analyzes the sample and suggests which of these effects + how much
 * gets closest, it does not fabricate a copy of the speaker.
 */

type F32 = Float32Array<ArrayBufferLike>;

// ============================================================================
// FFT — iterative radix-2 Cooley-Tukey, in-place on separate real/imag arrays.
// Needed for the formant shifter (frequency-domain envelope warping) and for
// fast convolution in the reverb. Sizes must be a power of 2; callers pad.
// ============================================================================

function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error('fft: length must be a power of 2 and re/im must match');
  }
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 1 : -1) * 2 * Math.PI) / len;
    const wRe = Math.cos(ang), wI = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = uRe + vRe;         im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe; im[i + j + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wI;
        const nextIm = curRe * wI + curIm * wRe;
        curRe = nextRe; curIm = nextIm;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ============================================================================
// Windows & framing helpers
// ============================================================================

function hannWindow(size: number): F32 {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  return w;
}

/** Linear-interpolated sample read, for resampling within a buffer. */
function sampleAt(buf: F32, pos: number): number {
  const i0 = Math.floor(pos);
  const i1 = i0 + 1;
  const frac = pos - i0;
  const s0 = i0 >= 0 && i0 < buf.length ? buf[i0] : 0;
  const s1 = i1 >= 0 && i1 < buf.length ? buf[i1] : 0;
  return s0 + (s1 - s0) * frac;
}

function clampBuffer(out: F32): F32 {
  for (let i = 0; i < out.length; i++) {
    if (out[i] > 1) out[i] = 1; else if (out[i] < -1) out[i] = -1;
  }
  return out;
}

// ============================================================================
// Resample — linear-interpolation rate conversion. Used to normalize every
// recorded/uploaded clip onto one fixed working rate regardless of what the
// device's mic or the uploaded file happened to use, which keeps storage
// size predictable and every effect's frequency-dependent tuning (LPC order,
// vocoder bands, filter cutoffs) meaningful across different sources.
// ============================================================================

export function resampleLinear(input: F32, fromRate: number, toRate: number): F32 {
  if (fromRate === toRate) return input.slice();
  const ratio = fromRate / toRate;
  const outLength = Math.round(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) out[i] = sampleAt(input, i * ratio);
  return out;
}

// ============================================================================
// Biquad filter — RBJ Audio EQ Cookbook formulas. Direct Form I, sample by
// sample, so it composes trivially with everything else here (no separate
// Web Audio node graph needed, and it's exactly reproducible frame to frame).
// ============================================================================

export type BiquadType = 'lowpass' | 'highpass' | 'bandpass' | 'peaking' | 'lowshelf' | 'highshelf';

interface BiquadCoeffs { b0: number; b1: number; b2: number; a1: number; a2: number; }

function designBiquad(type: BiquadType, freq: number, sampleRate: number, q = 0.707, gainDb = 0): BiquadCoeffs {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0), sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosW0) / 2; b1 = 1 - cosW0; b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cosW0) / 2; b1 = -(1 + cosW0); b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cosW0; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cosW0; a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const sq = Math.sqrt(A) * alpha * 2;
      b0 = A * ((A + 1) - (A - 1) * cosW0 + sq);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - sq);
      a0 = (A + 1) + (A - 1) * cosW0 + sq;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - sq;
      break;
    }
    case 'highshelf': {
      const sq = Math.sqrt(A) * alpha * 2;
      b0 = A * ((A + 1) + (A - 1) * cosW0 + sq);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - sq);
      a0 = (A + 1) - (A - 1) * cosW0 + sq;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - sq;
      break;
    }
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export function applyBiquad(input: F32, type: BiquadType, freq: number, sampleRate: number, q = 0.707, gainDb = 0): F32 {
  const c = designBiquad(type, freq, sampleRate, q, gainDb);
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

// ============================================================================
// Telephone — bandlimit to the classic phone passband, then a touch of soft
// clipping (tanh waveshaping) for that slightly crunchy compressed quality.
// ============================================================================

export function telephoneEffect(input: F32, sampleRate: number, drive = 1.5): F32 {
  let out = applyBiquad(input, 'highpass', 300, sampleRate, 0.9);
  out = applyBiquad(out, 'lowpass', 3400, sampleRate, 0.9);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * drive) / Math.tanh(drive);
  // The two biquad passes can ring slightly above the pre-filter peak at
  // transients, and tanh(x)/tanh(drive) has supremum 1/tanh(drive) > 1 for
  // any finite drive - so this genuinely can exceed [-1,1] without a final
  // clamp. Found by testing against measured output, not assumed safe
  // just because tanh() itself is bounded.
  return clampBuffer(out);
}

// ============================================================================
// Ring modulation — multiplying by a carrier sine is literally what a ring
// modulator does; the classic robotic/Dalek metallic edge comes straight out
// of the sum/difference frequency sidebands this creates.
// ============================================================================

export function ringModulate(input: F32, sampleRate: number, carrierHz = 45): F32 {
  const out = new Float32Array(input.length);
  const w = (2 * Math.PI * carrierHz) / sampleRate;
  for (let i = 0; i < input.length; i++) out[i] = input[i] * Math.sin(w * i);
  return out;
}

// ============================================================================
// Bitcrusher — quantizes amplitude to N bits and decimates the effective
// sample rate via sample-and-hold, for lo-fi/broken-transmission textures.
// ============================================================================

export function bitcrush(input: F32, bitDepth = 6, sampleRateReduction = 4): F32 {
  const out = new Float32Array(input.length);
  // Signed N-bit PCM has 2^(N-1) magnitude levels on each side of zero
  // (one bit spent on sign) - using 2^N here (as an earlier version did)
  // quantized to roughly double the levels the chosen bit depth implies,
  // measurably undershooting the intended crush. Caught by testing the
  // actual number of distinct output values, not assumed correct from
  // the formula looking reasonable.
  const levels = Math.pow(2, bitDepth - 1);
  let held = 0;
  for (let i = 0; i < input.length; i++) {
    if (i % sampleRateReduction === 0) {
      held = Math.round(input[i] * levels) / levels;
    }
    out[i] = held;
  }
  return out;
}

// ============================================================================
// Granular pitch shift — the classic technique for changing pitch without
// changing duration: cut overlapping windows, resample each one internally
// by the pitch ratio (changing its pitch AND length), then overlap-add them
// back at the ORIGINAL time positions with a Hann window crossfade. Some
// graininess at extreme ratios is an honest property of this technique, the
// same trade-off most simple pitch-shifters make.
// ============================================================================

export function pitchShift(input: F32, ratio: number): F32 {
  if (Math.abs(ratio - 1) < 0.001) return input.slice();
  const grainSize = 2048;
  const hop = grainSize / 4;
  const window = hannWindow(grainSize);
  const out = new Float32Array(input.length);
  const weight = new Float32Array(input.length);

  for (let pos = 0; pos + grainSize < input.length; pos += hop) {
    const grain = new Float32Array(grainSize);
    for (let i = 0; i < grainSize; i++) {
      grain[i] = sampleAt(input, pos + i * ratio) * window[i];
    }
    for (let i = 0; i < grainSize; i++) {
      out[pos + i] += grain[i];
      weight[pos + i] += window[i];
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (weight[i] > 1e-6) out[i] /= weight[i];
  }
  return clampBuffer(out);
}

// ============================================================================
// LPC (Linear Predictive Coding) via Levinson-Durbin — models a short frame
// of speech as a small filter (the vocal tract / formants) driven by a
// simpler excitation source. This is the real technique behind the formant
// shifter below: it's how classic vocoders and formant tools separate "what
// note" from "whose voice."
// ============================================================================

function autocorrelate(frame: F32, maxLag: number): Float64Array {
  const r = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < frame.length - lag; i++) sum += frame[i] * frame[i + lag];
    r[lag] = sum;
  }
  return r;
}

/** Returns LPC coefficients a[1..order] such that
 *  x[n] ≈ sum(a[k] * x[n-k]) for k=1..order (prediction), plus the
 *  residual energy. Standard Levinson-Durbin recursion. */
function levinsonDurbin(r: Float64Array, order: number): { a: Float64Array; error: number } {
  const a = new Float64Array(order + 1);
  let error = r[0] || 1e-9;
  a[0] = 1;
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / error;
    const newA = a.slice(0, i + 1);
    for (let j = 1; j < i; j++) newA[j] = a[j] + k * a[i - j];
    newA[i] = k;
    for (let j = 0; j <= i; j++) a[j] = newA[j];
    error *= 1 - k * k;
    if (error < 1e-9) error = 1e-9;
  }
  return { a, error };
}

/** Frequency response magnitude of the LPC all-pole filter 1/A(z) at `bins`
 *  evenly spaced points from 0 to Nyquist - the estimated formant envelope. */
function lpcEnvelope(a: Float64Array, bins: number): Float64Array {
  const env = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    const w = (Math.PI * k) / bins;
    let reSum = 0, imSum = 0;
    for (let j = 0; j < a.length; j++) {
      reSum += a[j] * Math.cos(-w * j);
      imSum += a[j] * Math.sin(-w * j);
    }
    const mag = Math.sqrt(reSum * reSum + imSum * imSum);
    env[k] = mag > 1e-6 ? 1 / mag : 0;
  }
  return env;
}

// ============================================================================
// Formant shift — per frame: LPC-analyze to get the formant envelope, warp
// that envelope's frequency axis by `factor` (>1 moves formants up / smaller-
// sounding, <1 moves them down / larger-sounding), inverse-filter the frame
// through its OWN envelope to get the excitation residual (the buzz, with
// formants removed), then re-filter that SAME residual through the WARPED
// envelope in the frequency domain via FFT. Overlap-add frames back together.
// This keeps the original pitch while moving the resonances - the actual
// definition of an independent formant shift, not just a pitch shift with
// extra steps.
// ============================================================================

export function formantShift(input: F32, sampleRate: number, factor: number): F32 {
  if (Math.abs(factor - 1) < 0.01) return input.slice();

  const frameSize = 1024;
  const hop = frameSize / 4;
  const fftSize = nextPow2(frameSize * 2);
  const order = Math.min(2 + Math.round(sampleRate / 1000), 32);
  const window = hannWindow(frameSize);

  const out = new Float32Array(input.length);
  const weight = new Float32Array(input.length);

  for (let pos = 0; pos + frameSize < input.length; pos += hop) {
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = input[pos + i] * window[i];

    const r = autocorrelate(frame, order);
    if (r[0] < 1e-9) continue; // silent frame - nothing to warp, leave as gap (overlap-add fills it as ~0)
    const { a } = levinsonDurbin(r, order);

    const bins = fftSize / 2;
    const envelope = lpcEnvelope(a, bins);

    // Warped envelope: envelope'(f) = envelope(f / factor) - stretches
    // (factor>1) or compresses (factor<1) where the resonant peaks sit.
    const warped = new Float64Array(bins);
    for (let k = 0; k < bins; k++) {
      const srcBin = k / factor;
      const i0 = Math.floor(srcBin), i1 = Math.min(bins - 1, i0 + 1);
      const t = srcBin - i0;
      const v0 = i0 >= 0 && i0 < bins ? envelope[i0] : 0;
      const v1 = envelope[i1] ?? 0;
      warped[k] = v0 + (v1 - v0) * t;
    }

    // Inverse-filter: divide out the ORIGINAL envelope to get the residual
    // (source excitation with the formants flattened out), via FFT.
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);
    for (let i = 0; i < frameSize; i++) re[i] = frame[i];
    fft(re, im, false);

    for (let k = 0; k < bins; k++) {
      const origMag = envelope[k] > 1e-6 ? envelope[k] : 1e-6;
      const gain = warped[k] / origMag; // remove original formant shape, apply warped one
      re[k] *= gain; im[k] *= gain;
      if (k > 0 && k < bins) { // mirror for the conjugate-symmetric upper half
        const mIdx = fftSize - k;
        re[mIdx] *= gain; im[mIdx] *= gain;
      }
    }

    fft(re, im, true);
    for (let i = 0; i < frameSize; i++) {
      out[pos + i] += re[i] * window[i];
      weight[pos + i] += window[i] * window[i];
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (weight[i] > 1e-6) out[i] /= weight[i];
  }
  return clampBuffer(out);
}

// ============================================================================
// Band vocoder — splits the input into N frequency bands, follows each
// band's amplitude envelope (rectify + lowpass), and uses that envelope to
// modulate a buzzy sawtooth carrier filtered to the same band. Summing the
// bands back together is literally how a classic channel vocoder produces
// its robotic/synthetic timbre - the carrier supplies a flat, mechanical
// pitch while the input only supplies the "shape" of speech over time.
// ============================================================================

export function vocode(input: F32, sampleRate: number, carrierHz = 110, bandCount = 8): F32 {
  const minF = 200, maxF = 4000;
  const out = new Float32Array(input.length);

  // Sawtooth carrier - rich in harmonics, which is what gives each band
  // something to shape into a buzzy, synthetic texture.
  const carrier = new Float32Array(input.length);
  const period = sampleRate / carrierHz;
  for (let i = 0; i < input.length; i++) {
    carrier[i] = 2 * ((i % period) / period) - 1;
  }

  for (let b = 0; b < bandCount; b++) {
    const t0 = b / bandCount, t1 = (b + 1) / bandCount;
    const centerFreq = minF * Math.pow(maxF / minF, (t0 + t1) / 2);
    const q = 3;

    const inputBand = applyBiquad(input, 'bandpass', centerFreq, sampleRate, q);
    let envelope: F32 = new Float32Array(inputBand.length);
    for (let i = 0; i < envelope.length; i++) envelope[i] = Math.abs(inputBand[i]);
    envelope = applyBiquad(envelope, 'lowpass', 25, sampleRate, 0.707);

    const carrierBand = applyBiquad(carrier, 'bandpass', centerFreq, sampleRate, q);
    for (let i = 0; i < out.length; i++) {
      out[i] += carrierBand[i] * Math.max(0, envelope[i]) * 3;
    }
  }
  return clampBuffer(out);
}

// ============================================================================
// Algorithmic reverb — no impulse-response file needed: exponentially
// decaying, lowpass-filtered white noise IS a plausible room/hall response.
// Convolved via FFT (fast convolution) since a several-second IR would be
// far too slow sample-by-sample.
// ============================================================================

function generateImpulseResponse(sampleRate: number, decaySeconds: number, darkness: number): F32 {
  const len = Math.round(sampleRate * decaySeconds);
  const ir = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    ir[i] = (Math.random() * 2 - 1) * Math.exp(-t / (decaySeconds / 4));
  }
  return applyBiquad(ir, 'lowpass', 8000 / (1 + darkness * 6), sampleRate, 0.6);
}

function fftConvolve(signal: F32, ir: F32): F32 {
  const outLen = signal.length + ir.length - 1;
  const size = nextPow2(outLen);
  const sRe = new Float64Array(size), sIm = new Float64Array(size);
  const iRe = new Float64Array(size), iIm = new Float64Array(size);
  sRe.set(signal); iRe.set(ir);
  fft(sRe, sIm, false); fft(iRe, iIm, false);
  const rRe = new Float64Array(size), rIm = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    rRe[i] = sRe[i] * iRe[i] - sIm[i] * iIm[i];
    rIm[i] = sRe[i] * iIm[i] + sIm[i] * iRe[i];
  }
  fft(rRe, rIm, true);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = rRe[i];
  return out;
}

export function reverb(input: F32, sampleRate: number, mix = 0.35, decaySeconds = 2.2, darkness = 0.5): F32 {
  const ir = generateImpulseResponse(sampleRate, decaySeconds, darkness);
  const wet = fftConvolve(input, ir);
  const out = new Float32Array(input.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = (1 - mix) * input[i] + mix * (wet[i] ?? 0) * 0.6;
  }
  return clampBuffer(out);
}

// ============================================================================
// Chorus — a fractionally-delayed, LFO-modulated copy mixed with the dry
// signal. The constantly drifting delay time is what creates the "more than
// one voice" doubling/shimmer quality.
// ============================================================================

export function chorus(input: F32, sampleRate: number, rateHz = 0.8, depthMs = 4, mix = 0.4): F32 {
  const out = new Float32Array(input.length);
  const baseDelaySamples = (depthMs / 1000) * sampleRate;
  for (let i = 0; i < input.length; i++) {
    const lfo = (Math.sin((2 * Math.PI * rateHz * i) / sampleRate) + 1) / 2;
    const delay = baseDelaySamples * (0.5 + lfo);
    const delayed = sampleAt(input, i - delay);
    out[i] = (1 - mix) * input[i] + mix * delayed;
  }
  return clampBuffer(out);
}

// ============================================================================
// Underwater — heavy lowpass with a slowly wobbling cutoff (the "gurgle"),
// finished with a generous reverb tail for the muffled, enclosed feel.
// ============================================================================

export function underwaterEffect(input: F32, sampleRate: number, intensity = 1): F32 {
  const wobbleHz = 0.6;
  const baseCutoff = 900 - intensity * 400;
  const out = new Float32Array(input.length);
  // Cutoff wobble is approximated by cross-fading two static lowpass passes
  // at the wobble's extremes, weighted by the LFO - cheap and avoids
  // recomputing biquad coefficients every sample.
  const lowA = applyBiquad(input, 'lowpass', Math.max(150, baseCutoff - 200), sampleRate, 0.9);
  const lowB = applyBiquad(input, 'lowpass', baseCutoff + 200, sampleRate, 0.9);
  for (let i = 0; i < input.length; i++) {
    const lfo = (Math.sin((2 * Math.PI * wobbleHz * i) / sampleRate) + 1) / 2;
    out[i] = lowA[i] * (1 - lfo) + lowB[i] * lfo;
  }
  return reverb(out, sampleRate, 0.3, 1.6, 0.8);
}

// ============================================================================
// Named presets — combining the primitives above into one-click characters.
// Each just calls the pieces in sequence; nothing here is a new technique,
// only a tuned recipe.
// ============================================================================

export type VoiceFXPresetId =
  | 'none' | 'telephone' | 'robot' | 'vocoder' | 'underwater'
  | 'ghost' | 'giant' | 'chipmunk' | 'oldRadio' | 'deepVillain';

export const VOICE_FX_PRESETS: { id: VoiceFXPresetId; label: string; hint: string }[] = [
  { id: 'none', label: 'None', hint: 'Just the recording, untouched' },
  { id: 'telephone', label: 'Telephone', hint: 'Bandlimited, slightly crunchy' },
  { id: 'robot', label: 'Robot', hint: 'Metallic ring-modulated edge' },
  { id: 'vocoder', label: 'Vocoder', hint: 'Classic synthetic/mechanical voice' },
  { id: 'underwater', label: 'Underwater', hint: 'Muffled, wobbling, reverberant' },
  { id: 'ghost', label: 'Ghost', hint: 'Airy, distant, trailing' },
  { id: 'giant', label: 'Giant', hint: 'Deep, huge, slow' },
  { id: 'chipmunk', label: 'Chipmunk', hint: 'High, small, quick' },
  { id: 'oldRadio', label: 'Old Radio', hint: 'Narrow, warbly, nostalgic' },
  { id: 'deepVillain', label: 'Deep Villain', hint: 'Lowered, roomy, menacing' },
];

export interface VoiceFXParams {
  preset: VoiceFXPresetId;
  pitchSemitones: number;   // -12 to +12, additional to whatever the preset does
  formantShiftFactor: number; // 0.5 to 2, additional to whatever the preset does
  intensity: number;        // 0-150 (%), scales the preset's own effect strength
}

export const DEFAULT_VOICE_FX_PARAMS: VoiceFXParams = {
  preset: 'none',
  pitchSemitones: 0,
  formantShiftFactor: 1,
  intensity: 100,
};

/** Applies a named preset, then any additional manual pitch/formant tweaks
 *  on top - so "further tweaking" (Arthur's stage 4) always works
 *  regardless of which preset (or none) was chosen in stage 3. */
export function applyVoiceFX(input: F32, sampleRate: number, params: VoiceFXParams): F32 {
  const k = Math.max(0, params.intensity) / 100;
  let out = input;

  switch (params.preset) {
    case 'telephone':
      out = telephoneEffect(out, sampleRate, 1 + k);
      break;
    case 'robot':
      out = ringModulate(out, sampleRate, 40 + 20 * k);
      out = applyBiquad(out, 'highpass', 200, sampleRate);
      break;
    case 'vocoder':
      out = vocode(out, sampleRate, 90 + 40 * k, 8);
      break;
    case 'underwater':
      out = underwaterEffect(out, sampleRate, k);
      break;
    case 'ghost':
      out = pitchShift(out, 1 + 0.08 * k);
      out = applyBiquad(out, 'highpass', 400, sampleRate);
      out = chorus(out, sampleRate, 0.5, 6 * k, 0.5);
      out = reverb(out, sampleRate, 0.3 + 0.3 * k, 3, 0.3);
      break;
    case 'giant':
      out = pitchShift(out, 1 - 0.28 * k);
      out = formantShift(out, sampleRate, 1 - 0.3 * k);
      out = applyBiquad(out, 'lowshelf', 200, sampleRate, 0.7, 6 * k);
      out = reverb(out, sampleRate, 0.25, 2.5, 0.6);
      break;
    case 'chipmunk':
      out = pitchShift(out, 1 + 0.5 * k);
      out = formantShift(out, sampleRate, 1 + 0.35 * k);
      break;
    case 'oldRadio':
      out = telephoneEffect(out, sampleRate, 1.2);
      out = applyBiquad(out, 'peaking', 1500, sampleRate, 1.5, 4 * k);
      out = chorus(out, sampleRate, 5, 1.5 * k, 0.25); // fast/shallow chorus reads as warble/wow-flutter
      break;
    case 'deepVillain':
      out = pitchShift(out, 1 - 0.15 * k);
      out = formantShift(out, sampleRate, 1 - 0.15 * k);
      out = reverb(out, sampleRate, 0.3 * k, 2, 0.6);
      break;
    case 'none':
    default:
      break;
  }

  if (Math.abs(params.pitchSemitones) > 0.01) {
    out = pitchShift(out, Math.pow(2, params.pitchSemitones / 12));
  }
  if (Math.abs(params.formantShiftFactor - 1) > 0.01) {
    out = formantShift(out, sampleRate, params.formantShiftFactor);
  }
  return out;
}

// ============================================================================
// WAV encode/decode — plain 16-bit PCM, mono. Lets the rest of the app treat
// a processed buffer as a normal playable/downloadable file without any
// Web Audio rendering step.
// ============================================================================

export function floatToWav(samples: F32, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
