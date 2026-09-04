/**
 * avatarGenerate.ts
 *
 * Phase 8 avatar generation - fallback chain, richest capability first:
 *   1. Gemini 2.5 Flash Image ("Nano Banana") - this file, tier 1
 *   2. Cloudflare Workers AI - not yet built (tier 2)
 *   3. Canvas-filter tinting (avatarFilters.ts) - already shipped, always
 *      available regardless of whether tiers 1/2 work
 *
 * Mirrors the existing source-priority pattern in characterFetch.ts
 * (try A -> B -> C, normalize into one result shape) rather than
 * introducing a new architecture.
 *
 * VERIFICATION STATUS - read before trusting this file: written
 * strictly against Google's documented generateContent image-to-image
 * REST format (contents[].parts[] with inline_data, response
 * candidates[0].content.parts[].inlineData). This sandbox has no
 * network path to generativelanguage.googleapis.com and no real API
 * key to test with, so this has NOT been exercised against a live
 * response yet. Treat this as a prototype needing a real-key smoke
 * test before it's relied on, not as confirmed-working code - same
 * "not yet device-tested" caveat Phase 6's iOS fix carried until
 * real-device testing happened.
 */

export interface AvatarGenerationResult {
  dataUrl: string;
  source: 'gemini'; // will grow to 'gemini' | 'cloudflare' as tier 2 is added
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
