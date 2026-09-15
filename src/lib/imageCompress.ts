/**
 * imageCompress.ts
 *
 * Canvas-based image compression used before portrait uploads.
 * Resizes and quality-reduces an image so it fits under a byte cap,
 * removing the need to reject large photos with a manual error.
 *
 * Strategy:
 *   1. Draw the image onto a canvas at the target max dimension
 *   2. If the source has any transparency, export as PNG (fitting the
 *      size cap by shrinking dimensions, since PNG has no quality knob)
 *      - JPEG has no alpha channel at all, so exporting a transparent
 *      "cutout" portrait as JPEG silently flattens every transparent
 *      pixel to solid black. Found 2026-09-14 testing the VN cutout
 *      redesign: the CSS was correct (object-contain, no card/crop)
 *      but every uploaded portrait still rendered inside a black box,
 *      because it had already lost its alpha channel here, before
 *      CharacterPortrait.tsx ever saw it.
 *   3. Otherwise export as JPEG at decreasing quality until it fits the
 *      cap - meaningfully better compression than PNG for ordinary
 *      (opaque) photos, which is most uploads.
 *   4. If it still doesn't fit after the smallest attempt, return null
 *      (truly too large)
 */

const MAX_DIMENSION = 512;   // px — portrait thumbnails don't need to be bigger
const QUALITY_START = 0.85;  // initial JPEG quality
const QUALITY_STEP  = 0.10;  // reduce by this each attempt
const QUALITY_MIN   = 0.35;  // give up if we get here and still over cap
const MIN_DIMENSION = 64;    // px — floor for PNG dimension-shrink fitting

/**
 * Loads a File into an HTMLImageElement (Promise-based).
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')); };
    img.src = url;
  });
}

/** True if any pixel in the canvas's current content isn't fully opaque. */
function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Compress a portrait image File to fit under `maxBytes`.
 *
 * @param file      - The File from the input element
 * @param maxBytes  - Size cap in bytes (e.g. 500_000 for 500KB)
 * @returns         - A data URL string that fits the cap, or null if
 *                    compression couldn't get it small enough
 */
export async function compressPortrait(file: File, maxBytes: number): Promise<string | null> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return null;
  }

  // Compute scaled dimensions, preserving aspect ratio
  const ratio = Math.min(MAX_DIMENSION / img.naturalWidth, MAX_DIMENSION / img.naturalHeight, 1);
  let w = Math.round(img.naturalWidth  * ratio);
  let h = Math.round(img.naturalHeight * ratio);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  canvas.width  = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  if (hasTransparency(ctx, w, h)) {
    let dataUrl = canvas.toDataURL('image/png');
    while (dataUrl.length > maxBytes && w > MIN_DIMENSION && h > MIN_DIMENSION) {
      w = Math.round(w * 0.85);
      h = Math.round(h * 0.85);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      dataUrl = canvas.toDataURL('image/png');
    }
    return dataUrl.length <= maxBytes ? dataUrl : null;
  }

  let quality = QUALITY_START;
  while (quality >= QUALITY_MIN) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // data URL byte length is a reliable upper bound on the base64-encoded size
    if (dataUrl.length <= maxBytes) return dataUrl;
    quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
  }

  // Final attempt at minimum quality
  const lastAttempt = canvas.toDataURL('image/jpeg', QUALITY_MIN);
  return lastAttempt.length <= maxBytes ? lastAttempt : null;
}
