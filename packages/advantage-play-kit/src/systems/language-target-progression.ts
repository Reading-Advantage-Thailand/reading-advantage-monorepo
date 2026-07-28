/**
 * `capability:language-target-progression` shared core.
 *
 * Shared progression primitives own current-target matching and ordered index
 * advancement. A pure matcher consumes stable target and candidate identity
 * and returns progress without rendering or transport coupling. Games own
 * spatial selection, penalties, rewards, combo, trails, mastery, sentence
 * changes, and terminal effects.
 *
 * Source evidence: astral-mage, babel-architect, dungeon-liberator,
 * enchanted-library, griffin-riders-escape.
 */

/** Identity functions that map targets and candidates to a stable comparison key. */
export interface TargetIdentityOptions<Target, Candidate> {
  /** Maps a target to its stable identity key. */
  readonly targetId: (target: Target) => string;
  /** Maps a candidate to its stable identity key. */
  readonly candidateId: (candidate: Candidate) => string;
}

/** Immutable snapshot of progression state for diagnostics and QC. */
export interface ProgressionSnapshot<Target> {
  /** The ordered target list the matcher was constructed with. */
  readonly targets: readonly Target[];
  /** Index of the next target to match, or `targets.length` when complete. */
  readonly currentIndex: number;
  /** Number of targets matched so far. */
  readonly completedCount: number;
  /** Whether every target has been matched. */
  readonly isComplete: boolean;
  /** The next target to match, or `undefined` when complete. */
  readonly currentTarget: Target | undefined;
}

/** Result of one match attempt against the current target. */
export interface MatchResult {
  /** Whether the candidate identity matched the current target identity. */
  readonly matched: boolean;
  /** Whether matching advanced the ordered index. */
  readonly progressed: boolean;
}

function defaultStringId(value: string): string {
  return value;
}

/**
 * Creates a pure ordered target progression matcher.
 * @param targets Nonempty ordered list of target identities to match in sequence.
 * @param identity Optional identity functions for non-string targets.
 * @returns A transport-independent matcher with snapshot and reset helpers.
 * @throws When the target list is empty or any target identity is blank.
 */
export function createLanguageTargetProgression<Target, Candidate = Target>(
  targets: readonly Target[],
  identity?: TargetIdentityOptions<Target, Candidate>,
): LanguageTargetProgression<Target, Candidate> {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("Language target progression requires a nonempty target list");
  }
  const targetId = identity?.targetId ?? (defaultStringId as unknown as (target: Target) => string);
  const candidateId = identity?.candidateId ?? (defaultStringId as unknown as (candidate: Candidate) => string);

  const frozenTargets = Object.freeze([...targets]);
  const identityKeys = frozenTargets.map((target) => {
    const key = targetId(target);
    if (typeof key !== "string" || key.trim().length === 0) {
      throw new Error("Language target progression rejects a blank target identity");
    }
    return key;
  });

  let currentIndex = 0;
  let completedCount = 0;

  const snapshot = (): ProgressionSnapshot<Target> => {
    const isComplete = currentIndex >= frozenTargets.length;
    return Object.freeze({
      targets: frozenTargets,
      currentIndex,
      completedCount,
      isComplete,
      currentTarget: isComplete ? undefined : frozenTargets[currentIndex],
    });
  };

  return Object.freeze({
    get currentIndex() {
      return currentIndex;
    },
    get completedCount() {
      return completedCount;
    },
    get isComplete() {
      return currentIndex >= frozenTargets.length;
    },
    get currentTarget(): Target | undefined {
      return currentIndex >= frozenTargets.length ? undefined : frozenTargets[currentIndex];
    },
    match(candidate: Candidate): MatchResult {
      if (currentIndex >= frozenTargets.length) {
        return { matched: false, progressed: false };
      }
      const candidateKey = candidateId(candidate);
      const matched = candidateKey === identityKeys[currentIndex];
      if (!matched) {
        return { matched: false, progressed: false };
      }
      currentIndex += 1;
      completedCount += 1;
      return { matched: true, progressed: true };
    },
    snapshot,
    reset(): void {
      currentIndex = 0;
      completedCount = 0;
    },
  });
}

/** Pure ordered target progression matcher. */
export interface LanguageTargetProgression<Target, Candidate = Target> {
  /** Index of the next target to match, or `targets.length` when complete. */
  readonly currentIndex: number;
  /** Number of targets matched so far. */
  readonly completedCount: number;
  /** Whether every target has been matched. */
  readonly isComplete: boolean;
  /** The next target to match, or `undefined` when complete. */
  readonly currentTarget: Target | undefined;
  /**
   * Attempts to match a candidate against the current target.
   * @param candidate Candidate identity supplied by game-owned selection.
   * @returns Whether the candidate matched and whether the index advanced.
   */
  match(candidate: Candidate): MatchResult;
  /** Returns an immutable snapshot of the current progression state. */
  snapshot(): ProgressionSnapshot<Target>;
  /** Resets the matcher to the initial index without reallocating targets. */
  reset(): void;
}
