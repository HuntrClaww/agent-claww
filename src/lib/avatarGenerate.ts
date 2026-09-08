/**
 * avatarGenerate.ts
 *
 * Phase 8 avatar generation - fallback chain (2-tier):
 *   1. Gemini 2.5 Flash Image ("Nano Banana") - primary tier
 *   2. Canvas-filter tinting (avatarFilters.ts) - always-available fallback
 *
 * Mirrors the existing source-priority pattern in characterFetch.ts
 * (try A -> fallback, normalize into one result shape) rather than
 * introducing a new architecture.
 *
 * VERIFICATION STATUS: Gemini tier is written strictly against Google's
 * documented REST format (confirmed via research). This sandbox has no
 * network path to generativelanguage.googleapis.com and no real
 * credentials to test with, so this is a prototype needing a real-key
 * smoke test before being relied on - same "not yet device-tested"
 * caveat Phase 6's iOS fix carried until real-device testing happened.
 *
 * Cloudflare Workers AI was prototyped but deferred (credential
 * complexity: requires Account ID + API Token vs. single key). If
 * needed later, the code is in git history.
 */

import type { Emotion } from './emotionDetect';
import { generateEmotionVariant } from './avatarFilters';

export interface AvatarGenerationResult {
  dataUrl: string;
  source: 'gemini' | 'canvas-filter';
}

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

/**
 * Splits a data URL into its mime type and base64 payload, as required
 * by Gemini's inline_data format. Returns null if the string isn't a
 * well-formed data URL.
 */
function splitDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

/**
 * Generates/transforms an avatar image via Gemini 2.5 Flash Image,
 * using image-to-image editing: the user's uploaded base portrait plus
 * a text instruction describing the desired transformation.
 *
 * Returns null (never throws) on any failure - missing key, network
 * error, malformed response, or no image in the response - so this
 * can sit as tier 1 in a fallback chain without special-case error
 * handling at the call site.
 */
export async function generateAvatarViaGemini(
  baseImageDataUrl: string,
  prompt: string,
  apiKey: string
): Promise<AvatarGenerationResult | null> {
  if (!apiKey || !apiKey.trim()) return null;

  const split = splitDataUrl(baseImageDataUrl);
  if (!split) {
    console.warn('[avatarGenerate] Base image is not a valid data URL — skipping Gemini tier.');
    return null;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: split.mimeType, data: split.base64 } },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[avatarGenerate] Gemini returned HTTP ${res.status} — falling back to next tier.`);
      return null;
    }

    const data = await res.json();
    const parts: Array<{ inlineData?: { mimeType?: string; data?: string } }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(p => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      console.warn('[avatarGenerate] Gemini response had no image data — falling back to next tier.');
      return null;
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    return {
      dataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
      source: 'gemini',
    };
  } catch (err) {
    console.warn('[avatarGenerate] Gemini request failed — falling back to next tier:', err);
    return null;
  }
}

/**
 * Orchestrator: tries Gemini first, falls back to canvas-filter tinting
 * if Gemini is unavailable/fails. This is the single entry point the
 * UI should call rather than reaching for generateAvatarViaGemini or
 * generateEmotionVariant directly - it normalizes both tiers into one
 * AvatarGenerationResult shape and always resolves (never throws),
 * mirroring the existing source-priority pattern in characterFetch.ts.
 *
 * `emotion` is optional: pass it when generating a mood-specific
 * variant so the canvas-filter fallback has something to key off of.
 * If omitted, or if canvas-filter has no recipe for that emotion (e.g.
 * 'neutral'), and Gemini also failed, this returns null - the caller
 * should fall back to the base portrait itself in that case, since
 * canvas-filter has nothing left to offer.
 */
export async function generateAvatar(
  baseImageDataUrl: string,
  prompt: string,
  apiKey: string,
  emotion?: Emotion
): Promise<AvatarGenerationResult | null> {
  const geminiResult = await generateAvatarViaGemini(baseImageDataUrl, prompt, apiKey);
  if (geminiResult) return geminiResult;

  if (emotion) {
    const variant = await generateEmotionVariant(baseImageDataUrl, emotion);
    if (variant) {
      return { dataUrl: variant, source: 'canvas-filter' };
    }
  }

  return null;
}
