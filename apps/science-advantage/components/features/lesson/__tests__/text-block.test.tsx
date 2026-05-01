import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TextBlock } from '../blocks/text-block';
import type { TextBlock as TextBlockType } from '@/lib/schemas/lesson-content.schema';

afterEach(() => {
  cleanup();
});

const createTextBlock = (overrides?: Partial<TextBlockType>): TextBlockType => ({
  id: 'text-1',
  type: 'text',
  content: 'Photosynthesis is the process by which plants convert sunlight into energy.',
  contentThai: 'การสังเคราะห์ด้วยแสงเป็นกระบวนการที่พืชแปลงพลังงานแสงอาทิตย์เป็นพลังงาน',
  ...overrides,
});

describe('TextBlock', () => {
  describe('Rendering', () => {
    it('renders English content by default', () => {
      const block = createTextBlock();
      render(<TextBlock block={block} />);

      expect(screen.getByText(/Photosynthesis is the process/)).toBeInTheDocument();
    });

    it('renders with data attributes', () => {
      const block = createTextBlock();
      render(<TextBlock block={block} />);

      const container = screen.getByTestId('text-block-text-1');
      expect(container).toHaveAttribute('data-block-type', 'text');
      expect(container).toHaveAttribute('data-block-id', 'text-1');
    });
  });

  describe('Side-by-Side Rendering', () => {
    it('shows both English and Thai content when showThai is true', () => {
      const block = createTextBlock();
      render(<TextBlock block={block} showThai={true} />);

      expect(screen.getByText(/Photosynthesis is the process/)).toBeInTheDocument();
      expect(screen.getByText(/การสังเคราะห์ด้วยแสงเป็นกระบวนการ/)).toBeInTheDocument();
    });

    it('shows a divider between English and Thai content', () => {
      const block = createTextBlock();
      const { container } = render(<TextBlock block={block} showThai={true} />);

      const divider = container.querySelector('[data-bilingual-divider]');
      expect(divider).toBeInTheDocument();
    });

    it('Thai content uses muted styling', () => {
      const block = createTextBlock();
      const { container } = render(<TextBlock block={block} showThai={true} />);

      const thaiSection = container.querySelector('[data-thai-content]');
      expect(thaiSection).toBeInTheDocument();
      expect(thaiSection?.className).toContain('text-gray-500');
    });

    it('shows only English when showThai is false', () => {
      const block = createTextBlock();
      render(<TextBlock block={block} showThai={false} />);

      expect(screen.getByText(/Photosynthesis is the process/)).toBeInTheDocument();
      expect(screen.queryByText(/การสังเคราะห์ด้วยแสง/)).not.toBeInTheDocument();
    });

    it('shows only English when contentThai is missing', () => {
      const block = createTextBlock({ contentThai: undefined });
      render(<TextBlock block={block} showThai={true} />);

      expect(screen.getByText(/Photosynthesis is the process/)).toBeInTheDocument();
      expect(screen.queryByText(/การสังเคราะห์ด้วยแสง/)).not.toBeInTheDocument();
    });

    it('shows only English when contentThai is empty string', () => {
      const block = createTextBlock({ contentThai: '' });
      render(<TextBlock block={block} showThai={true} />);

      expect(screen.getByText(/Photosynthesis is the process/)).toBeInTheDocument();
    });

    it('does not render a divider when Thai is not shown', () => {
      const block = createTextBlock();
      const { container } = render(<TextBlock block={block} showThai={false} />);

      const divider = container.querySelector('[data-bilingual-divider]');
      expect(divider).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles block without id', () => {
      const block = createTextBlock({ id: undefined });
      render(<TextBlock block={block} />);

      expect(screen.getByText(/Photosynthesis is the process/)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const block = createTextBlock();
      const { container } = render(<TextBlock block={block} className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });
  });
});
