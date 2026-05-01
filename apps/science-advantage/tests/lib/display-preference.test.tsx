import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  DisplayPreferenceProvider,
  useDisplayPreference,
} from '@/contexts/display-preference-context';

function TestConsumer() {
  const { displayPreference, setDisplayPreference, showThai, showEnglish } =
    useDisplayPreference();
  return (
    <div>
      <span data-testid="preference">{displayPreference}</span>
      <span data-testid="show-thai">{String(showThai)}</span>
      <span data-testid="show-english">{String(showEnglish)}</span>
      <button onClick={() => setDisplayPreference('en')}>English</button>
      <button onClick={() => setDisplayPreference('th')}>Thai</button>
      <button onClick={() => setDisplayPreference('side-by-side')}>
        Side by Side
      </button>
    </div>
  );
}

describe('DisplayPreferenceContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to side-by-side for new users', () => {
    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );
    expect(screen.getByTestId('preference')).toHaveTextContent('side-by-side');
  });

  it('persists preference to localStorage', () => {
    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );

    act(() => {
      screen.getByText('English').click();
    });

    expect(screen.getByTestId('preference')).toHaveTextContent('en');
    expect(localStorage.getItem('displayPreference')).toBe('en');
  });

  it('loads saved preference from localStorage on mount', () => {
    localStorage.setItem('displayPreference', 'th');

    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('th');
  });

  it('shows Thai when preference is Thai', () => {
    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );

    act(() => {
      screen.getByText('Thai').click();
    });

    expect(screen.getByTestId('show-thai')).toHaveTextContent('true');
    expect(screen.getByTestId('show-english')).toHaveTextContent('false');
  });

  it('hides Thai when preference is English', () => {
    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );

    act(() => {
      screen.getByText('English').click();
    });

    expect(screen.getByTestId('show-thai')).toHaveTextContent('false');
    expect(screen.getByTestId('show-english')).toHaveTextContent('true');
  });

  it('shows both languages when preference is Side-by-Side', () => {
    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );

    act(() => {
      screen.getByText('Side by Side').click();
    });

    expect(screen.getByTestId('show-thai')).toHaveTextContent('true');
    expect(screen.getByTestId('show-english')).toHaveTextContent('true');
  });

  it('handles invalid localStorage values gracefully', () => {
    localStorage.setItem('displayPreference', 'invalid-value');

    render(
      <DisplayPreferenceProvider>
        <TestConsumer />
      </DisplayPreferenceProvider>
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('side-by-side');
  });
});
