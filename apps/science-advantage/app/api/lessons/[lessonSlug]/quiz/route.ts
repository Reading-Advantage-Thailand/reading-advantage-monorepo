import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { gradeAnswer } from '@/lib/quiz/scoring';
import { calculateXpForQuiz, awardXp } from '@/lib/gamification/xp';
import { updateStreakForProfile } from '@/lib/gamification/streak';
import { checkBadgeConditions } from '@/lib/gamification/badges';
import { processMasteryRun } from '@/lib/services/mastery/mastery-worker';
import { startQuiz, submitAttempt } from '@reading-advantage/domain/quiz';

/**
 * GET /api/lessons/{lessonSlug}/quiz
 * Returns a random set of N questions from the lesson's question bank.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ lessonSlug: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { lessonSlug } = await context.params;
    const result = await startQuiz({ user: session.user, tenant: { schoolId: session.user.schoolId }, lessonSlug });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    return NextResponse.json({ error: 'An unexpected error occurred while fetching the quiz' }, { status: 500 });
  }
}

/**
 * POST /api/lessons/{lessonSlug}/quiz
 * Submit a completed quiz attempt with question responses and timing data.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonSlug: string }> }
) {
  try {
    void context;
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const { attemptId, responses } = body;
    if (!attemptId || !responses || !Array.isArray(responses)) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    const result = await submitAttempt({
      user: session.user, tenant: { schoolId: session.user.schoolId },
      input: { attemptId, responses },
      deps: { gradeAnswer, calculateXpForQuiz, awardXp, updateStreakForProfile, checkBadgeConditions, processMasteryRun },
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    return NextResponse.json({ error: 'An unexpected error occurred while submitting the quiz' }, { status: 500 });
  }
}
