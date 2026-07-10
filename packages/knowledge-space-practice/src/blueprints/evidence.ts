// Evidence bridge: converts generic evidence parts to practice.v1 submission parts

import type { GenericEvidencePart, GenericEvidenceResult } from './types.js';

export interface EvidenceAdapter {
  mapPart(part: GenericEvidencePart): PracticeSubmissionPart;
}

export interface PracticeSubmissionPart {
  partId: string;
  rawAnswer: unknown;
  normalizedAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  maxScore?: number;
  misconceptionTags?: string[];
  hintsUsed?: number;
  revealStepsSeen?: number;
}

/**
 * Default mapping function from generic evidence part to practice submission part.
 * @param {GenericEvidencePart} part - Generic evidence part to map
 * @returns {PracticeSubmissionPart} - Mapped practice submission part
 */
function defaultMapPart(part: GenericEvidencePart): PracticeSubmissionPart {
  return {
    partId: part.partId,
    rawAnswer: part.rawAnswer,
    isCorrect: part.isCorrect,
    score: part.score,
    maxScore: part.maxScore,
    misconceptionTags: part.misconceptionTags,
  };
}

/**
 * Converts generic evidence result to practice submission parts.
 * @param {GenericEvidenceResult} result - Generic evidence result with parts array
 * @param {EvidenceAdapter} adapter - Optional custom evidence adapter for mapping
 * @returns {PracticeSubmissionPart[]} - Array of practice submission parts
 */
export function genericEvidenceToSubmissionParts(
  result: GenericEvidenceResult,
  adapter?: EvidenceAdapter,
): PracticeSubmissionPart[] {
  const mapper = adapter ? adapter.mapPart.bind(adapter) : defaultMapPart;
  return result.parts.map(mapper);
}
