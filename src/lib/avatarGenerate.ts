/**
 * avatarGenerate.ts
 *
 * Phase 8 avatar generation - fallback chain, richest capability first:
 *   1. Gemini 2.5 Flash Image ("Nano Banana") - tier 1
 *   2. Cloudflare Workers AI - this file adds tier 2
 *   3. Canvas-filter tinting (avatarFilters.ts) - already shipped, always
 *      available regardless of whether tiers 1/2 work
 *
 * Mirrors the existing source-priority pattern in characterFetch.ts
 * (try A -> B -> C, normalize into one result shape) rather than
 * introducing a new architecture.
 *
 * VERIFICATION STATUS - read before trusting this file: both tiers
 * are written strictly against each provider's documented REST format
 * (confirmed via research, multiple independent sources for
 * Cloudflare's endpoint shape specifically). This sandbox has no
 * network path to either provider and no real credentials to test
 * with, so NEITHER tier has been exercised against a live response
 * yet. Treat both as prototypes needing a real-credential smoke test
 * before being relied on - same "not yet device-tested" caveat
 * Phase 6's iOS fix carried until real-device testing happened.
 *
 * IMPORTANT OPEN GAP - flagging honestly rather than glossing over it:
 * Cloudflare Workers AI authenticates with TWO separate values (an
 * Account ID AND an API Token), unlike Gemini/Anthropic/OpenAI which
 * all use a single pasted key. StageEgo's Settings UI currently only
 * has one "API Key" field (see SettingsModal.tsx, shared across all
 * three chat providers). This file's generateAvatarViaCloudflare()
 * therefore takes two separate parameters that have nowhere to be
 * entered in the UI yet - this is a genuine open decision, not
 * something quietly resolved: either add a second Settings field
 * (Cloudflare-only, adds UI complexity), accept a single combined
 * "accountId:token" paste that gets split client-side (simpler UI,
 * slightly unusual UX), or drop Cloudflare from the near-term chain
 * and rely on Gemini + canvas-filter as a 2-tier chain instead. Not
 * resolved in this commit - needs a decision before this tier can
 * actually be wired into any UI.
 */

export interface AvatarGenerationResult {
  dataUrl: string;
  source: 'gemini' | 'cloudflare';
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

const CLOUDFLARE_IMG2IMG_MODEL = 'runwayml/stable-diffusion-v1-5-img2img';

/** Converts a base64 string to a plain byte array, the input shape
 * Cloudflare's image models expect for binary inputs (image/audio). */
function base64ToByteArray(base64: string): number[] {
  const binary = atob(base64);
  const bytes = new Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Converts an ArrayBuffer to a base64 string, for turning a raw
 * binary image response into a data URL. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Generates/transforms an avatar image via Cloudflare Workers AI's
 * image-to-image model, using the user's uploaded base portrait plus
 * a text instruction. Requires TWO separate credentials (see the
 * "IMPORTANT OPEN GAP" note in the file header) - accountId and
 * apiToken are NOT the same thing and both are required.
 *
 * Response shape is handled defensively since it's genuinely
 * unverified: Cloudflare's image models are documented to return raw
 * binary image bytes in some contexts and JSON-wrapped base64 in
 * others depending on model/gateway path, so this checks the
 * Content-Type header and branches accordingly rather than assuming
 * one shape.
 *
 * Returns null (never throws) on any failure, same contract as the
 * Gemini tier, so this can sit at tier 2 in a fallback chain without
 * special-case handling at the call site.
 */
export async function generateAvatarViaCloudflare(
  baseImageDataUrl: string,
  prompt: string,
  accountId: string,
  apiToken: string,
  strength = 0.8
): Promise<AvatarGenerationResult | null> {
  if (!accountId?.trim() || !apiToken?.trim()) return null;

  const split = splitDataUrl(baseImageDataUrl);
  if (!split) {
    console.warn('[avatarGenerate] Base image is not a valid data URL — skipping Cloudflare tier.');
    return null;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/${CLOUDFLARE_IMG2IMG_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image: base64ToByteArray(split.base64),
          strength,
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[avatarGenerate] Cloudflare returned HTTP ${res.status} — falling back to next tier.`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';

    if (contentType.startsWith('image/')) {
      const buffer = await res.arrayBuffer();
      return {
        dataUrl: `data:${contentType};base64,${arrayBufferToBase64(buffer)}`,
        source: 'cloudflare',
      };
    }

    // JSON-wrapped response (gateway path or a model that returns
    // structured output rather than raw bytes).
    const data = await res.json();
    const base64Image: string | undefined = data?.result?.image;
    if (!base64Image) {
      console.warn('[avatarGenerate] Cloudflare response had no recognizable image data — falling back to next tier.');
      return null;
    }
    return {
      dataUrl: `data:image/png;base64,${base64Image}`,
      source: 'cloudflare',
    };
  } catch (err) {
    console.warn('[avatarGenerate] Cloudflare request failed — falling back to next tier:', err);
    return null;
  }
}
