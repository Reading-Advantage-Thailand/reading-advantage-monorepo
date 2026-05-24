import { randomUUID } from 'crypto';

import type {
  scienceClasses,
  scienceStandardMastery,
  users,
} from '@reading-advantage/db/schema';

import { interventionConfig, type AlertSeverity } from './config';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Class = typeof scienceClasses.$inferSelect;
type StandardMastery = typeof scienceStandardMastery.$inferSelect;
type user = typeof users.$inferSelect;

type StudentRosterEntry = {
  id: user['id'];
  name: NonNullable<user['name']>;
  gradeLevel: user['gradeLevel'];
};

export type MasteryRecord = Pick<
  StandardMastery,
  'studentId' | 'lastAssessedAt'
> & {
  // Accept both Drizzle's decimal string and Prisma's Decimal-like object so
  // existing Prisma-based callers (scripts/dev-interventions.ts, retired in
  // Phase 6) still type-check during the migration window.
  masteryLevel: string | { toString(): string };
  standard: {
    code: string;
    description: string | null;
  };
};

export type AlertPayload = {
  studentId: string;
  studentName: string;
  studentGrade: number | null;
  avatarInitials: string;
  alertSeverity: AlertSeverity;
  weakStandards: Array<{
    code: string;
    title: string | null;
    masteryLevel: number;
    lastAssessedAt: string;
  }>;
  weakStandardCount: number;
  avgWeakMastery: number;
  lastAssessmentAgeDays: number;
  score: number;
  traceId: string;
  detectedAt: string;
  cursor: string;
};

type DetectAlertsArgs = {
  classMeta: Pick<Class, 'id' | 'name'>;
  students: StudentRosterEntry[];
  masteryRecords: MasteryRecord[];
  now?: Date;
  maxAlerts?: number;
};

type StudentAggregate = {
  student: StudentRosterEntry;
  weakStandards: MasteryRecord[];
};

function createInitials(name: string) {
  const tokens = name
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return '??';
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
}

function computeDaysSince(date: Date, now: Date) {
  const diff = now.getTime() - date.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Number((diff / MS_PER_DAY).toFixed(2));
}

function determineSeverity(
  weakCount: number,
  avgMastery: number,
  lastAssessmentDays: number,
  lowestMastery: number
): AlertSeverity | null {
  const { thresholds } = interventionConfig;

  const meetsCriticalByMastery =
    weakCount >= thresholds.critical.minWeakStandards &&
    avgMastery < thresholds.critical.maxAvgMastery;
  const meetsCriticalByStaleness =
    thresholds.critical.stalenessDays !== undefined &&
    thresholds.critical.stalenessMastery !== undefined &&
    lastAssessmentDays >= thresholds.critical.stalenessDays &&
    lowestMastery < thresholds.critical.stalenessMastery;

  if (meetsCriticalByMastery || meetsCriticalByStaleness) {
    return 'critical';
  }

  const meetsWarning =
    weakCount >= thresholds.warning.minWeakStandards &&
    avgMastery < thresholds.warning.maxAvgMastery;
  if (meetsWarning) {
    return 'warning';
  }

  const meetsModerate =
    weakCount >= thresholds.moderate.minWeakStandards &&
    avgMastery < thresholds.moderate.maxAvgMastery;
  if (meetsModerate) {
    return 'moderate';
  }

  return null;
}

export function detectAlerts({
  classMeta,
  students,
  masteryRecords,
  now = new Date(),
  maxAlerts = interventionConfig.detectionCap,
}: DetectAlertsArgs) {
  if (!students.length || !masteryRecords.length) {
    return {
      classId: classMeta.id,
      alerts: [] as AlertPayload[],
    };
  }

  const studentsById = new Map(students.map((student) => [student.id, student]));

  const masteryByStudent = new Map<string, MasteryRecord[]>();
  for (const record of masteryRecords) {
    if (Number(record.masteryLevel) >= interventionConfig.masteryFilterLevel) {
      continue;
    }
    const list = masteryByStudent.get(record.studentId) ?? [];
    list.push(record);
    masteryByStudent.set(record.studentId, list);
  }

  const aggregates: StudentAggregate[] = [];
  for (const [studentId, records] of masteryByStudent.entries()) {
    const student = studentsById.get(studentId);
    if (!student) {
      continue;
    }

    const sortedRecords = [...records].sort(
      (a, b) => Number(a.masteryLevel) - Number(b.masteryLevel)
    );

    aggregates.push({
      student,
      weakStandards: sortedRecords,
    });
  }

  const alerts: AlertPayload[] = [];

  for (const aggregate of aggregates) {
    const { student, weakStandards } = aggregate;
    if (!weakStandards.length) {
      continue;
    }

    const masteryValues = weakStandards.map((record) =>
      Number(record.masteryLevel)
    );
    const avgWeakMastery =
      masteryValues.reduce((sum, level) => sum + level, 0) /
      masteryValues.length;

    const latestAssessment = weakStandards.reduce((latest, record) => {
      return record.lastAssessedAt > latest ? record.lastAssessedAt : latest;
    }, weakStandards[0].lastAssessedAt);

    const daysSinceLastAssessment = computeDaysSince(latestAssessment, now);
    const lowestMastery = masteryValues.reduce((min, v) => (v < min ? v : min), masteryValues[0]);
    const weakCount = weakStandards.length;

    const severity = determineSeverity(
      weakCount,
      avgWeakMastery,
      daysSinceLastAssessment,
      lowestMastery
    );

    if (!severity) {
      continue;
    }

    const score =
      weakCount * interventionConfig.weights.weakStandard +
      (1 - avgWeakMastery) * interventionConfig.weights.masteryGap +
      (daysSinceLastAssessment / interventionConfig.stalenessDivisorDays) *
        interventionConfig.weights.staleness;

    const detectedAt = now.toISOString();
    const traceId = randomUUID();

    alerts.push({
      studentId: student.id,
      studentName: student.name,
      studentGrade: student.gradeLevel ?? null,
      avatarInitials: createInitials(student.name),
      alertSeverity: severity,
      weakStandards: weakStandards.map((record) => ({
        code: record.standard.code,
        title: record.standard.description,
        masteryLevel: Number(record.masteryLevel),
        lastAssessedAt: record.lastAssessedAt.toISOString(),
      })),
      weakStandardCount: weakCount,
      avgWeakMastery: Number(avgWeakMastery.toFixed(2)),
      lastAssessmentAgeDays: daysSinceLastAssessment,
      score: Number(score.toFixed(4)),
      traceId,
      detectedAt,
      cursor: traceId,
    });
  }

  alerts.sort((a, b) => b.score - a.score);

  return {
    classId: classMeta.id,
    alerts: alerts.slice(0, maxAlerts),
  };
}
