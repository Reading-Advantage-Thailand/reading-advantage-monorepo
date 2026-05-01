import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuizBlock } from '../blocks/quiz-block';
import type { QuizBlock as QuizBlockType } from '@/lib/schemas/lesson-content.schema';

afterEach(() => {
  cleanup();
});

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

const createQuizBlock = (overrides?: Partial<QuizBlockType>): QuizBlockType => ({
  id: 'quiz-1',
  type: 'quiz',
  title: 'Knowledge Check',
  titleThai: 'ตรวจสอบความรู้',
  passingScore: 70,
  questions: [
    {
      questionId: 'q1',
      type: 'multiple_choice',
      text: 'What is the process by which plants make food?',
      textThai: 'พืชสร้างอาหารอย่างไร?',
      options: [
        { id: 'a', text: 'Respiration' },
        { id: 'b', text: 'Photosynthesis' },
        { id: 'c', text: 'Fermentation' },
        { id: 'd', text: 'Digestion' },
      ],
    },
    {
      questionId: 'q2',
      type: 'true_false',
      text: 'The Sun is a star.',
      textThai: 'ดวงอาทิตย์เป็นดาวฤกษ์',
    },
    {
      questionId: 'q3',
      type: 'multiple_choice',
      text: 'Which organ pumps blood through the body?',
      options: [
        { id: 'a', text: 'Brain' },
        { id: 'b', text: 'Lungs' },
        { id: 'c', text: 'Heart' },
        { id: 'd', text: 'Stomach' },
      ],
    },
  ],
  ...overrides,
});

describe('QuizBlock', () => {
  describe('Rendering', () => {
    it('renders the quiz title', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByText('Knowledge Check')).toBeInTheDocument();
    });

    it('renders the first question by default', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByText(/What is the process by which plants make food/)).toBeInTheDocument();
    });

    it('shows question count', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });

    it('shows answered count', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByText('0 / 3 answered')).toBeInTheDocument();
    });

    it('shows passing score badge when provided', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByText('Pass: 70%')).toBeInTheDocument();
    });

    it('does not show passing score badge when not provided', () => {
      const block = createQuizBlock({ passingScore: undefined });
      render(<QuizBlock block={block} />);

      expect(screen.queryByText(/Pass:/)).not.toBeInTheDocument();
    });
  });

  describe('Question Navigation', () => {
    it('disables Previous button on first question', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      const prevButton = screen.getByRole('button', { name: 'Previous question' });
      expect(prevButton).toBeDisabled();
    });

    it('disables Next button on last question', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      // Navigate to last question
      await user.click(screen.getByRole('button', { name: 'Next question' }));
      await user.click(screen.getByRole('button', { name: 'Next question' }));

      const nextButton = screen.getByRole('button', { name: 'Next question' });
      expect(nextButton).toBeDisabled();
    });

    it('navigates to next question', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      await user.click(screen.getByRole('button', { name: 'Next question' }));

      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      expect(screen.getByText(/The Sun is a star/)).toBeInTheDocument();
    });

    it('navigates to previous question', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      // Go forward then back
      await user.click(screen.getByRole('button', { name: 'Next question' }));
      await user.click(screen.getByRole('button', { name: 'Previous question' }));

      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      expect(screen.getByText(/What is the process by which plants make food/)).toBeInTheDocument();
    });
  });

  describe('Multiple Choice Questions', () => {
    it('renders options for multiple choice questions', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByText('Respiration')).toBeInTheDocument();
      expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
      expect(screen.getByText('Fermentation')).toBeInTheDocument();
      expect(screen.getByText('Digestion')).toBeInTheDocument();
    });

    it('allows selecting an option', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      const photosynthesisOption = screen.getByLabelText('Photosynthesis');
      await user.click(photosynthesisOption);

      expect(photosynthesisOption).toBeChecked();
      expect(screen.getByText('1 / 3 answered')).toBeInTheDocument();
      expect(screen.getByText('Answered')).toBeInTheDocument();
    });

    it('allows changing selection', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      await user.click(screen.getByLabelText('Photosynthesis'));
      expect(screen.getByLabelText('Photosynthesis')).toBeChecked();

      await user.click(screen.getByLabelText('Respiration'));
      expect(screen.getByLabelText('Respiration')).toBeChecked();
      expect(screen.getByLabelText('Photosynthesis')).not.toBeChecked();
    });
  });

  describe('True/False Questions', () => {
    it('renders True and False options', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      // Navigate to second question (true/false)
      await user.click(screen.getByRole('button', { name: 'Next question' }));

      expect(screen.getByText('True')).toBeInTheDocument();
      expect(screen.getByText('False')).toBeInTheDocument();
    });

    it('allows selecting True or False', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      // Navigate to second question
      await user.click(screen.getByRole('button', { name: 'Next question' }));

      await user.click(screen.getByLabelText('True'));
      expect(screen.getByLabelText('True')).toBeChecked();
      expect(screen.getByText('1 / 3 answered')).toBeInTheDocument();
    });
  });

  describe('Thai Language Support', () => {
    it('shows Thai title when showThai is true', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} showThai={true} />);

      expect(screen.getByText('ตรวจสอบความรู้')).toBeInTheDocument();
    });

    it('shows Thai question text when showThai is true', async () => {
      const user = userEvent.setup();
      const block = createQuizBlock();
      render(<QuizBlock block={block} showThai={true} />);

      expect(screen.getByText(/พืชสร้างอาหารอย่างไร/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByRole('region', { name: 'Quiz: Knowledge Check' })).toBeInTheDocument();
    });

    it('has data attributes for testing', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      const section = screen.getByRole('region', { name: 'Quiz: Knowledge Check' });
      expect(section).toHaveAttribute('data-block-type', 'quiz');
      expect(section).toHaveAttribute('data-block-id', 'quiz-1');
    });

    it('navigation buttons have aria-labels', () => {
      const block = createQuizBlock();
      render(<QuizBlock block={block} />);

      expect(screen.getByRole('button', { name: 'Previous question' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next question' })).toBeInTheDocument();
    });
  });
});
