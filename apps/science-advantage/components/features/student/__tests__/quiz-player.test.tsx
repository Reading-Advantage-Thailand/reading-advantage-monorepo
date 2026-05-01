import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuizPlayer } from '../quiz-player';

// --- Mocks ---

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/config/features', () => ({
  isAiRecommendationEnabled: () => false,
}));

vi.mock('../ai-recommendation-card', () => ({
  AiRecommendationCard: () => <div data-testid="ai-recommendation" />,
}));

vi.mock('../continue-learning-card', () => ({
  ContinueLearningCard: () => <div data-testid="continue-learning" />,
}));

// --- Test Data ---

const mockQuizData = {
  quizId: 'attempt-123',
  lessonId: 'lesson-1',
  questions: [
    {
      id: 'q1',
      type: 'MULTIPLE_CHOICE' as const,
      text: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'],
      points: 1,
      order: 1,
    },
    {
      id: 'q2',
      type: 'TRUE_FALSE' as const,
      text: 'Water is made of hydrogen and oxygen.',
      options: ['True', 'False'],
      points: 1,
      order: 2,
    },
    {
      id: 'q3',
      type: 'FILL_IN_BLANK' as const,
      text: 'The process by which plants make food is called ___.',
      options: null,
      points: 1,
      order: 3,
    },
  ],
  totalPoints: 3,
  startedAt: new Date().toISOString(),
};

const mockResult = {
  attemptId: 'attempt-123',
  score: 2,
  maxScore: 3,
  percentage: 66.67,
  attemptNumber: 1,
  completedAt: new Date().toISOString(),
  breakdown: [
    {
      questionId: 'q1',
      questionText: 'What is the powerhouse of the cell?',
      studentAnswer: 'Mitochondria',
      correctAnswer: 'Mitochondria',
      isCorrect: true,
      points: 1,
      timeSpentSeconds: 10,
    },
    {
      questionId: 'q2',
      questionText: 'Water is made of hydrogen and oxygen.',
      studentAnswer: 'True',
      correctAnswer: 'True',
      isCorrect: true,
      points: 1,
      timeSpentSeconds: 5,
    },
    {
      questionId: 'q3',
      questionText: 'The process by which plants make food is called ___.',
      studentAnswer: 'respiration',
      correctAnswer: 'photosynthesis',
      isCorrect: false,
      points: 0,
      timeSpentSeconds: 15,
    },
  ],
};

// --- Helpers ---

function setupFetchMock(quizData = mockQuizData, resultData = mockResult) {
  global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    if (urlStr.includes('/quiz') && (!init || init.method !== 'POST')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(quizData),
      } as Response);
    }
    if (init?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(resultData),
      } as Response);
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    } as Response);
  });
}

// --- Tests ---

describe('QuizPlayer', () => {
  const defaultProps = {
    classId: 'class-1',
    lessonSlug: 'lesson-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMock();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner on mount', () => {
      render(<QuizPlayer {...defaultProps} />);
      expect(screen.getByText('Loading quiz...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error when fetch returns 401', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Authentication required' }),
        } as Response)
      );

      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Please sign in to take this quiz')).toBeInTheDocument();
      });
    });

    it('should show error when fetch returns 403', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'Not enrolled' }),
        } as Response)
      );

      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('You are not enrolled in a class with this lesson')
        ).toBeInTheDocument();
      });
    });

    it('should show error when fetch returns 404', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Lesson not found' }),
        } as Response)
      );

      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Lesson not found')).toBeInTheDocument();
      });
    });

    it('should show back to curriculum button on error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Lesson not found' }),
        } as Response)
      );

      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Back to curriculum')).toBeInTheDocument();
      });
    });
  });

  describe('Quiz Display', () => {
    it('should render first question after loading', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('What is the powerhouse of the cell?')
        ).toBeInTheDocument();
      });
    });

    it('should show question counter', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });
    });

    it('should show total points', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 points total')).toBeInTheDocument();
      });
    });

    it('should show point badge for current question', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1 point')).toBeInTheDocument();
      });
    });

    it('should display multiple choice options', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Nucleus')).toBeInTheDocument();
        expect(screen.getByText('Mitochondria')).toBeInTheDocument();
        expect(screen.getByText('Ribosome')).toBeInTheDocument();
        expect(screen.getByText('Golgi')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first question', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Previous').closest('button')).toBeDisabled();
      });
    });

    it('should show Next button on non-last questions', async () => {
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });
  });

  describe('Question Navigation', () => {
    it('should navigate to next question', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      // Wait for quiz to load
      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Select an answer first, then click next
      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));

      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      expect(
        screen.getByText('Water is made of hydrogen and oxygen.')
      ).toBeInTheDocument();
    });

    it('should navigate back to previous question', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Go to question 2
      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();

      // Go back to question 1
      await user.click(screen.getByText('Previous'));
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });

    it('should show Submit Quiz on last question', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Navigate to last question
      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('True'));
      await user.click(screen.getByText('Next'));

      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Submit Quiz')).toBeInTheDocument();
    });
  });

  describe('Answer Selection', () => {
    it('should select a multiple choice answer', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Mitochondria')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Mitochondria'));

      // The radio button should be selected (checked)
      const radio = screen.getByLabelText('Mitochondria');
      expect(radio).toBeChecked();
    });

    it('should preserve answers when navigating between questions', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Answer Q1
      await user.click(screen.getByText('Mitochondria'));

      // Go to Q2 and back
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Previous'));

      // Answer should be preserved
      const radio = screen.getByLabelText('Mitochondria');
      expect(radio).toBeChecked();
    });
  });

  describe('Quiz Submission', () => {
    it('should disable Submit Quiz when not all questions answered', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Navigate to last question without answering all
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));

      const submitButton = screen.getByText('Submit Quiz').closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('should show confirmation dialog before submission', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Answer all questions
      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('True'));
      await user.click(screen.getByText('Next'));

      // Fill in blank
      const input = screen.getByPlaceholderText('Type your answer here');
      await user.type(input, 'photosynthesis');

      // Click submit
      await user.click(screen.getByText('Submit Quiz'));

      // Confirmation dialog should appear
      expect(screen.getByText('Submit Quiz?')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to submit/)).toBeInTheDocument();
    });

    it('should submit quiz and show results', async () => {
      const user = userEvent.setup();
      const onQuizCompleted = vi.fn();
      render(<QuizPlayer {...defaultProps} onQuizCompleted={onQuizCompleted} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Answer all questions
      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('True'));
      await user.click(screen.getByText('Next'));

      const input = screen.getByPlaceholderText('Type your answer here');
      await user.type(input, 'respiration');

      // Submit
      await user.click(screen.getByText('Submit Quiz'));

      // Confirm in dialog
      const dialog = screen.getByRole('alertdialog');
      const submitButton = within(dialog).getByText('Submit');
      await user.click(submitButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Quiz Results')).toBeInTheDocument();
      });

      // Verify callback was called
      expect(onQuizCompleted).toHaveBeenCalledWith(mockResult);
    });

    it('should send correct POST body', async () => {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      // Answer all questions
      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('True'));
      await user.click(screen.getByText('Next'));

      const input = screen.getByPlaceholderText('Type your answer here');
      await user.type(input, 'photosynthesis');

      await user.click(screen.getByText('Submit Quiz'));
      const dialog = screen.getByRole('alertdialog');
      await user.click(within(dialog).getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Quiz Results')).toBeInTheDocument();
      });

      // Verify the POST call
      const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => {
          const init = call[1] as RequestInit | undefined;
          return init?.method === 'POST';
        }
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body as string);
      expect(body.attemptId).toBe('attempt-123');
      expect(body.responses).toHaveLength(3);
      expect(body.responses[0].questionId).toBe('q1');
      expect(body.responses[0].studentAnswer).toBe('Mitochondria');
      expect(body.responses[1].questionId).toBe('q2');
      expect(body.responses[1].studentAnswer).toBe('True');
      expect(body.responses[2].questionId).toBe('q3');
      expect(body.responses[2].studentAnswer).toBe('photosynthesis');
    });
  });

  describe('Results Screen', () => {
    async function submitQuizAndShowResults() {
      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('True'));
      await user.click(screen.getByText('Next'));

      const input = screen.getByPlaceholderText('Type your answer here');
      await user.type(input, 'respiration');

      await user.click(screen.getByText('Submit Quiz'));
      const dialog = screen.getByRole('alertdialog');
      await user.click(within(dialog).getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Quiz Results')).toBeInTheDocument();
      });

      return user;
    }

    it('should display score percentage', async () => {
      await submitQuizAndShowResults();
      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });

    it('should display points breakdown', async () => {
      await submitQuizAndShowResults();
      expect(screen.getByText('2 out of 3 points')).toBeInTheDocument();
    });

    it('should display attempt number', async () => {
      await submitQuizAndShowResults();
      expect(screen.getByText('Attempt #1')).toBeInTheDocument();
    });

    it('should show correct/incorrect badges in breakdown', async () => {
      await submitQuizAndShowResults();

      const correctBadges = screen.getAllByText('Correct');
      const incorrectBadges = screen.getAllByText('Incorrect');
      expect(correctBadges).toHaveLength(2);
      expect(incorrectBadges).toHaveLength(1);
    });

    it('should show correct answer for incorrect questions', async () => {
      await submitQuizAndShowResults();
      expect(screen.getByText('photosynthesis')).toBeInTheDocument();
    });

    it('should show score badge', async () => {
      await submitQuizAndShowResults();
      // 66.67% → "Good!" badge
      expect(screen.getByText('Good!')).toBeInTheDocument();
    });

    it('should show continue learning card when AI not enabled', async () => {
      await submitQuizAndShowResults();
      expect(screen.getByTestId('continue-learning')).toBeInTheDocument();
    });

    it('should show Retake Quiz button', async () => {
      await submitQuizAndShowResults();
      expect(screen.getByText('Retake Quiz')).toBeInTheDocument();
    });

    it('should show back to curriculum button', async () => {
      await submitQuizAndShowResults();
      const backButtons = screen.getAllByText('Back to curriculum');
      expect(backButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Submission Error Handling', () => {
    it('should show error when submission returns 409 (duplicate)', async () => {
      // Override fetch to fail on POST
      global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({ error: 'Attempt already submitted' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockQuizData),
        } as Response);
      });

      const user = userEvent.setup();
      render(<QuizPlayer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Mitochondria'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('True'));
      await user.click(screen.getByText('Next'));

      const input = screen.getByPlaceholderText('Type your answer here');
      await user.type(input, 'answer');

      await user.click(screen.getByText('Submit Quiz'));
      const dialog = screen.getByRole('alertdialog');
      await user.click(within(dialog).getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('This quiz has already been submitted')).toBeInTheDocument();
      });
    });
  });
});
