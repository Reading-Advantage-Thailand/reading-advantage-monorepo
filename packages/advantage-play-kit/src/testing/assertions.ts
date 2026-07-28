/**
 * Lifecycle, leak, exactly-once, canonical-pack, selected-union, and attribution
 * assertion helpers for shared-kit and cartridge tests.
 *
 * These helpers dogfood the accepted public contracts so tests do not depend on
 * private implementation details.
 */

const PHYSICAL_PATH_PATTERNS: readonly RegExp[] = [
  /\.png\b/iu,
  /\.ogg\b/iu,
  /\.wav\b/iu,
  /\.mp3\b/iu,
  /\/assets\/apk\//iu,
  /\/assets\/standard\//iu,
];

const EDITION_THEME_PATTERNS: readonly RegExp[] = [
  /edition[/-]/iu,
  /theme[/-]/iu,
  /private[/-]pack/iu,
  /dual[/-]pack/iu,
];

/** Snapshot of a completion latch used by exactly-once assertions. */
export interface CompletionLatchSnapshot {
  readonly hasCompleted: boolean;
}

/** Attribution registration snapshot used by attribution assertions. */
export interface AttributionSnapshot {
  readonly requiredCredit: string;
  readonly placement: string;
}

/**
 * Asserts that a completion latch emitted exactly one result.
 * @param before Latch snapshot before the second completion attempt.
 * @param after Latch snapshot after the second completion attempt.
 * @throws When the latch did not stay sealed after the first emission.
 */
export function assertExactlyOnceCompletion(
  before: CompletionLatchSnapshot,
  after: CompletionLatchSnapshot,
): void {
  if (!before.hasCompleted) {
    throw new Error("Completion latch must have completed exactly once; first emission did not occur");
  }
  if (!after.hasCompleted) {
    throw new Error("Completion latch must remain sealed after the first emission");
  }
}

/**
 * Asserts that attribution registration carries the required ElvGames credit.
 * @param attribution Attribution registration snapshot.
 * @throws When the credit text or placement is missing or incorrect.
 */
export function assertAttributionRegistered(attribution: AttributionSnapshot): void {
  if (attribution.requiredCredit !== "Pixel art assets by ElvGames") {
    throw new Error(
      `Attribution registration must carry the required ElvGames credit; got ${JSON.stringify(attribution.requiredCredit)}`,
    );
  }
  if (!["shared-credits", "about", "end-screen"].includes(attribution.placement)) {
    throw new Error(`Attribution placement must be shared-credits, about, or end-screen`);
  }
}

/**
 * Asserts that source text contains no direct physical asset paths or edition/theme bindings.
 * @param source Source text to scan.
 * @throws When a physical path, edition/theme binding, or private pack reference is found.
 */
export function assertNoDirectAssetPaths(source: string): void {
  for (const pattern of PHYSICAL_PATH_PATTERNS) {
    if (pattern.test(source)) {
      throw new Error(
        `Source contains a direct physical asset path or pack reference forbidden by the developer-kit boundary: ${pattern.source}`,
      );
    }
  }
  for (const pattern of EDITION_THEME_PATTERNS) {
    if (pattern.test(source)) {
      throw new Error(
        `Source contains an edition, theme, dual-pack, or private-pack reference forbidden by the developer-kit boundary: ${pattern.source}`,
      );
    }
  }
}

/**
 * Asserts that a materialization policy is selected-union-only.
 * @param policy The materialization policy string.
 * @throws When the policy is not the accepted selected-union contract.
 */
export function assertSelectedUnionOnly(policy: string): void {
  if (policy !== "accepted-cartridge-selected-union-only") {
    throw new Error(
      `Materialization policy must be accepted-cartridge-selected-union-only; got ${JSON.stringify(policy)}`,
    );
  }
}
