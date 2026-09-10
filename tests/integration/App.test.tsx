import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/app/App';

describe('App', () => {
  it('renders the bootstrap screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /ambiente pronto/i })).toBeInTheDocument();
  });
});
