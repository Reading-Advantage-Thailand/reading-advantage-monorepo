import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MaterialsBlock } from '../blocks/materials-block';
import type { MaterialsBlock as MaterialsBlockType } from '@/lib/schemas/lesson-content.schema';

afterEach(() => {
  cleanup();
});

const createMaterialsBlock = (overrides?: Partial<MaterialsBlockType>): MaterialsBlockType => ({
  id: 'materials-1',
  type: 'materials',
  items: [
    { quantity: '2', item: 'Small plants', itemThai: 'ต้นไม้ขนาดเล็ก' },
    { quantity: '1', item: 'Water', itemThai: 'น้ำ' },
    { item: 'Sunlight', itemThai: 'แสงแดด' },
    { item: 'Dark closet' },
  ],
  ...overrides,
});

describe('MaterialsBlock', () => {
  describe('Rendering', () => {
    it('renders the title', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} />);

      expect(screen.getByText('Materials Needed')).toBeInTheDocument();
    });

    it('renders all items', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} />);

      expect(screen.getByText('Small plants')).toBeInTheDocument();
      expect(screen.getByText('Water')).toBeInTheDocument();
      expect(screen.getByText('Sunlight')).toBeInTheDocument();
      expect(screen.getByText('Dark closet')).toBeInTheDocument();
    });

    it('renders quantities', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders with data attributes', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} />);

      const section = screen.getByTestId('materials-block-materials-1');
      expect(section).toHaveAttribute('data-block-type', 'materials');
      expect(section).toHaveAttribute('data-block-id', 'materials-1');
    });
  });

  describe('Bilingual Items', () => {
    it('shows Thai item name alongside English when showThai is true', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} showThai={true} />);

      expect(screen.getByText('Small plants')).toBeInTheDocument();
      expect(screen.getByText('ต้นไม้ขนาดเล็ก')).toBeInTheDocument();
    });

    it('shows only English when showThai is false', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} showThai={false} />);

      expect(screen.getByText('Small plants')).toBeInTheDocument();
      expect(screen.queryByText('ต้นไม้ขนาดเล็ก')).not.toBeInTheDocument();
    });

    it('Thai item uses smaller text', () => {
      const block = createMaterialsBlock();
      const { container } = render(<MaterialsBlock block={block} showThai={true} />);

      const thaiItems = container.querySelectorAll('[data-thai-item]');
      expect(thaiItems.length).toBe(3);
      thaiItems.forEach((el) => {
        expect(el.className).toContain('text-sm');
        expect(el.className).toContain('text-gray-500');
      });
    });

    it('gracefully handles item without Thai translation', () => {
      const block = createMaterialsBlock();
      render(<MaterialsBlock block={block} showThai={true} />);

      expect(screen.getByText('Dark closet')).toBeInTheDocument();
      expect(screen.queryByText('Dark closet')).not.toHaveAttribute('data-thai-item');
    });
  });
});
