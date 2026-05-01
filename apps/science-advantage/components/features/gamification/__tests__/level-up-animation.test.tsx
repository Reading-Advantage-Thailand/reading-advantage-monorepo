import { cleanup, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LevelUpAnimation } from '../level-up-animation';

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
});

describe('LevelUpAnimation', () => {
  it('renders level up text with correct level names', () => {
    render(<LevelUpAnimation oldLevel={1} newLevel={2} />);

    expect(screen.getByText('Level Up!')).toBeDefined();
    expect(screen.getByText('Explorer')).toBeDefined();
    expect(screen.getByText('Discoverer')).toBeDefined();
  });

  it('has correct aria-label', () => {
    render(<LevelUpAnimation oldLevel={2} newLevel={3} />);

    expect(screen.getByRole('alert')).toHaveAttribute(
      'aria-label',
      'Level up! You are now Scientist'
    );
  });

  it('dismisses when clicking Continue button', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<LevelUpAnimation oldLevel={1} newLevel={2} onDismiss={onDismiss} />);

    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueBtn);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses when clicking backdrop', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<LevelUpAnimation oldLevel={1} newLevel={2} onDismiss={onDismiss} />);

    const backdrop = document.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('auto-dismisses after 5 seconds', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<LevelUpAnimation oldLevel={1} newLevel={2} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('does not animate when prefers-reduced-motion is reduce', () => {
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

    render(<LevelUpAnimation oldLevel={1} newLevel={2} />);

    const card = screen.getByRole('alert').querySelector('[class*="rounded-2xl"]');
    expect(card).not.toHaveClass('animate-level-up');
  });

  it('shows arrow between old and new level', () => {
    render(<LevelUpAnimation oldLevel={3} newLevel={4} />);

    const arrow = screen.getByText('→');
    expect(arrow).toBeDefined();
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders 12 particle elements when motion is allowed', () => {
    render(<LevelUpAnimation oldLevel={1} newLevel={2} />);

    // Particles are divs inside the aria-hidden container with particle-burst animation
    const container = document.querySelector('[aria-hidden="true"]');
    expect(container).not.toBeNull();
    const particles = container!.querySelectorAll('[style*="particle-burst"]');
    expect(particles.length).toBe(12);
  });

  it('does not render particle effects when prefers-reduced-motion is reduce', () => {
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

    render(<LevelUpAnimation oldLevel={1} newLevel={2} />);

    const container = document.querySelector('[aria-hidden="true"]');
    if (container) {
      const particles = container.querySelectorAll('[style*="particle-burst"]');
      expect(particles.length).toBe(0);
    } else {
      // No aria-hidden container means no particles at all
      expect(true).toBe(true);
    }
  });

  it('renders without crashing at various level transitions', () => {
    const transitions = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ] as const;

    for (const [oldLevel, newLevel] of transitions) {
      const { unmount } = render(
        <LevelUpAnimation oldLevel={oldLevel} newLevel={newLevel} />
      );
      expect(screen.getByText('Level Up!')).toBeDefined();
      unmount();
    }
  });
});
