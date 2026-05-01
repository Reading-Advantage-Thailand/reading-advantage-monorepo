export type AlertSeverity = 'critical' | 'warning' | 'moderate';

type SeverityThreshold = {
  minWeakStandards: number;
  maxAvgMastery: number;
  stalenessDays?: number;
  stalenessMastery?: number;
};

type InterventionConfig = {
  cacheTtlMs: number;
  freshnessHeaderSeconds: number;
  defaultLimit: number;
  maxLimit: number;
  detectionCap: number;
  masteryFilterLevel: number;
  stalenessDivisorDays: number;
  weights: {
    weakStandard: number;
    masteryGap: number;
    staleness: number;
  };
  thresholds: Record<AlertSeverity, SeverityThreshold>;
};

export const interventionConfig: InterventionConfig = {
  cacheTtlMs: 5 * 60 * 1000,
  freshnessHeaderSeconds: 60,
  defaultLimit: 20,
  maxLimit: 50,
  detectionCap: 50,
  masteryFilterLevel: 0.6,
  stalenessDivisorDays: 7,
  weights: {
    weakStandard: 0.5,
    masteryGap: 0.3,
    staleness: 0.2,
  },
  thresholds: {
    critical: {
      minWeakStandards: 3,
      maxAvgMastery: 0.4,
      stalenessDays: 14,
      stalenessMastery: 0.5,
    },
    warning: {
      minWeakStandards: 2,
      maxAvgMastery: 0.5,
    },
    moderate: {
      minWeakStandards: 1,
      maxAvgMastery: 0.6,
    },
  },
};

export type { InterventionConfig, SeverityThreshold };
