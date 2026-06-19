import { randomUUID } from 'crypto';
import { runWithRequestContext } from '@/lib/observability/context';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { interventionCache } from '@/lib/interventions/cache';
import { interventionConfig } from '@/lib/interventions/config';
import { detectAlerts } from '@/lib/interventions/detect-alerts';
import type { AlertPayload } from '@/lib/interventions/detect-alerts';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { listAlerts } from '@reading-advantage/domain/interventions';
import { parsePath, parseQuery, ValidationError } from '@/lib/validations/api-helpers';
import { classIdParamSchema } from '@/lib/validations/params';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(interventionConfig.maxLimit).optional(),
  severity: z.enum(['critical', 'warning', 'moderate']).optional(),
  cursor: z.string().optional(),
  since: z.string().datetime({ offset: true }).optional().transform((v) => (v ? new Date(v) : undefined)),
  refresh: z.string().optional().transform((v) => v === 'true' || v === '1'),
});

const cfg: Parameters<typeof listAlerts>[0]['deps'] = {
  masteryFilterLevel: interventionConfig.masteryFilterLevel,
  detectionCap: interventionConfig.detectionCap,
  defaultLimit: interventionConfig.defaultLimit,
  maxLimit: interventionConfig.maxLimit,
  freshnessHeaderSeconds: interventionConfig.freshnessHeaderSeconds,
  cacheGet: (id: string) => interventionCache.get(id),
  cacheSet: (id: string, p: { classId: string; generatedAt: string; alerts: AlertPayload[] }) => interventionCache.set(id, p),
  detectAlerts,
} as Parameters<typeof listAlerts>[0]['deps'];

/**
 * GET /api/teachers/classes/{classId}/intervention-alerts
 * Returns intervention alerts for students with low mastery levels.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {

    const startedAt = Date.now();
    const traceId = randomUUID();
    try {
      const session = await getCurrentSession();
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { classId } = parsePath(await params, classIdParamSchema);
      const parsed = parseQuery(request, querySchema);
      const result = await listAlerts({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, ...parsed }, deps: cfg });
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      metrics.observe('intervention_alerts_latency_ms', Date.now() - startedAt, { classId, cacheStatus: result.cacheStatus });
      metrics.increment('intervention_alerts_generated_total', result.alerts.length, { classId });
      logger.info('teacher_intervention.alerts_served', { classId, cacheStatus: result.cacheStatus, alertCount: result.alerts.length, traceId });
      return NextResponse.json(
        { classId: result.classId, generatedAt: result.generatedAt, alerts: result.alerts, nextCursor: result.nextCursor, totalAlerts: result.totalAlerts },
        { headers: { 'cache-control': `max-age=${cfg.freshnessHeaderSeconds}`, 'x-alert-trace-id': traceId } }
      );
    } catch (error) {
      if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
      if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
      metrics.increment('intervention_alerts_errors_total'); logger.error('teacher_intervention.alerts_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return NextResponse.json({ error: 'Unable to generate intervention alerts' }, { status: 500 });
    }

  });
}
