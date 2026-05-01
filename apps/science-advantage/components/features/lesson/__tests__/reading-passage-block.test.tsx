import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ReadingPassageBlock } from '../blocks/reading-passage-block';
import type { ReadingPassageBlock as ReadingPassageBlockType } from '@/lib/schemas/lesson-content.schema';

afterEach(() => {
  cleanup();
});

const createReadingPassageBlock = (
  overrides?: Partial<ReadingPassageBlockType>
): ReadingPassageBlockType => ({
  id: 'reading-1',
  type: 'reading_passage',
  title: 'How Plants Make Food',
  titleThai: 'พืชสร้างอาหารอย่างไร',
  content: 'Plants are amazing organisms that can make their own food through photosynthesis.',
  contentThai: 'พืชเป็นสิ่งมีชีวิตที่น่าทึ่งที่สามารถสร้างอาหารเองได้ผ่านการสังเคราะห์ด้วยแสง',
  wordCount: 150,
  ...overrides,
});

describe('ReadingPassageBlock', () => {
  describe('Rendering', () => {
    it('renders the English title by default', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} />);

      expect(screen.getByText('How Plants Make Food')).toBeInTheDocument();
    });

    it('renders the content', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} />);

      expect(screen.getByText(/Plants are amazing organisms/)).toBeInTheDocument();
    });

    it('renders word count badge', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} />);

      expect(screen.getByText('150 words')).toBeInTheDocument();
    });

    it('renders with data attributes', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} />);

      const article = screen.getByTestId('reading-passage-block-reading-1');
      expect(article).toHaveAttribute('data-block-type', 'reading_passage');
      expect(article).toHaveAttribute('data-block-id', 'reading-1');
    });
  });

  describe('Bilingual Titles', () => {
    it('shows Thai title alongside English when showThai is true', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} showThai={true} />);

      expect(screen.getByText('How Plants Make Food')).toBeInTheDocument();
      expect(screen.getByText('พืชสร้างอาหารอย่างไร')).toBeInTheDocument();
    });

    it('shows only English title when showThai is false', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} showThai={false} />);

      expect(screen.getByText('How Plants Make Food')).toBeInTheDocument();
      expect(screen.queryByText('พืชสร้างอาหารอย่างไร')).not.toBeInTheDocument();
    });

    it('shows only English title when titleThai is missing', () => {
      const block = createReadingPassageBlock({ titleThai: undefined });
      render(<ReadingPassageBlock block={block} showThai={true} />);

      expect(screen.getByText('How Plants Make Food')).toBeInTheDocument();
      expect(screen.queryByText(/พืชสร้างอาหาร/)).not.toBeInTheDocument();
    });

    it('Thai title uses muted styling', () => {
      const block = createReadingPassageBlock();
      const { container } = render(<ReadingPassageBlock block={block} showThai={true} />);

      const thaiTitle = container.querySelector('[data-thai-title]');
      expect(thaiTitle).toBeInTheDocument();
      expect(thaiTitle?.className).toContain('text-gray-500');
    });

    it('content remains in display language', () => {
      const block = createReadingPassageBlock();
      render(<ReadingPassageBlock block={block} showThai={true} />);

      expect(screen.getByText(/Plants are amazing organisms/)).toBeInTheDocument();
    });
  });
});
