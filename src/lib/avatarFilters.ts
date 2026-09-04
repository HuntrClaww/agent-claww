/**
 * avatarFilters.ts
 *
 * Phase 8 zero-cost fallback tier: generates per-emotion variants of a
 * single uploaded portrait using canvas color filters (brightness,
 * saturation, hue-rotate, contrast) - no external API, no cost, no
 * network call.
 *
 * HONEST LIMIT - read before using this anywhere in the UI: this
 * cannot change facial expression, pose, or geometry. A canvas filter
 * is a color/tone transform applied uniformly across the whole image -
 * it can make a portrait look colder, warmer, darker, more saturated,
 * etc, which reads as a mood/lighting shift, but the face underneath
 * is pixel-for-pixel the same neutral expression. This is a same-day-
 * usable BASELINE tier, not a substitute for true AI-generated
 * multi-frame art (which can actually redraw the expression) or a
 * live/animated avatar. Fine for a subtle mood cue; don't oversell it
 * in UI copy as "your avatar's face changes" - it's closer to "your
 * avatar's lighting/tone shifts with the mood."
 *
 * Feeds into the existing sparse `emotionPortraits` slot system
 * (characterStore.ts) - a generated variant is just another optional
 * per-emotion portraitUrl entry, so a character can mix real
 * AI-generated frames for some emotions and filter-tinted fallbacks
 * for others.
 */

import type { Emotion } from './emotionDetect';

// Reuses the same output-size discipline as imageCompress.ts, since
// these variants land in the same localStorage-backed emotionPortraits
// map as regular portraits.
const OUTPUT_QUALITY = 0.85;
const OUTPUT_MAX_BYTES = 500_000;
const OUTPUT_QUALITY_MIN = 0.35;
const OUTPUT_QUALITY_STEP = 0.10;

// Filter recipes are deliberately subtle - the goal is a believable
// mood/lighting shift, not a cartoonish color-filter effect. Values
// are CSS filter() function arguments, applied via canvas ctx.filter.
interface FilterRecipe {
  brightness: number; // 1 = unchanged
  saturate: number;   // 1 = unchanged
  hueRotate: number;  // degrees, 0 = unchanged
  contrast: number;   // 1 = unchanged
}

const EMOTION_FILTERS: Partial<Record<Emotion, FilterRecipe>> = {
  happy:       { brightness: 1.12, saturate: 1.25, hueRotate: 0,   contrast: 1.05 },
  sad:         { brightness: 0.85, saturate: 0.55, hueRotate: 200, contrast: 0.95 },
  angry:       { brightness: 0.95, saturate: 1.35, hueRotate: -15, contrast: 1.15 },
  surprised:   { brightness: 1.15, saturate: 1.15, hueRotate: 15,  contrast: 1.08 },
  confused:    { brightness: 0.98, saturate: 0.85, hueRotate: 40,  contrast: 1.0  },
  embarrassed: { brightness: 1.05, saturate: 1.2,  hueRotate: -25, contrast: 1.0  },
  thinking:    { brightness: 0.95, saturate: 0.75, hueRotate: 210, contrast: 1.02 },
  romantic:    { brightness: 1.05, saturate: 1.3,  hueRotate: -30, contrast: 1.0  },
  fearful:     { brightness: 0.8,  saturate: 0.6,  hueRotate: 190, contrast: 1.1  },
  // 'neutral' intentionally has no recipe - it IS the base image, no
  // variant needed.
};

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = dataUrl;
  });
}

function recipeToCssFilter(r: FilterRecipe): string {
  return `brightness(${r.brightness}) saturate(${r.saturate}) hue-rotate(${r.hueRotate}deg) contrast(${r.contrast})`;
}

/**
 * Generates a single emotion variant from a base portrait data URL.
 * Returns null if the emotion has no recipe (e.g. 'neutral' - use the
 * base portrait directly), the image fails to load, or canvas isn't
 * available.
 */
export async function generateEmotionVariant(
  basePortraitDataUrl: string,
  emotion: Emotion
): Promise<string | null> {
  const recipe = EMOTION_FILTERS[emotion];
  if (!recipe) return null;

  let img: HTMLImageElement;
  try {
    img = await loadImageFromDataUrl(basePortraitDataUrl);
  } catch {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.filter = recipeToCssFilter(recipe);
  ctx.drawImage(img, 0, 0);

  let quality = OUTPUT_QUALITY;
  while (quality >= OUTPUT_QUALITY_MIN) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= OUTPUT_MAX_BYTES) return dataUrl;
    quality = Math.round((quality - OUTPUT_QUALITY_STEP) * 100) / 100;
  }
  const lastAttempt = canvas.toDataURL('image/jpeg', OUTPUT_QUALITY_MIN);
  return lastAttempt.length <= OUTPUT_MAX_BYTES ? lastAttempt : null;
}

/**
 * Generates variants for every emotion that has a filter recipe (all
 * except 'neutral'). Returns a sparse map matching the shape of
 * SavedCharacter.emotionPortraits - emotions that fail to generate are
 * simply omitted, not included as null/error entries, so this can be
 * merged directly into an existing emotionPortraits object.
 */
export async function generateAllEmotionVariants(
  basePortraitDataUrl: string
): Promise<Partial<Record<Emotion, string>>> {
  const emotions = Object.keys(EMOTION_FILTERS) as Emotion[];
  const results: Partial<Record<Emotion, string>> = {};

  for (const emotion of emotions) {
    const variant = await generateEmotionVariant(basePortraitDataUrl, emotion);
    if (variant) results[emotion] = variant;
  }

  return results;
}
