import { cleanup, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BadgeUnlockAnimation } from '../badge-unlock-animation';
import type { BadgeDefinition } from '@/lib/gamification/badges';

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

const mockBadge: BadgeDefinition = {
  id: 'PERFECT_SCORE',
  name: 'Perfect Score',
  description: 'Score 100% on any quiz',
  icon: 'Trophy',
};

describe('BadgeUnlockAnimation', () => {
  it('renders badge name and description', () => {
    render(<BadgeUnlockAnimation badge={mockBadge} />);

    expect(screen.getByText('Perfect Score')).toBeDefined();
    expect(screen.getByText('Score 100% on any quiz')).toBeDefined();
    expect(screen.getByText('Badge Unlocked!')).toBeDefined();
  });

  it('has correct aria-label', () => {
    render(<BadgeUnlockAnimation badge={mockBadge} />);

    expect(screen.getByRole('alert')).toHaveAttribute(
      'aria-label',
      'Badge unlocked: Perfect Score'
    );
  });

  it('dismisses when clicking dismiss button', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<BadgeUnlockAnimation badge={mockBadge} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    await user.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses when clicking backdrop', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<BadgeUnlockAnimation badge={mockBadge} onDismiss={onDismiss} />);

    const backdrop = document.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('auto-dismisses after 4 seconds', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<BadgeUnlockAnimation badge={mockBadge} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(4000);
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

    render(<BadgeUnlockAnimation badge={mockBadge} />);

    const card = screen.getByRole('alert').querySelector('[class*="rounded-2xl"]');
    expect(card).not.toHaveClass('animate-badge-unlock');
  });

  it('hides content after auto-dismiss', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<BadgeUnlockAnimation badge={mockBadge} onDismiss={onDismiss} />);

    expect(screen.getByText('Perfect Score')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Perfect Score')).toBeNull();
    vi.useRealTimers();
  });
});
