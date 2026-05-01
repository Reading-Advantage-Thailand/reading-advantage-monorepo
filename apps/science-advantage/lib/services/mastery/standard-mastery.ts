import type { PrismaClient, StandardMastery } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type StandardMasteryWriteInput = {
  studentId: string;
  standardId: string;
  masteryLevel: number | Decimal;
  evidenceDelta?: number;
  lastAssessedAt: Date;
};

const DEFAULT_EVIDENCE_DELTA = 1;

/** Clamp a raw mastery value to the inclusive [0,1] range and round to 2 decimals. */
export const clampMasteryLevel = (value: number | Decimal) => {
  const numeric = value instanceof Decimal ? value.toNumber() : Number(value);
  if (Number.isNaN(numeric)) {
    throw new TypeError('masteryLevel must be a finite numeric value');
  }

  const clamped = Math.min(1, Math.max(0, numeric));
  // Round to match @db.Decimal(3,2) precision before persisting.
  return new Decimal(clamped.toFixed(2));
};

const resolveEvidenceDelta = (delta: number | undefined) => {
  if (delta === undefined) return DEFAULT_EVIDENCE_DELTA;
  if (!Number.isFinite(delta)) {
    throw new TypeError('evidenceDelta must be a finite number');
  }

  return Math.max(0, Math.floor(delta));
};

export type StandardMasteryWriter = Pick<PrismaClient, '$transaction'> & {
  standardMastery: PrismaClient['standardMastery'];
};

/**
 * Upsert a standard mastery row while ensuring atomic evidence increments and clamped mastery.
 * Wraps the write in a transaction so concurrent updates remain serialized.
 */
export const recordStandardMastery = async (
  prisma: StandardMasteryWriter,
  input: StandardMasteryWriteInput
): Promise<StandardMastery> => {
  const { studentId, standardId, lastAssessedAt } = input;
  const masteryLevel = clampMasteryLevel(input.masteryLevel);
  const evidenceDelta = resolveEvidenceDelta(input.evidenceDelta);

  return prisma.$transaction(async (tx) => {
    return tx.standardMastery.upsert({
      where: {
        studentId_standardId: { studentId, standardId }
      },
      create: {
        studentId,
        standardId,
        masteryLevel,
        evidenceCount: evidenceDelta,
        lastAssessedAt
      },
      update: {
        masteryLevel,
        evidenceCount: { increment: evidenceDelta },
        lastAssessedAt
      }
    });
  });
};
