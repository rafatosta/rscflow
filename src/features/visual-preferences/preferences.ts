export type ColorTheme = 'system' | 'light' | 'dark';
export type TextSize = 'default' | 'large';

export interface VisualPreferences {
  theme: ColorTheme;
  highContrast: boolean;
  reducedMotion: boolean;
  textSize: TextSize;
}

export const visualPreferencesStorageKey = 'rscflow:visual-preferences';

export const defaultVisualPreferences: VisualPreferences = {
  theme: 'system',
  highContrast: false,
  reducedMotion: false,
  textSize: 'default',
};

export function readVisualPreferences(storage: Pick<Storage, 'getItem'>): VisualPreferences {
  try {
    const value: unknown = JSON.parse(storage.getItem(visualPreferencesStorageKey) ?? 'null');
    if (!value || typeof value !== 'object') return defaultVisualPreferences;
    const candidate = value as Partial<VisualPreferences>;
    return {
      theme: ['system', 'light', 'dark'].includes(candidate.theme ?? '')
        ? (candidate.theme as ColorTheme)
        : 'system',
      highContrast: candidate.highContrast === true,
      reducedMotion: candidate.reducedMotion === true,
      textSize: candidate.textSize === 'large' ? 'large' : 'default',
    };
  } catch {
    return defaultVisualPreferences;
  }
}

export function resolveTheme(theme: ColorTheme, prefersDark: boolean) {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

export function applyVisualPreferences(
  preferences: VisualPreferences,
  root: HTMLElement,
  prefersDark: boolean,
) {
  root.dataset.theme = resolveTheme(preferences.theme, prefersDark);
  root.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
  root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal';
  root.dataset.textSize = preferences.textSize;
}
