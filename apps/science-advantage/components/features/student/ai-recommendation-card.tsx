"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

import en from '@/i18n/ai-recommendation.en.json';
import th from '@/i18n/ai-recommendation.th.json';

const translations = {
  en,
  th,
};

type Locale = keyof typeof translations;

export type RecommendationApiResponse = {
  success: boolean;
  recommendation?: {
    recommendedLessonId: string;
    recommendedLessonSlug: string;
    lessonTitle: string;
    focusStandards: string[];
    reasoning: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  fallbackUsed: boolean;
  traceId: string;
  model?: string;
};

export type RecommendationFetcher = (
  attemptId: string,
  signal: AbortSignal
) => Promise<RecommendationApiResponse>;

export type PollOptions = {
  requestTimeoutMs?: number;
  retryDelayMs?: number;
  maxDurationMs?: number;
};

const DEFAULT_POLL_OPTIONS: Required<PollOptions> = {
  requestTimeoutMs: 10_000,
  retryDelayMs: 5_000,
  maxDurationMs: 30_000,
};

type RecommendationViewModel = {
  lessonTitle: string;
  lessonSlug: string;
  reasoning: string;
  focusStandards: string[];
  fallbackUsed: boolean;
  traceId: string;
  latencyMs: number;
  confidence: 'high' | 'medium' | 'low';
};

type RecommendationState =
  | { status: 'loading'; polling: boolean }
  | { status: 'success'; data: RecommendationViewModel }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string };

interface AiRecommendationCardProps {
  attemptId: string;
  lessonSlug: string;
  classId: string;
  studentId?: string;
  fetcher?: RecommendationFetcher;
  pollOptions?: PollOptions;
}

export function AiRecommendationCard({
  attemptId,
  lessonSlug,
  classId,
  studentId,
  fetcher = defaultRecommendationFetcher,
  pollOptions,
}: AiRecommendationCardProps) {
  const [state, setState] = useState<RecommendationState>({
    status: 'loading',
    polling: false,
  });
  const [locale, setLocale] = useState<Locale>('en');
  const [expanded, setExpanded] = useState(false);
  const [studentHash, setStudentHash] = useState<string | undefined>(undefined);

  const impressionTracked = useRef(false);
  const fallbackTracked = useRef(false);
  const toastShown = useRef(false);
  const retryTimeoutRef = useRef<number | undefined>(undefined);
  const inflightController = useRef<AbortController | null>(null);
  const firstRequestStartedAt = useRef<number>(0);
  const copy = useMemo(() => translations[locale], [locale]);

  const mergedPollOptions = useMemo(() => {
    return {
      ...DEFAULT_POLL_OPTIONS,
      ...(pollOptions ?? {}),
    } satisfies Required<PollOptions>;
  }, [pollOptions]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const lang = document.documentElement.lang?.toLowerCase();
      if (lang?.startsWith('th')) {
        setLocale('th');
      } else {
        setLocale('en');
      }
    }
  }, []);

  useEffect(() => {
    if (!studentId) {
      setStudentHash(undefined);
      return;
    }

    let cancelled = false;

    async function hashIdentifier(value: string) {
      try {
        if (!crypto?.subtle) {
          setStudentHash(value);
          return;
        }
        const encoder = new TextEncoder();
        const bytes = encoder.encode(value);
        const hashed = await crypto.subtle.digest('SHA-256', bytes);
        const hex = Array.from(new Uint8Array(hashed))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        if (!cancelled) {
          setStudentHash(hex);
        }
      } catch {
        if (!cancelled) {
          setStudentHash(value);
        }
      }
    }

    hashIdentifier(studentId);

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (!attemptId) {
      return;
    }

    firstRequestStartedAt.current = Date.now();
    impressionTracked.current = false;
    fallbackTracked.current = false;
    toastShown.current = false;
    setState({ status: 'loading', polling: false });

    let active = true;
    let currentRequestTimeout: number | null = null;

    const execute = () => {
      if (!active) {
        return;
      }

      inflightController.current?.abort();
      const controller = new AbortController();
      inflightController.current = controller;

      const requestStartedAt = performance.now();
      let didTimeout = false;

      currentRequestTimeout = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, mergedPollOptions.requestTimeoutMs);

      fetcher(attemptId, controller.signal)
        .then(response => {
          if (!active) {
            return;
          }

          if (currentRequestTimeout !== null) {
            window.clearTimeout(currentRequestTimeout);
            currentRequestTimeout = null;
          }

          if (!response.success) {
            throw new Error('REQUEST_FAILED');
          }

          const latencyMs = Math.round(performance.now() - requestStartedAt);

          if (!response.recommendation) {
            setState({ status: 'empty', message: copy.emptyBody });
            return;
          }

          const viewModel: RecommendationViewModel = {
            lessonTitle: response.recommendation.lessonTitle,
            lessonSlug: response.recommendation.recommendedLessonSlug,
            reasoning: response.recommendation.reasoning,
            focusStandards: response.recommendation.focusStandards,
            fallbackUsed: response.fallbackUsed,
            traceId: response.traceId,
            latencyMs,
            confidence: response.recommendation.confidence,
          };

          if (process.env.NODE_ENV !== 'production') {
            console.info('[ai-recommendation]', {
              traceId: viewModel.traceId,
              attemptId,
            });
          }

          setState({ status: 'success', data: viewModel });
        })
        .catch(error => {
          if (!active) {
            return;
          }

          if (currentRequestTimeout !== null) {
            window.clearTimeout(currentRequestTimeout);
            currentRequestTimeout = null;
          }

          const elapsed = Date.now() - firstRequestStartedAt.current;

          if (
            (error as DOMException)?.name === 'AbortError' &&
            didTimeout &&
            !toastShown.current
          ) {
            toast.warning(copy.toastTimeout);
            toastShown.current = true;
          }

          if (elapsed < mergedPollOptions.maxDurationMs) {
            setState({ status: 'loading', polling: true });
            if (retryTimeoutRef.current) {
              window.clearTimeout(retryTimeoutRef.current);
            }
            retryTimeoutRef.current = window.setTimeout(
              execute,
              mergedPollOptions.retryDelayMs
            );
            return;
          }

          setState({ status: 'error', message: copy.errorBody });
        });
    };

    execute();

    return () => {
      active = false;
      if (currentRequestTimeout !== null) {
        window.clearTimeout(currentRequestTimeout);
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
      inflightController.current?.abort();
    };
  }, [attemptId, copy, fetcher, mergedPollOptions.maxDurationMs, mergedPollOptions.requestTimeoutMs, mergedPollOptions.retryDelayMs]);

  useEffect(() => {
    if (state.status !== 'success') {
      return;
    }

    if (!impressionTracked.current) {
      track('ai_recommendation_view', {
        attemptId,
        studentIdHash: studentHash,
        lessonSlug,
        fallbackUsed: state.data.fallbackUsed,
        latencyMs: state.data.latencyMs,
      });
      impressionTracked.current = true;
    }

    if (state.data.fallbackUsed && !fallbackTracked.current) {
      track('ai_recommendation_fallback', {
        attemptId,
        studentIdHash: studentHash,
        lessonSlug,
        latencyMs: state.data.latencyMs,
      });
      fallbackTracked.current = true;
    }
  }, [attemptId, lessonSlug, state, studentHash]);

  if (state.status === 'loading') {
    return <LoadingState polling={state.polling} copy={copy} />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} classId={classId} copy={copy} />;
  }

  if (state.status === 'empty') {
    return <EmptyState message={state.message} classId={classId} copy={copy} />;
  }

  const handlePrimaryClick = () => {
    track('ai_recommendation_start_lesson', {
      attemptId,
      studentIdHash: studentHash,
      lessonSlug: state.data.lessonSlug,
      fallbackUsed: state.data.fallbackUsed,
      latencyMs: state.data.latencyMs,
    });
  };

  return (
    <Card data-testid="ai-recommendation-card">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-2">
            <Sparkles className="h-5 w-5 text-rose-500" aria-hidden />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {state.data.fallbackUsed ? copy.fallbackSubheading : copy.aiSubheading}
            </p>
            <CardTitle className="text-xl">{copy.heading}</CardTitle>
          </div>
        </div>
        <Badge
          variant={state.data.fallbackUsed ? 'outline' : 'secondary'}
          className={cn('px-3 py-1 text-xs font-semibold', state.data.fallbackUsed ? 'text-amber-700 border-amber-200' : 'text-rose-700 bg-rose-50')}
          data-testid="ai-recommendation-badge"
        >
          {state.data.fallbackUsed ? copy.fallbackBadge : copy.aiBadge}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Info className="h-4 w-4" aria-hidden />
            {copy.reasoningLabel}
          </div>
          <p
            className={cn(
              'text-base text-foreground transition-all',
              !expanded && 'line-clamp-3'
            )}
            data-testid="ai-recommendation-reasoning"
          >
            {state.data.reasoning}
          </p>
          {state.data.reasoning.length > 220 && (
            <button
              type="button"
              className="text-sm font-medium text-rose-600 hover:underline"
              onClick={() => setExpanded(prev => !prev)}
            >
              {expanded ? copy.collapseShowLess : copy.collapseShowMore}
            </button>
          )}
          <p className="text-xs text-muted-foreground">{copy.translationNotice}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">{copy.focusStandardsLabel}</p>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="ai-recommendation-standards">
            {state.data.focusStandards.map(code => (
              <Badge key={code} variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                {code}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild onClick={handlePrimaryClick} data-testid="ai-recommendation-start-lesson">
            <Link href={`/student/classes/${classId}/lessons/${state.data.lessonSlug}`}>
              {copy.ctaPrimary}
            </Link>
          </Button>
          <Button asChild variant="ghost" data-testid="ai-recommendation-view-lessons">
            <Link href={`/student/classes/${classId}`}>{copy.ctaSecondary}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState({ polling, copy }: { polling: boolean; copy: typeof translations.en }) {
  return (
    <Card data-testid="ai-recommendation-loading">
      <CardContent className="space-y-3 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gradient-to-r from-rose-100 via-rose-50 to-rose-100" />
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{copy.loadingTitle}</p>
            <p className="text-xs text-muted-foreground">{polling ? copy.pollingHint : copy.loadingBody}</p>
          </div>
        </div>
        <div className="h-3 w-full animate-pulse rounded-full bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
      </CardContent>
    </Card>
  );
}

function ErrorState({
  message,
  classId,
  copy,
}: {
  message: string;
  classId: string;
  copy: typeof translations.en;
}) {
  return (
    <Card data-testid="ai-recommendation-error">
      <CardContent className="space-y-4 py-6 text-center">
        <p className="text-base font-semibold text-foreground">{copy.errorTitle}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild variant="outline">
          <Link href={`/student/classes/${classId}`}>{copy.errorCta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  message,
  classId,
  copy,
}: {
  message: string;
  classId: string;
  copy: typeof translations.en;
}) {
  return (
    <Card data-testid="ai-recommendation-empty">
      <CardContent className="space-y-4 py-6 text-center">
        <p className="text-base font-semibold text-foreground">{copy.emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild variant="secondary">
          <Link href={`/student/classes/${classId}`}>{copy.emptyCta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function defaultRecommendationFetcher(
  attemptId: string,
  signal: AbortSignal
): Promise<RecommendationApiResponse> {
  const response = await fetch('/api/ai/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attemptId }),
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('REQUEST_FAILED');
  }

  return (await response.json()) as RecommendationApiResponse;
}
