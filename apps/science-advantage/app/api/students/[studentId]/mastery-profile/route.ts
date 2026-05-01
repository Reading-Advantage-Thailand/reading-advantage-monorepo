import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import prisma from '@/lib/prisma';

// Query params schema
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

// Mastery thresholds
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

// Extract strand code from standard code (e.g., "Sc1.1-G3" -> "Sc1")
function extractStrandCode(standardCode: string): string {
  const match = standardCode.match(/^([A-Za-z]+\d+)/);
  return match ? match[1] : 'Unknown';
}

// Map strand codes to titles
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

    // Authorization: student can only access self, or teacher/admin with dev impersonation
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

    // Parse query params
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

    // Get student info
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, gradeLevel: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if there are any pending mastery runs
    const pendingRuns = await prisma.masteryRun.findFirst({
      where: {
        studentId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const status = pendingRuns ? 'CALCULATING' : 'READY';
    const retryAfterSeconds = pendingRuns ? 10 : undefined;

    // Build mastery query filters
    const masteryWhere: {
      studentId: string;
      standardId?: { in: string[] };
      id?: { gt: string };
    } = {
      studentId,
    };

    // Filter by strand if provided
    if (strand) {
      const standardsInStrand = await prisma.standard.findMany({
        where: {
          code: { startsWith: strand },
        },
        select: { id: true },
      });

      if (standardsInStrand.length === 0) {
        // No standards in this strand
        return NextResponse.json({
          status,
          generatedAt: new Date().toISOString(),
          retryAfterSeconds,
          student: {
            id: student.id,
            name: student.name,
            grade: student.gradeLevel,
          },
          strands: [],
          nextCursor: null,
        });
      }

      masteryWhere.standardId = {
        in: standardsInStrand.map((s) => s.id),
      };
    }

    // Cursor pagination
    if (cursor) {
      masteryWhere.id = { gt: cursor };
    }

    // Fetch mastery records with standard details
    const masteryRecords = await prisma.standardMastery.findMany({
      where: masteryWhere,
      include: {
        standard: {
          select: {
            id: true,
            code: true,
            description: true,
            framework: true,
            gradeLevel: true,
          },
        },
      },
      orderBy: { id: 'asc' },
      take: limit + 1, // Fetch one extra to check if there's a next page
    });

    // Check if there's a next page
    const hasNextPage = masteryRecords.length > limit;
    const records = hasNextPage ? masteryRecords.slice(0, limit) : masteryRecords;
    const nextCursor = hasNextPage ? records[records.length - 1]?.id : null;

    // Group by strand
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
      const strandCode = extractStrandCode(record.standard.code);
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
        code: record.standard.code,
        titleEn: record.standard.description,
        titleTh: record.standard.description, // TODO: Add Thai translations when schema supports it
        masteryLevel,
        masteryLabel: getMasteryLabel(masteryLevel),
        masteryColorToken: getMasteryColorToken(masteryLevel),
        evidenceCount: record.evidenceCount,
        lastAssessedAt: record.lastAssessedAt.toISOString(),
        ...(includeRecommendations && {
          aiAnnotation: {
            recommended: false, // TODO: Integrate with AI recommendation service
            traceId: '',
          },
        }),
      };

      strandMap.get(strandCode)!.standards.push(standardData);
    }

    // Calculate mastery averages for each strand and sort strands by average (weakest first)
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

    // Emit metrics
    metrics.increment('mastery_profile_requests_total', 1, { studentId });
    metrics.observe('mastery_profile_latency_ms', durationMs, { studentId });

    if (status === 'CALCULATING') {
      metrics.increment('mastery_profile_status_calculating_total', 1, {
        studentId,
      });
    }

    // Log trace
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
