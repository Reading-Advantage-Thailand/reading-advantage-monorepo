import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VocabularyBlock } from '../blocks/vocabulary-block';
import type { VocabularyBlock as VocabularyBlockType } from '@/lib/schemas/lesson-content.schema';

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const createVocabularyBlock = (overrides?: Partial<VocabularyBlockType>): VocabularyBlockType => ({
  id: 'vocab-1',
  type: 'vocabulary',
  terms: [
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
  ],
  ...overrides,
});

describe('VocabularyBlock', () => {
  describe('Rendering', () => {
    it('renders vocabulary flashcards', () => {
      const block = createVocabularyBlock();
      render(<VocabularyBlock block={block} />);

      expect(screen.getByTestId('vocabulary-flashcards')).toBeInTheDocument();
    });

    it('renders with data attributes', () => {
      const block = createVocabularyBlock();
      const { container } = render(<VocabularyBlock block={block} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('data-block-type', 'vocabulary');
      expect(wrapper).toHaveAttribute('data-block-id', 'vocab-1');
    });
  });

  describe('Bilingual Display', () => {
    it('shows Thai term alongside English when showThai is true', () => {
      const block = createVocabularyBlock();
      render(<VocabularyBlock block={block} showThai={true} />);

      expect(screen.getAllByText('Photosynthesis').length).toBeGreaterThan(0);
      expect(screen.getByText('การสังเคราะห์ด้วยแสง')).toBeInTheDocument();
    });

    it('hides Thai term when showThai is false', () => {
      const block = createVocabularyBlock();
      render(<VocabularyBlock block={block} showThai={false} />);

      expect(screen.getAllByText('Photosynthesis').length).toBeGreaterThan(0);
      expect(screen.queryByText('การสังเคราะห์ด้วยแสง')).not.toBeInTheDocument();
    });

    it('definition remains in display language after flip', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      const block = createVocabularyBlock();
      render(<VocabularyBlock block={block} showThai={true} />);

      const flashcard = screen.getByTestId('flashcard');
      await user.click(flashcard);

      expect(screen.getByText('The process by which plants convert sunlight into energy')).toBeInTheDocument();
    });
  });
});
