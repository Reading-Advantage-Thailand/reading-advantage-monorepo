function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type ResponseInput = {
  standardIds: string[];
  isCorrect: boolean;
  weight: number;
  answeredAt: Date;
};

type ExistingMastery = {
  standardId: string;
  masteryLevel: number;
  evidenceCount: number;
  lastAssessedAt: Date;
};

export type MasteryUpdate = {
  standardId: string;
  masteryLevel: number;
  evidenceCount: number;
  lastAssessedAt: Date;
};

export type MasteryCalculationResult = {
  updates: MasteryUpdate[];
  skipped: number;
};

type Accumulator = {
  totalWeight: number;
  correctWeight: number;
  evidence: number;
  lastAssessedAt: Date;
};

export function calculateMasteryUpdates(input: {
  responses: ResponseInput[];
  existingMastery: ExistingMastery[];
}): MasteryCalculationResult {
  const existingMap = new Map<string, ExistingMastery>();
  for (const row of input.existingMastery) {
    existingMap.set(row.standardId, row);
  }

  const aggregates = new Map<string, Accumulator>();
  let skipped = 0;

  for (const response of input.responses) {
    if (!response.standardIds.length) {
      skipped += 1;
      continue;
    }

    const perStandardWeight =
      response.weight / response.standardIds.length || 0;

    for (const standardId of response.standardIds) {
      const existing = existingMap.get(standardId);
      const current =
        aggregates.get(standardId) ??
        {
          totalWeight: 0,
          correctWeight: 0,
          evidence: 0,
          lastAssessedAt: existing?.lastAssessedAt ?? new Date(0),
        };

      current.totalWeight += perStandardWeight;
      current.correctWeight += response.isCorrect ? perStandardWeight : 0;
      current.evidence += 1;
      current.lastAssessedAt =
        current.lastAssessedAt > response.answeredAt
          ? current.lastAssessedAt
          : response.answeredAt;

      aggregates.set(standardId, current);
    }
  }

  const updates: MasteryUpdate[] = [];

  for (const [standardId, aggregate] of aggregates) {
    const existing = existingMap.get(standardId);
    const previousMastery = existing?.masteryLevel ?? 0;
    const previousEvidence = existing?.evidenceCount ?? 0;
    const newScore =
      aggregate.totalWeight > 0
        ? aggregate.correctWeight / aggregate.totalWeight
        : 0;

    const nextMastery = clamp(previousMastery * 0.35 + newScore * 0.65, 0, 1);

    updates.push({
      standardId,
      masteryLevel: Number(nextMastery.toFixed(4)),
      evidenceCount: previousEvidence + aggregate.evidence,
      lastAssessedAt: aggregate.lastAssessedAt,
    });
  }

  updates.sort((a, b) => a.standardId.localeCompare(b.standardId));

  return { updates, skipped };
}

export function buildResponseInput(params: {
  standardIds: string[];
  isCorrect: boolean;
  weight?: number | null;
  answeredAt?: Date | null;
}): ResponseInput {
  const answeredAt = params.answeredAt ?? new Date();

  return {
    standardIds: params.standardIds,
    isCorrect: params.isCorrect,
    weight: params.weight && params.weight > 0 ? params.weight : 1,
    answeredAt,
  };
}
