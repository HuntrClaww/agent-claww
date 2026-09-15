// src/lib/themePresets.ts
//
// App-wide accent color system (distinct from a character's own
// per-character themeColor in characterStore.ts, which only tints that
// character's own portrait glow/message border). This is the user-level
// choice from Settings > Appearance: either one of four named presets
// pulled straight from VISUAL_NOVEL_UI_SPEC.md's "Advanced Theme System"
// section, or a custom primary/secondary pair picked via a native color
// input (a full spectrum/hue picker, no extra library needed).
//
// Scope note (2026-09-14): this covers the ACCENT colors only - buttons,
// borders, glows, highlights - applied via two CSS custom properties.
// It deliberately does not touch page/message background colors, which
// are hardcoded Tailwind classes across dozens of components; re-theming
// those safely (without breaking text contrast somewhere this sandbox
// can't visually catch) is a separate, larger pass. Background image
// selection is tracked as its own next step.

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
export type ThemeChoice = ThemePresetId | 'custom';

export const DEFAULT_THEME: ThemeChoice = 'teal';

const KEYS = {
  choice: 'app_theme_choice',
  customPrimary: 'app_theme_custom_primary',
  customSecondary: 'app_theme_custom_secondary',
} as const;

export function isThemePresetId(value: string): value is ThemePresetId {
  return value in THEME_PRESETS;
}

/** Reads the saved theme choice + resolved primary/secondary colors. */
export function getActiveThemeColors(): { primary: string; secondary: string } {
  const choice = localStorage.getItem(KEYS.choice) || DEFAULT_THEME;
  if (choice === 'custom') {
    return {
      primary: localStorage.getItem(KEYS.customPrimary) || THEME_PRESETS.teal.primary,
      secondary: localStorage.getItem(KEYS.customSecondary) || THEME_PRESETS.teal.secondary,
    };
  }
  const preset = isThemePresetId(choice) ? THEME_PRESETS[choice] : THEME_PRESETS.teal;
  return { primary: preset.primary, secondary: preset.secondary };
}

/** Applies the saved theme as CSS custom properties on the document root.
 *  Call on load and again after any Settings save (via the existing
 *  'profileUpdated' event), same pattern as App.tsx's dark/light toggle. */
export function applyThemeColors(): void {
  const { primary, secondary } = getActiveThemeColors();
  document.documentElement.style.setProperty('--user-accent', primary);
  document.documentElement.style.setProperty('--user-accent-secondary', secondary);
}

export function getSavedThemeChoice(): ThemeChoice {
  const choice = localStorage.getItem(KEYS.choice);
  if (choice === 'custom' || (choice && isThemePresetId(choice))) return choice as ThemeChoice;
  return DEFAULT_THEME;
}

export function getSavedCustomColors(): { primary: string; secondary: string } {
  return {
    primary: localStorage.getItem(KEYS.customPrimary) || THEME_PRESETS.teal.primary,
    secondary: localStorage.getItem(KEYS.customSecondary) || THEME_PRESETS.teal.secondary,
  };
}

/** Persists a theme choice. Throws on storage failure (e.g. quota) so the
 *  caller's own try/catch (SettingsModal's handleSave) can surface it -
 *  deliberately not swallowed here, matching how the other settings in
 *  that same handler are saved. */
export function saveThemeChoice(choice: ThemeChoice, custom?: { primary: string; secondary: string }): void {
  localStorage.setItem(KEYS.choice, choice);
  if (choice === 'custom' && custom) {
    localStorage.setItem(KEYS.customPrimary, custom.primary);
    localStorage.setItem(KEYS.customSecondary, custom.secondary);
  }
}
