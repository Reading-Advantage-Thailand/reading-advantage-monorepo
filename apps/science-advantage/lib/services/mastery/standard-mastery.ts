import { sql } from '@reading-advantage/db';
import { scienceStandardMastery } from '@reading-advantage/db/schema';
import type { DB } from '@reading-advantage/db';

export type StandardMasteryWriteInput = {
  studentId: string;
  standardId: string;
  schoolId: string;
  /** Mastery value in [0,1]; rounded to 2 decimals before persisting. */
  masteryLevel: number;
  evidenceDelta?: number;
  lastAssessedAt: Date;
};

const DEFAULT_EVIDENCE_DELTA = 1;

/** Clamp a raw mastery value to the inclusive [0,1] range and round to 2 decimals.
 *  Returns the string representation Drizzle/postgres-js expects for a decimal column. */
export const clampMasteryLevel = (value: number): string => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new TypeError('masteryLevel must be a finite numeric value');
  }

  const clamped = Math.min(1, Math.max(0, numeric));
  // Round to match decimal(3,2) precision before persisting.
  return clamped.toFixed(2);
};

const resolveEvidenceDelta = (delta: number | undefined): number => {
  if (delta === undefined) return DEFAULT_EVIDENCE_DELTA;
  if (!Number.isFinite(delta)) {
    throw new TypeError('evidenceDelta must be a finite number');
  }

  return Math.max(0, Math.floor(delta));
};

export type StandardMasteryRow = typeof scienceStandardMastery.$inferSelect;

/**
 * Upsert a standard mastery row while ensuring atomic evidence increments and
 * clamped mastery. Uses ON CONFLICT to make the write atomic so concurrent
 * writers do not race between SELECT/INSERT.
 *
 * The caller is responsible for tenant scoping (typically by passing a
 * TenantDB as `client`).
 *
 * @param client - Drizzle database client or tenant-scoped equivalent.
 * @param input - Standard mastery fields including the target schoolId.
 * @returns The persisted row.
 */
export const recordStandardMastery = async (
  client: DB,
  input: StandardMasteryWriteInput,
): Promise<StandardMasteryRow> => {
  const { studentId, standardId, schoolId, lastAssessedAt } = input;
  const masteryLevel = clampMasteryLevel(input.masteryLevel);
  const evidenceDelta = resolveEvidenceDelta(input.evidenceDelta);

  const [row] = await client
    .insert(scienceStandardMastery)
    .values({
      studentId,
      standardId,
      masteryLevel,
      evidenceCount: evidenceDelta,
      lastAssessedAt,
      schoolId,
    })
    .onConflictDoUpdate({
      target: [
        scienceStandardMastery.studentId,
        scienceStandardMastery.standardId,
      ],
      set: {
        masteryLevel,
        evidenceCount: sql`${scienceStandardMastery.evidenceCount} + ${evidenceDelta}`,
        lastAssessedAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
};