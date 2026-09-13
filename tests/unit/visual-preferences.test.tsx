import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VisualPreferencesControl } from '@/components/visual-preferences';
import {
  applyVisualPreferences,
  defaultVisualPreferences,
  readVisualPreferences,
  resolveTheme,
  visualPreferencesStorageKey,
} from '@/features/visual-preferences/preferences';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
  document.documentElement.removeAttribute('data-motion');
  document.documentElement.removeAttribute('data-text-size');
});

describe('preferências visuais', () => {
  it('usa preferências seguras quando o valor local é ausente ou inválido', () => {
    expect(readVisualPreferences({ getItem: () => null })).toEqual(defaultVisualPreferences);
    expect(readVisualPreferences({ getItem: () => '{' })).toEqual(defaultVisualPreferences);
  });

  it('valida cada preferência persistida', () => {
    const storage = {
      getItem: (key: string) =>
        key === visualPreferencesStorageKey
          ? JSON.stringify({
              theme: 'light',
              highContrast: true,
              reducedMotion: true,
              textSize: 'large',
            })
          : null,
    };
    expect(readVisualPreferences(storage)).toEqual({
      theme: 'light',
      highContrast: true,
      reducedMotion: true,
      textSize: 'large',
    });
  });

  it('acompanha o sistema e aplica os atributos no documento', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    applyVisualPreferences(
      { theme: 'light', highContrast: true, reducedMotion: true, textSize: 'large' },
      document.documentElement,
      true,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
    expect(document.documentElement).toHaveAttribute('data-text-size', 'large');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('aplica e persiste as escolhas feitas no controle', async () => {
    render(<VisualPreferencesControl />);
    fireEvent.click(screen.getByLabelText('Aparência'));
    fireEvent.click(screen.getByLabelText('Claro'));
    fireEvent.change(screen.getByLabelText('Tamanho do texto'), { target: { value: 'large' } });
    fireEvent.click(screen.getByLabelText(/Contraste reforçado/));
    fireEvent.click(screen.getByLabelText(/Reduzir movimentos/));

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'));
    expect(JSON.parse(window.localStorage.getItem(visualPreferencesStorageKey) ?? '{}')).toEqual({
      theme: 'light',
      highContrast: true,
      reducedMotion: true,
      textSize: 'large',
    });
  });
});
