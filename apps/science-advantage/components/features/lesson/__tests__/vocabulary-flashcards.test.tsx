import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VocabularyFlashcards } from '../vocabulary-flashcards';
import type { VocabularyTerm } from '@/lib/schemas/lesson-content.schema';

// =============================================================================
// Mock Setup
// =============================================================================

beforeEach(() => {
  // Mock matchMedia for prefers-reduced-motion
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// =============================================================================
// Test Fixtures
// =============================================================================

const createSingleTerm = (): VocabularyTerm => ({
  term: 'Photosynthesis',
  thai: 'การสังเคราะห์ด้วยแสง',
  definition: 'The process by which plants convert sunlight into energy',
});

const createMultipleTerms = (): VocabularyTerm[] => [
  {
    term: 'Photosynthesis',
    thai: 'การสังเคราะห์ด้วยแสง',
    definition: 'The process by which plants convert sunlight into energy',
  },
  {
    term: 'Chlorophyll',
    thai: 'คลอโรฟิลล์',
    definition: 'Green pigment in plants that absorbs light',
  },
  {
    term: 'Glucose',
    thai: 'กลูโคส',
    definition: 'A simple sugar that is the primary source of energy',
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('VocabularyFlashcards', () => {
  describe('Rendering', () => {
    it('renders single term correctly', () => {
      render(<VocabularyFlashcards terms={[createSingleTerm()]} />);

      expect(screen.getByTestId('vocabulary-flashcards')).toBeInTheDocument();
      // Term appears on both front and back of card
      expect(screen.getAllByText('Photosynthesis')).toHaveLength(2);
    });

    it('handles empty terms array', () => {
      render(<VocabularyFlashcards terms={[]} />);

      expect(screen.getByTestId('empty-terms')).toBeInTheDocument();
      expect(screen.getByText('No vocabulary terms available.')).toBeInTheDocument();
    });

    it('carousel mode shows one card at a time', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      expect(screen.getByTestId('vocabulary-flashcards')).toHaveAttribute('data-mode', 'carousel');
      // Only the first term's card should be rendered in carousel
      const flashcards = screen.getAllByTestId('flashcard');
      expect(flashcards).toHaveLength(1);
      // First term visible on the card (front and back)
      expect(screen.getAllByText('Photosynthesis')).toHaveLength(2);
    });

    it('grid mode renders all cards', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="grid" />);

      expect(screen.getByTestId('vocabulary-flashcards')).toHaveAttribute('data-mode', 'grid');
      // All cards rendered
      const flashcards = screen.getAllByTestId('flashcard');
      expect(flashcards).toHaveLength(3);
      // Each term appears twice (front and back)
      expect(screen.getAllByText('Photosynthesis')).toHaveLength(2);
      expect(screen.getAllByText('Chlorophyll')).toHaveLength(2);
      expect(screen.getAllByText('Glucose')).toHaveLength(2);
    });

    it('shows progress indicator with correct count', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      const progress = screen.getByTestId('progress-indicator');
      expect(progress).toHaveTextContent('1 of 3');
    });

    it('Thai visibility controlled by showThai prop', () => {
      const { rerender } = render(
        <VocabularyFlashcards terms={[createSingleTerm()]} showThai={false} />
      );

      // Thai text should not be visible when showThai is false
      expect(screen.queryByText('การสังเคราะห์ด้วยแสง')).not.toBeInTheDocument();

      // Re-render with showThai=true
      rerender(<VocabularyFlashcards terms={[createSingleTerm()]} showThai={true} />);

      // Thai text should now be visible
      expect(screen.getByText('การสังเคราะห์ด้วยแสง')).toBeInTheDocument();
    });
  });

  describe('Card Flipping', () => {
    it('flips card on click', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={[createSingleTerm()]} />);

      const flashcard = screen.getByTestId('flashcard');

      // Initially not flipped
      expect(flashcard).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Click to reveal definition')).toBeInTheDocument();

      // Click to flip
      await user.click(flashcard);

      // Now flipped - definition should be visible
      expect(flashcard).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('The process by which plants convert sunlight into energy')).toBeInTheDocument();
    });

    it('keyboard flip with Enter key', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={[createSingleTerm()]} />);

      const flashcard = screen.getByTestId('flashcard');

      // Focus the card
      flashcard.focus();
      expect(flashcard).toHaveFocus();

      // Press Enter to flip
      await user.keyboard('{Enter}');

      expect(flashcard).toHaveAttribute('aria-pressed', 'true');
    });

    it('keyboard flip with Space key', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={[createSingleTerm()]} />);

      const flashcard = screen.getByTestId('flashcard');

      // Focus the card
      flashcard.focus();

      // Press Space to flip
      await user.keyboard(' ');

      expect(flashcard).toHaveAttribute('aria-pressed', 'true');
    });

    it('flipping card reveals assessment buttons', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(<VocabularyFlashcards terms={[createSingleTerm()]} onTermReviewed={onTermReviewed} />);

      const flashcard = screen.getByTestId('flashcard');

      // Assessment buttons not visible before flip
      expect(screen.queryByTestId('assessment-buttons')).not.toBeInTheDocument();

      // Flip the card
      await user.click(flashcard);

      // Assessment buttons now visible
      expect(screen.getByTestId('assessment-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('btn-easy')).toBeInTheDocument();
      expect(screen.getByTestId('btn-hard')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates between terms with buttons', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      // Initially on first card - check front card has the term
      const frontCard = screen.getByTestId('flashcard-front');
      expect(within(frontCard).getByText('Photosynthesis')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('1 of 3');

      // Click next
      const nextButton = screen.getByTestId('btn-next');
      await user.click(nextButton);

      // Now on second card
      expect(within(screen.getByTestId('flashcard-front')).getByText('Chlorophyll')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('2 of 3');

      // Click previous
      const prevButton = screen.getByTestId('btn-previous');
      await user.click(prevButton);

      // Back to first card
      expect(within(screen.getByTestId('flashcard-front')).getByText('Photosynthesis')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('1 of 3');
    });

    it('previous button disabled on first card', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      const prevButton = screen.getByTestId('btn-previous');
      expect(prevButton).toBeDisabled();
    });

    it('next button disabled on last card', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      // Navigate to last card
      const nextButton = screen.getByTestId('btn-next');
      await user.click(nextButton); // 2nd
      await user.click(nextButton); // 3rd (last)

      expect(nextButton).toBeDisabled();
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('3 of 3');
    });

    it('keyboard navigation with arrow keys', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      // Initially on first card
      expect(within(screen.getByTestId('flashcard-front')).getByText('Photosynthesis')).toBeInTheDocument();

      // Press right arrow to go next
      await user.keyboard('{ArrowRight}');
      expect(within(screen.getByTestId('flashcard-front')).getByText('Chlorophyll')).toBeInTheDocument();

      // Press left arrow to go back
      await user.keyboard('{ArrowLeft}');
      expect(within(screen.getByTestId('flashcard-front')).getByText('Photosynthesis')).toBeInTheDocument();
    });

    it('clicking dot navigates to that card', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      // Click on third dot
      const dot2 = screen.getByTestId('dot-2');
      await user.click(dot2);

      expect(within(screen.getByTestId('flashcard-front')).getByText('Glucose')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('3 of 3');
    });
  });

  describe('Self-Assessment', () => {
    it('self-assessment buttons appear after flip', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(<VocabularyFlashcards terms={[createSingleTerm()]} onTermReviewed={onTermReviewed} />);

      // Flip the card
      await user.click(screen.getByTestId('flashcard'));

      expect(screen.getByTestId('btn-easy')).toBeInTheDocument();
      expect(screen.getByTestId('btn-hard')).toBeInTheDocument();
    });

    it('onTermReviewed fires with easy result', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(<VocabularyFlashcards terms={[createSingleTerm()]} onTermReviewed={onTermReviewed} />);

      // Flip and assess
      await user.click(screen.getByTestId('flashcard'));
      await user.click(screen.getByTestId('btn-easy'));

      expect(onTermReviewed).toHaveBeenCalledWith('Photosynthesis', 'easy');
    });

    it('onTermReviewed fires with hard result', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(<VocabularyFlashcards terms={[createSingleTerm()]} onTermReviewed={onTermReviewed} />);

      // Flip and assess
      await user.click(screen.getByTestId('flashcard'));
      await user.click(screen.getByTestId('btn-hard'));

      expect(onTermReviewed).toHaveBeenCalledWith('Photosynthesis', 'hard');
    });

    it('assessment auto-advances to next card in carousel mode', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(
        <VocabularyFlashcards
          terms={createMultipleTerms()}
          mode="carousel"
          onTermReviewed={onTermReviewed}
        />
      );

      // Initially on first card
      expect(within(screen.getByTestId('flashcard-front')).getByText('Photosynthesis')).toBeInTheDocument();

      // Flip and assess
      await user.click(screen.getByTestId('flashcard'));
      await user.click(screen.getByTestId('btn-easy'));

      // Should auto-advance to second card
      expect(within(screen.getByTestId('flashcard-front')).getByText('Chlorophyll')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('2 of 3');
    });

    it('reviewed count updates after assessment', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(
        <VocabularyFlashcards
          terms={createMultipleTerms()}
          mode="carousel"
          onTermReviewed={onTermReviewed}
        />
      );

      // Assess first card
      await user.click(screen.getByTestId('flashcard'));
      await user.click(screen.getByTestId('btn-easy'));

      // Check reviewed count is shown
      expect(screen.getByText('1 reviewed')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('flashcard has proper aria-label', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      const flashcard = screen.getByTestId('flashcard');
      expect(flashcard).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Flashcard 1 of 3')
      );
    });

    it('navigation buttons have aria-labels', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      expect(screen.getByTestId('btn-previous')).toHaveAttribute('aria-label', 'Previous card');
      expect(screen.getByTestId('btn-next')).toHaveAttribute('aria-label', 'Next card');
    });

    it('dot navigation has proper roles', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      const dots = screen.getAllByRole('tab');
      expect(dots).toHaveLength(3);
      expect(dots[0]).toHaveAttribute('aria-selected', 'true');
      expect(dots[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('region has aria-label', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="carousel" />);

      expect(screen.getByRole('region', { name: /carousel/i })).toBeInTheDocument();
    });

    it('grid mode has proper aria-label', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="grid" />);

      expect(screen.getByRole('region', { name: /grid/i })).toBeInTheDocument();
    });

    it('assessment buttons have aria-labels', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(<VocabularyFlashcards terms={[createSingleTerm()]} onTermReviewed={onTermReviewed} />);

      await user.click(screen.getByTestId('flashcard'));

      expect(screen.getByTestId('btn-easy')).toHaveAttribute('aria-label', 'Mark as I knew it');
      expect(screen.getByTestId('btn-hard')).toHaveAttribute('aria-label', 'Mark as need practice');
    });

    it('flashcard is keyboard focusable', () => {
      render(<VocabularyFlashcards terms={[createSingleTerm()]} />);

      const flashcard = screen.getByTestId('flashcard');
      expect(flashcard).toHaveAttribute('tabIndex', '0');
      expect(flashcard).toHaveAttribute('role', 'button');
    });
  });

  describe('Prefers Reduced Motion', () => {
    it('prefers-reduced-motion disables flip animation', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={[createSingleTerm()]} />);

      const flashcard = screen.getByTestId('flashcard');
      const front = screen.getByTestId('flashcard-front');
      const back = screen.getByTestId('flashcard-back');

      // Before flip - front visible, back hidden
      expect(front).not.toHaveClass('hidden');
      expect(back).toHaveClass('hidden');

      // Flip
      await user.click(flashcard);

      // After flip - front hidden, back visible (no 3D transform, uses display toggle)
      expect(front).toHaveClass('hidden');
      expect(back).not.toHaveClass('hidden');
    });
  });

  describe('Grid Mode Specific', () => {
    it('grid shows progress only after reviewing', () => {
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="grid" />);

      // No progress indicator initially in grid mode
      expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
    });

    it('grid shows progress after assessment', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(
        <VocabularyFlashcards
          terms={createMultipleTerms()}
          mode="grid"
          onTermReviewed={onTermReviewed}
        />
      );

      // Flip and assess first card
      const flashcards = screen.getAllByTestId('flashcard');
      await user.click(flashcards[0]);
      await user.click(screen.getAllByTestId('btn-easy')[0]);

      // Progress should now show
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('1 of 3 reviewed');
    });

    it('multiple cards can be flipped simultaneously in grid', async () => {
      const user = userEvent.setup();
      render(<VocabularyFlashcards terms={createMultipleTerms()} mode="grid" />);

      const flashcards = screen.getAllByTestId('flashcard');

      // Flip first card
      await user.click(flashcards[0]);
      expect(flashcards[0]).toHaveAttribute('aria-pressed', 'true');

      // Flip second card (first should remain flipped)
      await user.click(flashcards[1]);
      expect(flashcards[0]).toHaveAttribute('aria-pressed', 'true');
      expect(flashcards[1]).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles term with no audioUrl', () => {
      const termWithoutAudio: VocabularyTerm = {
        term: 'Test Term',
        thai: 'คำทดสอบ',
        definition: 'A test definition',
      };

      render(<VocabularyFlashcards terms={[termWithoutAudio]} />);

      // Term appears on both front and back
      expect(screen.getAllByText('Test Term')).toHaveLength(2);
    });

    it('handles very long term names', () => {
      const longTerm: VocabularyTerm = {
        term: 'Supercalifragilisticexpialidocious Scientific Terminology',
        thai: 'คำศัพท์วิทยาศาสตร์ยาวมาก',
        definition: 'A very long term used for testing purposes',
      };

      render(<VocabularyFlashcards terms={[longTerm]} />);

      // Long term appears on both front and back
      expect(screen.getAllByText('Supercalifragilisticexpialidocious Scientific Terminology')).toHaveLength(2);
    });

    it('clicking assessment button does not toggle card flip', async () => {
      const user = userEvent.setup();
      const onTermReviewed = vi.fn();

      render(
        <VocabularyFlashcards
          terms={createMultipleTerms()}
          mode="grid"
          onTermReviewed={onTermReviewed}
        />
      );

      const flashcards = screen.getAllByTestId('flashcard');

      // Flip first card
      await user.click(flashcards[0]);
      expect(flashcards[0]).toHaveAttribute('aria-pressed', 'true');

      // Click easy button - card should stay flipped (stopPropagation)
      const easyButton = screen.getAllByTestId('btn-easy')[0];
      await user.click(easyButton);

      // Card should still be flipped after clicking button
      // (The behavior depends on implementation - in this case assessment in grid mode doesn't auto-close)
      expect(flashcards[0]).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
