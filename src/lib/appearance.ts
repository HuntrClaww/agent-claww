// src/lib/appearance.ts
//
// The app-wide appearance engine (Settings > Appearance).
//
// Everything here resolves to CSS custom properties set on <html>, so
// components opt in by referencing a var rather than each needing to
// know about the settings system. One apply function, called on load
// and on every Settings save via the existing 'profileUpdated' event.
//
// Scope, so a future session knows what's deliberate:
//   - mode          : dark / light / OLED (true black)
//   - accent        : 4 presets + a custom two-color pick
//   - background    : animated gradient / aurora / solid
//   - blur          : how frosted glass surfaces are
//   - saturation    : color intensity of the background wash
//   - contrast      : surface separation (how much panels stand out)
//   - glass         : sheen strength, incl. the reflective sweep
//   - motion        : which transition style the UI uses
//
// Deliberately NOT here: user background *images*. That needs an
// upload + storage path (localStorage is already the size bottleneck -
// see the portrait quota issues), so it's its own piece of work.

export interface ThemePalette {
  name: string;
  primary: string;
  secondary: string;
}

export const THEME_PRESETS = {
  teal: { name: 'Midnight Teal', primary: '#14b8a6', secondary: '#06b6d4' },
  purple: { name: 'Neon Purple', primary: '#a855f7', secondary: '#ec4899' },
  sakura: { name: 'Sakura Pink', primary: '#f472b6', secondary: '#f87171' },
  forest: { name: 'Forest Green', primary: '#16a34a', secondary: '#059669' },
} as const satisfies Record<string, ThemePalette>;

export type ThemePresetId = keyof typeof THEME_PRESETS;
export type AccentChoice = ThemePresetId | 'custom';

export type ThemeMode = 'dark' | 'light' | 'oled';
export type BackgroundStyle = 'aurora' | 'gradient' | 'solid';
export type MotionStyle = 'smooth' | 'jelly' | 'fade' | 'none';

export const THEME_MODES: { id: ThemeMode; label: string; hint: string }[] = [
  { id: 'dark', label: 'Dark', hint: 'Deep navy surfaces' },
  { id: 'light', label: 'Light', hint: 'Bright, high legibility' },
  { id: 'oled', label: 'OLED Black', hint: 'True black — saves power on OLED screens' },
];

export const BACKGROUND_STYLES: { id: BackgroundStyle; label: string; hint: string }[] = [
  { id: 'aurora', label: 'Aurora', hint: 'Slow drifting color fields' },
  { id: 'gradient', label: 'Gradient', hint: 'Soft static wash' },
  { id: 'solid', label: 'Solid', hint: 'Flat, no background color' },
];

export const MOTION_STYLES: { id: MotionStyle; label: string; hint: string }[] = [
  { id: 'smooth', label: 'Smooth', hint: 'Gentle ease — the default' },
  { id: 'jelly', label: 'Jelly', hint: 'Soft overshoot, springy' },
  { id: 'fade', label: 'Fade', hint: 'Cross-fade only, no movement' },
  { id: 'none', label: 'Instant', hint: 'No transitions at all' },
];

/** Per-mode surface colors. Kept here rather than in CSS so a single
 *  source of truth drives both the applied vars and the settings preview. */
const MODE_TOKENS: Record<ThemeMode, Record<string, string>> = {
  dark: {
    '--surface-base': '#0f172a',
    '--surface-panel': 'rgba(30, 41, 59, 0.72)',
    '--surface-raised': 'rgba(51, 65, 85, 0.66)',
    '--surface-border': 'rgba(255, 255, 255, 0.10)',
    '--text-primary': '#f1f5f9',
    '--text-muted': '#94a3b8',
    '--glass-tint': 'rgba(255, 255, 255, 0.14)',
    '--glass-tint-soft': 'rgba(255, 255, 255, 0.03)',
    '--glass-edge': 'rgba(255, 255, 255, 0.16)',
    '--glass-sheen': 'rgba(255, 255, 255, 0.25)',
    '--bg-wash-opacity': '0.55',
  },
  light: {
    '--surface-base': '#eef2f8',
    '--surface-panel': 'rgba(255, 255, 255, 0.72)',
    '--surface-raised': 'rgba(255, 255, 255, 0.85)',
    '--surface-border': 'rgba(15, 23, 42, 0.12)',
    '--text-primary': '#0f172a',
    '--text-muted': '#475569',
    '--glass-tint': 'rgba(255, 255, 255, 0.55)',
    '--glass-tint-soft': 'rgba(255, 255, 255, 0.25)',
    '--glass-edge': 'rgba(15, 23, 42, 0.12)',
    '--glass-sheen': 'rgba(255, 255, 255, 0.85)',
    '--bg-wash-opacity': '0.40',
  },
  oled: {
    // True #000 base: on an OLED panel an unlit pixel draws no power,
    // so this is a real battery/contrast win, not just a darker theme.
    '--surface-base': '#000000',
    '--surface-panel': 'rgba(18, 18, 20, 0.80)',
    '--surface-raised': 'rgba(28, 28, 32, 0.78)',
    '--surface-border': 'rgba(255, 255, 255, 0.14)',
    '--text-primary': '#fafafa',
    '--text-muted': '#a1a1aa',
    '--glass-tint': 'rgba(255, 255, 255, 0.10)',
    '--glass-tint-soft': 'rgba(255, 255, 255, 0.02)',
    '--glass-edge': 'rgba(255, 255, 255, 0.18)',
    '--glass-sheen': 'rgba(255, 255, 255, 0.30)',
    '--bg-wash-opacity': '0.30',
  },
};

/** Transition timing per motion style. `--ease` intentionally uses an
 *  overshoot curve for jelly and a plain ease for smooth. */
const MOTION_TOKENS: Record<MotionStyle, Record<string, string>> = {
  smooth: { '--motion-fast': '150ms', '--motion-base': '240ms', '--motion-ease': 'cubic-bezier(0.4, 0, 0.2, 1)', '--motion-lift': '1' },
  jelly: { '--motion-fast': '220ms', '--motion-base': '420ms', '--motion-ease': 'cubic-bezier(0.34, 1.56, 0.64, 1)', '--motion-lift': '1' },
  fade: { '--motion-fast': '160ms', '--motion-base': '260ms', '--motion-ease': 'ease', '--motion-lift': '0' },
  none: { '--motion-fast': '0ms', '--motion-base': '0ms', '--motion-ease': 'linear', '--motion-lift': '0' },
};

export interface AppearanceSettings {
  mode: ThemeMode;
  accent: AccentChoice;
  customPrimary: string;
  customSecondary: string;
  background: BackgroundStyle;
  blur: number;        // 0-40 px
  saturation: number;  // 50-200 %
  contrast: number;    // 80-130 %
  glass: number;       // 0-150 % sheen strength
  motion: MotionStyle;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'dark',
  accent: 'teal',
  customPrimary: '#14b8a6',
  customSecondary: '#06b6d4',
  background: 'aurora',
  blur: 16,
  saturation: 120,
  contrast: 100,
  glass: 100,
  motion: 'smooth',
};

const STORAGE_KEY = 'app_appearance_v1';

function isMode(v: unknown): v is ThemeMode { return v === 'dark' || v === 'light' || v === 'oled'; }
function isBackground(v: unknown): v is BackgroundStyle { return v === 'aurora' || v === 'gradient' || v === 'solid'; }
function isMotion(v: unknown): v is MotionStyle { return v === 'smooth' || v === 'jelly' || v === 'fade' || v === 'none'; }
function isAccent(v: unknown): v is AccentChoice { return v === 'custom' || (typeof v === 'string' && v in THEME_PRESETS); }
function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

/** Reads saved settings, field-by-field validated so a partial or
 *  hand-edited localStorage value can't produce an unusable UI. */
export function loadAppearance(): AppearanceSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
  if (!raw) return { ...DEFAULT_APPEARANCE };

  try {
    const p = JSON.parse(raw) as Partial<AppearanceSettings>;
    const d = DEFAULT_APPEARANCE;
    return {
      mode: isMode(p.mode) ? p.mode : d.mode,
      accent: isAccent(p.accent) ? p.accent : d.accent,
      customPrimary: typeof p.customPrimary === 'string' ? p.customPrimary : d.customPrimary,
      customSecondary: typeof p.customSecondary === 'string' ? p.customSecondary : d.customSecondary,
      background: isBackground(p.background) ? p.background : d.background,
      blur: clamp(p.blur, 0, 40, d.blur),
      saturation: clamp(p.saturation, 50, 200, d.saturation),
      contrast: clamp(p.contrast, 80, 130, d.contrast),
      glass: clamp(p.glass, 0, 150, d.glass),
      motion: isMotion(p.motion) ? p.motion : d.motion,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/** Persists settings. Throws on quota so the caller's own try/catch
 *  (SettingsModal's handleSave) surfaces it, matching how every other
 *  setting in that handler behaves. */
export function saveAppearance(settings: AppearanceSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resolveAccent(settings: AppearanceSettings): { primary: string; secondary: string } {
  if (settings.accent === 'custom') {
    return { primary: settings.customPrimary, secondary: settings.customSecondary };
  }
  const preset = THEME_PRESETS[settings.accent];
  return { primary: preset.primary, secondary: preset.secondary };
}

/**
 * Writes every appearance setting to <html> as CSS custom properties
 * plus two marker classes (theme-<mode>, bg-<style>, motion-<style>)
 * that index.css hooks for the things a variable alone can't express -
 * which keyframe animation runs, whether the background layer paints.
 */
export function applyAppearance(settings: AppearanceSettings = loadAppearance()): void {
  const root = document.documentElement;
  const { primary, secondary } = resolveAccent(settings);

  root.style.setProperty('--user-accent', primary);
  root.style.setProperty('--user-accent-secondary', secondary);

  const tokens = MODE_TOKENS[settings.mode];
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }

  const motion = MOTION_TOKENS[settings.motion];
  for (const [key, value] of Object.entries(motion)) {
    root.style.setProperty(key, value);
  }

  root.style.setProperty('--glass-blur', `${settings.blur}px`);
  root.style.setProperty('--bg-saturation', `${settings.saturation}%`);
  root.style.setProperty('--bg-contrast', `${settings.contrast}%`);
  root.style.setProperty('--glass-strength', String(settings.glass / 100));

  root.classList.remove('theme-dark', 'theme-light', 'theme-oled');
  root.classList.add(`theme-${settings.mode}`);

  root.classList.remove('bg-aurora', 'bg-gradient', 'bg-solid');
  root.classList.add(`bg-${settings.background}`);

  root.classList.remove('motion-smooth', 'motion-jelly', 'motion-fade', 'motion-none');
  root.classList.add(`motion-${settings.motion}`);

  // Tailwind's own `dark:` variants key off this class, so keep it in
  // sync - OLED counts as dark for anything still using dark: classes.
  root.classList.toggle('dark', settings.mode !== 'light');

  // Keep the browser chrome (mobile address bar) matching the theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tokens['--surface-base']);
  // Set on <html>, not <body> - see the paint-order note in index.css.
  root.style.backgroundColor = tokens['--surface-base'];
}
