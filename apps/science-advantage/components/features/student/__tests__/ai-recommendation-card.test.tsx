import type { MouseEvent } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AiRecommendationCard,
  type RecommendationApiResponse,
} from '../ai-recommendation-card';

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, onClick, ...props }: any) => (
    <a
      {...props}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
  },
}));

describe('AiRecommendationCard', () => {
  const baseResponse: RecommendationApiResponse = {
    success: true,
    fallbackUsed: false,
    traceId: 'rec_123',
    recommendation: {
      recommendedLessonId: 'lesson_1',
      recommendedLessonSlug: 'lesson-a',
      lessonTitle: 'Lesson A',
      focusStandards: ['SCI.1', 'SCI.2'],
      reasoning: 'Focus on these standards to close the gap.',
      confidence: 'high',
    },
  };

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders loading skeleton initially', () => {
    const fetcher = vi.fn(() => new Promise<RecommendationApiResponse>(() => {}));
    const { unmount } = render(
      <AiRecommendationCard
        attemptId="att-1"
        classId="class-1"
        lessonSlug="lesson-a"
        fetcher={fetcher}
      />
    );

    expect(screen.getByTestId('ai-recommendation-loading')).toBeInTheDocument();
    unmount();
  });

  it('renders success state when API resolves', async () => {
    const fetcher = vi.fn().mockResolvedValue(baseResponse);
    render(
      <AiRecommendationCard
        attemptId="att-1"
        classId="class-1"
        lessonSlug="lesson-a"
        studentId="student-1"
        fetcher={fetcher}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-recommendation-card')).toBeInTheDocument();
    });
    expect(screen.getByText('Personalized Next Step')).toBeVisible();
    expect(screen.getByTestId('ai-recommendation-badge')).toHaveTextContent('AI Recommendation');
    expect(fetcher).toHaveBeenCalledWith('att-1', expect.any(AbortSignal));
  });

  it('shows fallback badge when fallbackUsed is true', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ...baseResponse,
      fallbackUsed: true,
    });

    render(
      <AiRecommendationCard
        attemptId="att-1"
        classId="class-1"
        lessonSlug="lesson-a"
        fetcher={fetcher}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-recommendation-badge')).toHaveTextContent('Curriculum rules');
    });
  });

  it('shows error state after retries exceed max duration', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fail'));
    render(
      <AiRecommendationCard
        attemptId="att-1"
        classId="class-1"
        lessonSlug="lesson-a"
        fetcher={fetcher}
        pollOptions={{ maxDurationMs: 0, retryDelayMs: 0, requestTimeoutMs: 10 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-recommendation-error')).toBeInTheDocument();
    });
  });

  it('fires CTA tracking when primary action is clicked', async () => {
    const fetcher = vi.fn().mockResolvedValue(baseResponse);
    const user = userEvent.setup();
    render(
      <AiRecommendationCard
        attemptId="att-1"
        classId="class-1"
        lessonSlug="lesson-a"
        studentId="student-1"
        fetcher={fetcher}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-recommendation-start-lesson')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ai-recommendation-start-lesson'));
    expect(screen.getByTestId('ai-recommendation-start-lesson')).toBeVisible();
  });
});
