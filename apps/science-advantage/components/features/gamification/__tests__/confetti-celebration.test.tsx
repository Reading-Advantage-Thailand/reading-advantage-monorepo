import { cleanup, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfettiCelebration } from '../confetti-celebration';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('ConfettiCelebration', () => {
  it('renders nothing when trigger is false', () => {
    render(
      <ConfettiCelebration trigger={false} intensity="medium" />
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders canvas when triggered', () => {
    render(
      <ConfettiCelebration trigger={true} intensity="medium" />
    );
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders reduced motion fallback when prefers-reduced-motion is reduce', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ConfettiCelebration trigger={true} intensity="high" />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Congratulations!');
  });

  it('calls onComplete after timeout in reduced motion mode', async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const onComplete = vi.fn();
    render(
      <ConfettiCelebration trigger={true} intensity="low" onComplete={onComplete} />
    );

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('accepts all intensity levels without error', () => {
    const intensities = ['low', 'medium', 'high'] as const;
    for (const intensity of intensities) {
      const { unmount } = render(
        <ConfettiCelebration trigger={true} intensity={intensity} />
      );
      const canvas = document.querySelector('canvas');
      expect(canvas).not.toBeNull();
      unmount();
    }
  });
});
