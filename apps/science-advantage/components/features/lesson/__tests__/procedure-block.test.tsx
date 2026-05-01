import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ProcedureBlock } from '../blocks/procedure-block';
import type { ProcedureBlock as ProcedureBlockType } from '@/lib/schemas/lesson-content.schema';

afterEach(() => {
  cleanup();
});

const createProcedureBlock = (overrides?: Partial<ProcedureBlockType>): ProcedureBlockType => ({
  id: 'procedure-1',
  type: 'procedure',
  steps: [
    {
      stepNumber: 1,
      instruction: 'Place one plant in sunlight',
      instructionThai: 'วางต้นไม้หนึ่งต้นไว้ในที่มีแสงแดด',
      subSteps: ['Choose a sunny windowsill', 'Ensure the plant is stable'],
    },
    {
      stepNumber: 2,
      instruction: 'Place the other plant in a dark closet',
      instructionThai: 'วางต้นไม้อีกต้นไว้ในตู้มืด',
    },
    {
      stepNumber: 3,
      instruction: 'Water both plants equally',
    },
  ],
  ...overrides,
});

describe('ProcedureBlock', () => {
  describe('Rendering', () => {
    it('renders the procedure title', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} />);

      expect(screen.getByText('Procedure')).toBeInTheDocument();
    });

    it('renders all steps', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} />);

      expect(screen.getByText('Place one plant in sunlight')).toBeInTheDocument();
      expect(screen.getByText('Place the other plant in a dark closet')).toBeInTheDocument();
      expect(screen.getByText('Water both plants equally')).toBeInTheDocument();
    });

    it('renders step numbers', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders sub-steps', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} />);

      expect(screen.getByText('Choose a sunny windowsill')).toBeInTheDocument();
      expect(screen.getByText('Ensure the plant is stable')).toBeInTheDocument();
    });

    it('renders step completion counter', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} />);

      expect(screen.getByText('0 of 3 steps completed')).toBeInTheDocument();
    });

    it('renders with data attributes', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} />);

      const section = screen.getByTestId('procedure-block-procedure-1');
      expect(section).toHaveAttribute('data-block-type', 'procedure');
      expect(section).toHaveAttribute('data-block-id', 'procedure-1');
    });
  });

  describe('Bilingual Instructions', () => {
    it('shows Thai instruction alongside English when showThai is true', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} showThai={true} />);

      expect(screen.getByText('Place one plant in sunlight')).toBeInTheDocument();
      expect(screen.getByText('วางต้นไม้หนึ่งต้นไว้ในที่มีแสงแดด')).toBeInTheDocument();
    });

    it('shows only English when showThai is false', () => {
      const block = createProcedureBlock();
      render(<ProcedureBlock block={block} showThai={false} />);

      expect(screen.getByText('Place one plant in sunlight')).toBeInTheDocument();
      expect(screen.queryByText('วางต้นไม้หนึ่งต้นไว้ในที่มีแสงแดด')).not.toBeInTheDocument();
    });

    it('shows Thai instruction inline with smaller text', () => {
      const block = createProcedureBlock();
      const { container } = render(<ProcedureBlock block={block} showThai={true} />);

      const thaiInstructions = container.querySelectorAll('[data-thai-instruction]');
      expect(thaiInstructions.length).toBe(2);
      thaiInstructions.forEach((el) => {
        expect(el.className).toContain('text-sm');
        expect(el.className).toContain('text-gray-500');
      });
    });

    it('gracefully handles step without Thai instruction', () => {
      const block = createProcedureBlock();
      const { container } = render(<ProcedureBlock block={block} showThai={true} />);

      expect(screen.getByText('Water both plants equally')).toBeInTheDocument();
      const thaiInstructions = container.querySelectorAll('[data-thai-instruction]');
      expect(thaiInstructions.length).toBe(2);
    });
  });
});
