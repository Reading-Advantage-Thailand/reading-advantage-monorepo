import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, db, eq, inArray, lt, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceStandardMastery,
  scienceStandards,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { interventionCache } from '@/lib/interventions/cache';
import { interventionConfig } from '@/lib/interventions/config';
import { detectAlerts } from '@/lib/interventions/detect-alerts';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

const querySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(interventionConfig.maxLimit)
    .optional(),
  severity: z.enum(['critical', 'warning', 'moderate']).optional(),
  cursor: z.string().optional(),
  since: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
  refresh: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
});

function buildBadRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const startedAt = Date.now();

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
      }
    );
  }

  const resolvedParams = await params;
  const { classId } = resolvedParams;

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    severity: url.searchParams.get('severity') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    since: url.searchParams.get('since') ?? undefined,
    refresh: url.searchParams.get('refresh') ?? undefined,
  });

  if (!parsedQuery.success) {
    return buildBadRequest('Invalid query parameters');
  }

  const { limit, severity, cursor, since, refresh } = parsedQuery.data;
  const limitValue = limit ?? interventionConfig.defaultLimit;
  const sinceDate = since ?? undefined;
  const bypassCache = refresh ?? false;

  try {
    const [klass] = await db
      .select({
        id: scienceClasses.id,
        name: scienceClasses.name,
        teacherId: scienceClasses.teacherId,
      })
      .from(scienceClasses)
      .where(eq(scienceClasses.id, classId))
      .limit(1);

    if (!klass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isClassTeacher =
      session.user.role === 'TEACHER' && session.user.id === klass.teacherId;

    if (!isAdmin && !isClassTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        gradeLevel: users.gradeLevel,
      })
      .from(scienceClassStudents)
      .innerJoin(users, eq(users.id, scienceClassStudents.studentId))
      .where(eq(scienceClassStudents.classId, classId));

    if (students.length === 0) {
      return NextResponse.json(
        {
          classId,
          generatedAt: new Date().toISOString(),
          alerts: [],
          nextCursor: null,
          totalAlerts: 0,
        },
        {
          headers: {
            'cache-control': `max-age=${interventionConfig.freshnessHeaderSeconds}`,
            'x-alert-trace-id': randomUUID(),
          },
        }
      );
    }

    let cacheStatus: 'hit' | 'miss' | 'bypass' = 'miss';
    let cached = null;

    if (!bypassCache) {
      cached = interventionCache.get(classId);
      cacheStatus = cached ? 'hit' : 'miss';
    } else {
      cacheStatus = 'bypass';
    }

    const payload =
      cached ??
      (await (async () => {
        const studentIds = students.map((student) => student.id);

        const masteryRows = await db
          .select({
            studentId: scienceStandardMastery.studentId,
            masteryLevel: scienceStandardMastery.masteryLevel,
            lastAssessedAt: scienceStandardMastery.lastAssessedAt,
            standardCode: scienceStandards.code,
            standardDescription: scienceStandards.description,
          })
          .from(scienceStandardMastery)
          .innerJoin(
            scienceStandards,
            eq(scienceStandards.id, scienceStandardMastery.standardId)
          )
          .where(
            and(
              inArray(scienceStandardMastery.studentId, studentIds),
              lt(
                scienceStandardMastery.masteryLevel,
                sql`${interventionConfig.masteryFilterLevel}`
              )
            )
          );

        const masteryRecords = masteryRows.map((row) => ({
          studentId: row.studentId,
          masteryLevel: row.masteryLevel,
          lastAssessedAt: row.lastAssessedAt,
          standard: {
            code: row.standardCode,
            description: row.standardDescription,
          },
        }));

        const studentsForDetection = students.map((student) => ({
          id: student.id,
          name: student.name ?? '',
          gradeLevel: student.gradeLevel,
        }));

        const detectionResult = detectAlerts({
          classMeta: { id: klass.id, name: klass.name },
          students: studentsForDetection,
          masteryRecords,
          maxAlerts: interventionConfig.detectionCap,
        });

        const generatedPayload = {
          classId: detectionResult.classId,
          generatedAt: new Date().toISOString(),
          alerts: detectionResult.alerts,
        };

        interventionCache.set(classId, generatedPayload);
        return generatedPayload;
      })());

    let filteredAlerts = payload.alerts;

    if (severity) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.alertSeverity === severity
      );
    }

    if (sinceDate) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => new Date(alert.detectedAt) > sinceDate
      );
    }

    if (cursor) {
      const cursorIndex = filteredAlerts.findIndex(
        (alert) => alert.cursor === cursor
      );
      if (cursorIndex >= 0) {
        filteredAlerts = filteredAlerts.slice(cursorIndex + 1);
      }
    }

    const limitedAlerts = filteredAlerts.slice(0, limitValue);
    const nextCursor =
      filteredAlerts.length > limitValue
        ? filteredAlerts[limitValue - 1]?.cursor ?? null
        : null;

    const responseTraceId = randomUUID();

    const response = NextResponse.json(
      {
        classId: payload.classId,
        generatedAt: payload.generatedAt,
        alerts: limitedAlerts,
        nextCursor,
        totalAlerts: filteredAlerts.length,
      },
      {
        headers: {
          'cache-control': `max-age=${interventionConfig.freshnessHeaderSeconds}`,
          'x-alert-trace-id': responseTraceId,
        },
      }
    );

    metrics.observe('intervention_alerts_latency_ms', Date.now() - startedAt, {
      classId,
      cacheStatus,
    });
    metrics.increment(
      'intervention_alerts_generated_total',
      limitedAlerts.length,
      {
        classId,
        severity: severity ?? 'all',
      }
    );

    logger.info('teacher_intervention.alerts_served', {
      classId,
      cacheStatus,
      alertCount: limitedAlerts.length,
      totalAlerts: filteredAlerts.length,
      severity: severity ?? 'all',
      traceId: responseTraceId,
    });

    return response;
  } catch (error) {
    metrics.increment('intervention_alerts_errors_total', 1, {
      classId,
    });
    logger.error('teacher_intervention.alerts_failed', {
      classId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Unable to generate intervention alerts' },
      { status: 500 }
    );
  }
}
