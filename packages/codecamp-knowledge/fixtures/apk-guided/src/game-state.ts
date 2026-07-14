/** Guided cartridge state remains deterministic and serializable. */
export type GuidedGameState = { promptId: string; selectedAnswerId: string | null };

/** Complete this function by deriving every result field from its inputs. */
export function evaluateAttempt(_objectiveId: string, _selectedAnswerId: string, _correctAnswerId: string, _attempts: number) {
  throw new Error("TODO: return the deterministic educational result");
}
