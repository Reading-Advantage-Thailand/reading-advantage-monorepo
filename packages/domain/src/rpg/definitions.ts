import {
  readToSelectAudioEvidenceSchema,
  type RpgCosmeticId,
  type RpgQuestId,
} from "@reading-advantage/game-contracts";

/** Fixed display data for the first cosmetic reward set. */
export const RPG_COSMETICS = Object.freeze([
  { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand" },
  { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff" },
  { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff" },
] as const);

/** Fixed quest and reward mapping for the first reward set. */
export const RPG_QUESTS = Object.freeze([
  { id: "first-ward", rewardId: "apprentice-wand" },
  { id: "complete-the-ward", rewardId: "graveyard-staff" },
  { id: "perfect-english-audio", rewardId: "echo-staff" },
] as const satisfies readonly { id: RpgQuestId; rewardId: RpgCosmeticId }[]);

/** Trusted saved completion facts used by cosmetic quest rules. */
export interface RpgCompletionFacts {
  /** Saved completion identifier. */
  readonly id: string;
  /** Saved school identifier. */
  readonly schoolId: string;
  /** Saved user identifier. */
  readonly userId: string;
  /** Canonical game identifier. */
  readonly gameType: string;
  /** Submitted correct answer count. */
  readonly correctAnswers: number;
  /** Submitted answer count. */
  readonly totalAttempts: number;
  /** Server-saved terminal victory state. */
  readonly victory: boolean;
  /** Validated completion metadata. */
  readonly metadata?: Record<string, unknown>;
}

/** Eligible quest and cosmetic pair. */
export interface EligibleRpgReward {
  /** Quest completed by the saved completion. */
  readonly questId: RpgQuestId;
  /** Cosmetic granted by the quest. */
  readonly cosmeticId: RpgCosmeticId;
}

/**
 * The completions that count as the ward: the 3D Hero vs. Zombie (a class challenge or a `-story`
 * practice run) and its 2D predecessor's stored name.
 */
export const WARD_GAME_TYPES: ReadonlySet<string> = new Set(["hero-vs-zombie", "hero-vs-zombie-story", "wizard-vs-zombie"]);

/**
 * The completions whose English answer audio run can earn the Echo Staff: the ward games and the
 * two dragon games (owner decision 2026-10-07). The dragon ids are the same in 2D and 3D.
 */
export const ECHO_GAME_TYPES: ReadonlySet<string> = new Set([
  ...WARD_GAME_TYPES, "dragon-flight", "dragon-flight-story", "dragon-rider", "dragon-rider-story",
]);

/**
 * True when the completion carries English answer audio evidence with every item answered and the
 * last attempt of each question correct, and the result counts match the evidence.
 * @param completion Trusted completion facts.
 * @returns Whether the run is a perfect English answer audio run.
 */
function isPerfectAnswerAudioRun(completion: RpgCompletionFacts): boolean {
  const evidence = readToSelectAudioEvidenceSchema.safeParse(completion.metadata?.learningEvidence);
  if (!evidence.success) return false;
  const completeQuestions = evidence.data.questions.every(({ selectionAttempts }) =>
    selectionAttempts.at(-1)?.completedQuestion === true);
  return evidence.data.questions.length === evidence.data.itemCount
    && completeQuestions
    && completion.totalAttempts === evidence.data.itemCount
    && completion.correctAnswers === evidence.data.itemCount;
}

/**
 * Finds cosmetic rewards earned by one saved completion.
 * @param completion Trusted completion facts from the current transaction.
 * @returns Eligible quest and cosmetic pairs in catalog order.
 */
export function getEligibleRpgRewards(
  completion: RpgCompletionFacts,
): EligibleRpgReward[] {
  if (completion.totalAttempts < 1) return [];
  const rewards: EligibleRpgReward[] = [];
  if (WARD_GAME_TYPES.has(completion.gameType)) {
    rewards.push({ questId: "first-ward", cosmeticId: "apprentice-wand" });
    if (completion.victory) rewards.push({ questId: "complete-the-ward", cosmeticId: "graveyard-staff" });
  }
  if (ECHO_GAME_TYPES.has(completion.gameType) && completion.victory && isPerfectAnswerAudioRun(completion)) {
    rewards.push({ questId: "perfect-english-audio", cosmeticId: "echo-staff" });
  }
  return rewards;
}
