/** Guided cartridge state remains deterministic and serializable. */
export type GuidedGameState = { promptId: string; selectedAnswerId: string | null };

/** Deterministic educational result produced by the completed guided step. */
export const educationalResult = {
  objectiveId: "codecamp.game-development.skill.apk-contract",
  correct: true,
  attempts: 1,
} as const;
