import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, db, desc, eq, gt, inArray, like, or } from '@reading-advantage/db';
import {
  scienceMasteryRuns,
  scienceStandardMastery,
  scienceStandards,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

const querySchema = z.object({
  strand: z.string().optional(),
  grade: z.coerce.number().int().min(3).max(6).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  cursor: z.string().optional(),
  includeRecommendations: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

const MASTERY_THRESHOLDS = {
  CRITICAL: 0.6,
  CAUTION: 0.8,
} as const;

function getMasteryLabel(level: number): string {
  if (level < MASTERY_THRESHOLDS.CRITICAL) return 'Needs Support';
  if (level < MASTERY_THRESHOLDS.CAUTION) return 'Developing';
  return 'Proficient';
}

function getMasteryColorToken(level: number): string {
  if (level < MASTERY_THRESHOLDS.CRITICAL) return 'critical';
  if (level < MASTERY_THRESHOLDS.CAUTION) return 'caution';
  return 'strong';
}

function extractStrandCode(standardCode: string): string {
  const match = standardCode.match(/^([A-Za-z]+\d+)/);
  return match ? match[1] : 'Unknown';
}

function getStrandTitle(strandCode: string): string {
  const strandTitles: Record<string, string> = {
    Sc1: 'Living Things',
    Sc2: 'Life and Environment',
    Sc3: 'Substances and Their Properties',
    Sc4: 'Forces and Motion',
    Sc5: 'Energy',
    Sc6: 'Process of Change',
    Sc7: 'Astronomy and Space',
    Sc8: 'Nature of Science and Technology',
  };
  return strandTitles[strandCode] || strandCode;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const startedAt = Date.now();

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { studentId } = resolvedParams;

    const isOwnProfile = session.user.id === studentId;
    const isDev = env.DEV_AUTH_ENABLED;
    const isTeacherOrAdmin =
      session.user.role === 'TEACHER' || session.user.role === 'ADMIN';
    const canImpersonate = isDev && isTeacherOrAdmin;

    if (!isOwnProfile && !canImpersonate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const queryParams = {
      strand: url.searchParams.get('strand') || undefined,
      grade: url.searchParams.get('grade') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      includeRecommendations:
        url.searchParams.get('includeRecommendations') || undefined,
    };

    const { strand, limit, cursor, includeRecommendations } =
      querySchema.parse(queryParams);

    const [student] = await db
      .select({
        id: users.id,
        name: users.name,
        gradeLevel: users.gradeLevel,
      })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const [pendingRun] = await db
      .select({ attemptId: scienceMasteryRuns.attemptId })
      .from(scienceMasteryRuns)
      .where(
        and(
          eq(scienceMasteryRuns.studentId, studentId),
          or(
            eq(scienceMasteryRuns.status, 'PENDING'),
            eq(scienceMasteryRuns.status, 'PROCESSING')
          )
        )
      )
      .orderBy(desc(scienceMasteryRuns.createdAt))
      .limit(1);

    const status = pendingRun ? 'CALCULATING' : 'READY';
    const retryAfterSeconds = pendingRun ? 10 : undefined;

    let strandStandardIds: string[] | null = null;
    if (strand) {
      const standardsInStrand = await db
        .select({ id: scienceStandards.id })
        .from(scienceStandards)
        .where(like(scienceStandards.code, `${strand}%`));

      if (standardsInStrand.length === 0) {
        return NextResponse.json({
          status,
          generatedAt: new Date().toISOString(),
          ...(retryAfterSeconds && { retryAfterSeconds }),
          student: {
            id: student.id,
            name: student.name,
            grade: student.gradeLevel,
          },
          strands: [],
          nextCursor: null,
        });
      }

      strandStandardIds = standardsInStrand.map((s) => s.id);
    }

    const filters = [eq(scienceStandardMastery.studentId, studentId)];
    if (strandStandardIds) {
      filters.push(inArray(scienceStandardMastery.standardId, strandStandardIds));
    }
    if (cursor) {
      filters.push(gt(scienceStandardMastery.id, cursor));
    }

    const masteryRows = await db
      .select({
        id: scienceStandardMastery.id,
        standardId: scienceStandardMastery.standardId,
        masteryLevel: scienceStandardMastery.masteryLevel,
        evidenceCount: scienceStandardMastery.evidenceCount,
        lastAssessedAt: scienceStandardMastery.lastAssessedAt,
        standardCode: scienceStandards.code,
        standardDescription: scienceStandards.description,
        standardFramework: scienceStandards.framework,
        standardGradeLevel: scienceStandards.gradeLevel,
      })
      .from(scienceStandardMastery)
      .innerJoin(
        scienceStandards,
        eq(scienceStandards.id, scienceStandardMastery.standardId)
      )
      .where(and(...filters))
      .orderBy(asc(scienceStandardMastery.id))
      .limit(limit + 1);

    const hasNextPage = masteryRows.length > limit;
    const records = hasNextPage ? masteryRows.slice(0, limit) : masteryRows;
    const nextCursor = hasNextPage ? records[records.length - 1]?.id ?? null : null;

    const strandMap = new Map<
      string,
      {
        code: string;
        title: string;
        standards: Array<{
          standardId: string;
          code: string;
          titleEn: string;
          titleTh: string;
          masteryLevel: number;
          masteryLabel: string;
          masteryColorToken: string;
          evidenceCount: number;
          lastAssessedAt: string;
          aiAnnotation?: {
            recommended: boolean;
            traceId: string;
          };
        }>;
      }
    >();

    for (const record of records) {
      const strandCode = extractStrandCode(record.standardCode);
      const masteryLevel = Number(record.masteryLevel);

      if (!strandMap.has(strandCode)) {
        strandMap.set(strandCode, {
          code: strandCode,
          title: getStrandTitle(strandCode),
          standards: [],
        });
      }

      const standardData = {
        standardId: record.standardId,
        code: record.standardCode,
        titleEn: record.standardDescription,
        titleTh: record.standardDescription,
        masteryLevel,
        masteryLabel: getMasteryLabel(masteryLevel),
        masteryColorToken: getMasteryColorToken(masteryLevel),
        evidenceCount: record.evidenceCount,
        lastAssessedAt: record.lastAssessedAt.toISOString(),
        ...(includeRecommendations && {
          aiAnnotation: {
            recommended: false,
            traceId: '',
          },
        }),
      };

      strandMap.get(strandCode)!.standards.push(standardData);
    }

    const strands = Array.from(strandMap.values())
      .map((strand) => {
        const totalMastery = strand.standards.reduce(
          (sum, std) => sum + std.masteryLevel,
          0
        );
        const masteryAverage =
          strand.standards.length > 0
            ? totalMastery / strand.standards.length
            : 0;

        return {
          ...strand,
          masteryAverage: Math.round(masteryAverage * 100) / 100,
        };
      })
      .sort((a, b) => a.masteryAverage - b.masteryAverage);

    const durationMs = Date.now() - startedAt;

    metrics.increment('mastery_profile_requests_total', 1, { studentId });
    metrics.observe('mastery_profile_latency_ms', durationMs, { studentId });

    if (status === 'CALCULATING') {
      metrics.increment('mastery_profile_status_calculating_total', 1, {
        studentId,
      });
    }

    logger.info('mastery.profile.fetch', {
      studentId,
      status,
      recordCount: records.length,
      strandCount: strands.length,
      durationMs,
      includeRecommendations,
    });

    return NextResponse.json({
      status,
      generatedAt: new Date().toISOString(),
      ...(retryAfterSeconds && { retryAfterSeconds }),
      student: {
        id: student.id,
        name: student.name,
        grade: student.gradeLevel,
      },
      strands,
      nextCursor,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logger.error('mastery.profile.error', {
      durationMs,
      message:
        error instanceof Error
          ? error.message
          : 'Unknown mastery profile error',
    });

    metrics.increment('mastery_profile_errors_total', 1);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
