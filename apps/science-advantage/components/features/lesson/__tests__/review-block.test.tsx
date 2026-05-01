import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewBlock } from '../blocks/review-block';
import type { ReviewBlock as ReviewBlockType } from '@/lib/schemas/lesson-content.schema';

afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })));

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

const createReviewBlock = (overrides?: Partial<ReviewBlockType>): ReviewBlockType => ({
  id: 'review-1',
  type: 'review',
  title: 'Unit Review',
  titleThai: 'ทบทวนหน่วย',
  questions: [
    { questionId: 'q1', text: 'What is photosynthesis?', textThai: 'การสังเคราะห์ด้วยแสงคืออะไร?' },
    { questionId: 'q2', text: 'What do plants need to survive?', textThai: 'พืชต้องการอะไรเพื่อความอยู่รอด?' },
    { questionId: 'q3', text: 'Name three types of habitats.', textThai: 'บอกถิ่นที่อยู่ 3 ประเภท' },
  ],
  ...overrides,
});

describe('ReviewBlock', () => {
  describe('Rendering', () => {
    it('renders the review title', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      expect(screen.getByText('Unit Review')).toBeInTheDocument();
    });

    it('renders all questions', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      expect(screen.getByText(/What is photosynthesis/)).toBeInTheDocument();
      expect(screen.getByText(/What do plants need to survive/)).toBeInTheDocument();
      expect(screen.getByText(/Name three types of habitats/)).toBeInTheDocument();
    });

    it('renders question numbers', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      expect(screen.getByText('Q1.')).toBeInTheDocument();
      expect(screen.getByText('Q2.')).toBeInTheDocument();
      expect(screen.getByText('Q3.')).toBeInTheDocument();
    });

    it('renders reveal buttons for each question', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      const revealButtons = screen.getAllByRole('button', { name: /Reveal answer for question/ });
      expect(revealButtons).toHaveLength(3);
    });

    it('shows answer count', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      expect(screen.getByText('0 of 3 answers revealed')).toBeInTheDocument();
    });
  });

  describe('Thai Language Support', () => {
    it('shows Thai title when showThai is true', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} showThai={true} />);

      expect(screen.getByText('ทบทวนหน่วย')).toBeInTheDocument();
    });

    it('shows Thai question text when showThai is true', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} showThai={true} />);

      expect(screen.getByText(/การสังเคราะห์ด้วยแสงคืออะไร/)).toBeInTheDocument();
    });
  });

  describe('Answer Reveal', () => {
    it('toggles answer reveal when button is clicked', async () => {
      const user = userEvent.setup();
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      const revealButton = screen.getByRole('button', { name: 'Reveal answer for question 1' });
      await user.click(revealButton);

      // After clicking, the button should now say "Hide"
      expect(screen.getByRole('button', { name: 'Hide answer for question 1' })).toBeInTheDocument();
      expect(screen.getByText('1 of 3 answers revealed')).toBeInTheDocument();
    });

    it('can hide a revealed answer', async () => {
      const user = userEvent.setup();
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      // Reveal
      const revealButton = screen.getByRole('button', { name: 'Reveal answer for question 1' });
      await user.click(revealButton);
      expect(screen.getByRole('button', { name: 'Hide answer for question 1' })).toBeInTheDocument();

      // Hide
      const hideButton = screen.getByRole('button', { name: 'Hide answer for question 1' });
      await user.click(hideButton);
      expect(screen.getByRole('button', { name: 'Reveal answer for question 1' })).toBeInTheDocument();
      expect(screen.getByText('0 of 3 answers revealed')).toBeInTheDocument();
    });

    it('can reveal multiple answers independently', async () => {
      const user = userEvent.setup();
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      // Reveal first
      await user.click(screen.getByRole('button', { name: 'Reveal answer for question 1' }));
      expect(screen.getByText('1 of 3 answers revealed')).toBeInTheDocument();

      // Reveal second
      await user.click(screen.getByRole('button', { name: 'Reveal answer for question 2' }));
      expect(screen.getByText('2 of 3 answers revealed')).toBeInTheDocument();

      // Hide first
      await user.click(screen.getByRole('button', { name: 'Hide answer for question 1' }));
      expect(screen.getByText('1 of 3 answers revealed')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      expect(screen.getByRole('region', { name: 'Review: Unit Review' })).toBeInTheDocument();
    });

    it('has data attributes for testing', () => {
      const block = createReviewBlock();
      render(<ReviewBlock block={block} />);

      const section = screen.getByRole('region', { name: 'Review: Unit Review' });
      expect(section).toHaveAttribute('data-block-type', 'review');
      expect(section).toHaveAttribute('data-block-id', 'review-1');
    });
  });
});
