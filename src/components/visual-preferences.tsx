import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  applyVisualPreferences,
  defaultVisualPreferences,
  readVisualPreferences,
  type ColorTheme,
  type TextSize,
  type VisualPreferences,
  visualPreferencesStorageKey,
} from '@/features/visual-preferences/preferences';

const colorSchemeQuery = '(prefers-color-scheme: dark)';

export function VisualPreferencesControl() {
  const [preferences, setPreferences] = useState<VisualPreferences>(() =>
    typeof window === 'undefined'
      ? defaultVisualPreferences
      : readVisualPreferences(window.localStorage),
  );

  useEffect(() => {
    const media = window.matchMedia?.(colorSchemeQuery);
    const apply = () =>
      applyVisualPreferences(preferences, document.documentElement, media?.matches ?? false);
    apply();
    window.localStorage.setItem(visualPreferencesStorageKey, JSON.stringify(preferences));
    media?.addEventListener('change', apply);
    return () => media?.removeEventListener('change', apply);
  }, [preferences]);

  const update = (change: Partial<VisualPreferences>) =>
    setPreferences((current) => ({ ...current, ...change }));

  return (
    <details className="visual-preferences relative">
      <summary
        aria-label="Aparência"
        className="button-base button-outline cursor-pointer list-none px-3 py-2"
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span aria-hidden="true" className="hidden sm:inline">
          Aparência
        </span>
      </summary>
      <div className="dialog-surface absolute right-0 top-full z-30 mt-2 w-72 space-y-5 p-5">
        <fieldset>
          <legend className="mb-2 font-semibold">Tema</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['system', 'Sistema'],
                ['light', 'Claro'],
                ['dark', 'Escuro'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="color-theme"
                  value={value}
                  checked={preferences.theme === value}
                  onChange={() => update({ theme: value as ColorTheme })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">
          Tamanho do texto
          <select
            className="field font-normal"
            value={preferences.textSize}
            onChange={(event) => update({ textSize: event.target.value as TextSize })}
          >
            <option value="default">Padrão</option>
            <option value="large">Ampliado</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={preferences.highContrast}
            onChange={(event) => update({ highContrast: event.target.checked })}
          />
          <span>
            <strong className="block">Contraste reforçado</strong>Acentua contornos e foco.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(event) => update({ reducedMotion: event.target.checked })}
          />
          <span>
            <strong className="block">Reduzir movimentos</strong>Desativa animações e transições.
          </span>
        </label>
      </div>
    </details>
  );
}
