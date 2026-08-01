import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type SupportedResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type PhysicalInputDescriptor,
} from "@reading-advantage/advantage-play-kit/systems";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import type { GameResults } from "@reading-advantage/game-contracts";

import { createPuzzleCartridgeScope, type PuzzleCartridgeScope } from "../puzzle-suitability.js";

const RUNE_MATCH_COLUMNS = 6;
const RUNE_MATCH_ROWS = 8;
const RUNE_MATCH_CLAIM_IDS = Object.freeze(["RM-CONFIG-001", "RM-MECH-002", "RM-MECH-003", "RM-MECH-004"]);

/** One source-shaped contiguous group discovered in a Rune Match grid. */
export interface RuneMatchCascadeGroup {
  /** Zero-based cascade wave in which the group was found. */
  readonly cascadeIndex: number;
  /** Number of grid positions in the group. */
  readonly size: number;
  /** Rune token shared by all positions in the group. */
  readonly token: string;
  /** Source claim that defines the match grouping rule. */
  readonly claimId: "RM-MECH-003";
}

/** Output of source-bound repeated gravity and match processing. */
export interface RuneMatchCascadeSnapshot {
  /** Grid after every matched group has fallen and been replenished. */
  readonly grid: readonly (readonly string[])[];
  /** Number of matching-and-gravity waves processed. */
  readonly cascades: number;
  /** Every source-shaped group found in cascade order. */
  readonly groups: readonly RuneMatchCascadeGroup[];
  /** Source claim that defines repeated cascade processing. */
  readonly claimId: "RM-MECH-004";
}

/** Immutable Rune Match state after one attempted matched group. */
export interface RuneMatchPuzzleSnapshot {
  /** Current terminal state. */
  readonly status: "playing" | "victory";
  /** Zero-based target that the next legal group must teach. */
  readonly targetIndex: number;
  /** Source-bound 6-column by 8-row puzzle grid. */
  readonly grid: readonly (readonly string[])[];
  /** Number of source cascade waves last processed by this session. */
  readonly cascadeCount: number;
  /** Exact source claims retained by this deterministic mechanic. */
  readonly claimIds: readonly string[];
}

/** Deterministic Rune Match session used for title-scoped proof and QC. */
export interface RuneMatchPuzzleSession {
  /** Resolves one candidate group against the current target and the two-rune minimum. */
  resolveGroup(term: string, groupSize: number): RuneMatchPuzzleSnapshot;
  /** Applies source match detection, gravity, and repeated cascade processing to an exact 6-by-8 token grid. */
  resolveCascade(grid: readonly (readonly string[])[]): RuneMatchCascadeSnapshot;
  /** Returns the latest grid and learning-loop state. */
  snapshot(): RuneMatchPuzzleSnapshot;
  /** Normalizes a physical keyboard or pointer descriptor through the T11 public input API. */
  dispatchPhysicalInput(input: PhysicalInputDescriptor): readonly string[];
  /** Resolves a supported compact or wide QC composition. */
  resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition;
  /** Returns the once-emitted result after all targets are matched. */
  results(): GameResults;
}

/** Non-public Rune Match candidate cartridge built only with T11 public APIs. */
export interface RuneMatchPuzzleCartridge {
  /** T11-validated cartridge manifest with the accepted title-selected semantic output. */
  readonly manifest: CartridgeManifest;
  /** Explicit no-catalog/no-host gate retained after Task 2 v2 owner acceptance. */
  readonly scope: PuzzleCartridgeScope;
  /** Screen-reader-ready concise instructions for the available candidate controls. */
  readonly accessibilityText: "Use Enter or a pointer tap to confirm a matched rune group of two or more.";
  /** Creates a deterministic match-group session from validated vocabulary input. */
  createSession(input: unknown, complete?: (result: GameResults) => void): RuneMatchPuzzleSession;
}

/** Resolves one supported T11 composition or fails closed for an unsupported viewport. */
function resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition {
  const composition = resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
  if (!composition.supported) throw new Error(`Rune Match QC viewport is unsupported: ${composition.code}; ${composition.guidance}`);
  return composition;
}

/** Creates the title-specific T11 manifest without exposing a host or catalog loader. */
function createManifest(): CartridgeManifest {
  return validateCartridgeManifest({
    schemaVersion: 1, id: "rune-match", title: "Rune Match", description: "Source-bound match-grid and cascade cartridge registered for Advantage Games QC only.", version: "0.1.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "vocabulary",
    capabilities: ["capability:input-action-normalization", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: ["ui/20x20/inventory/slot"],
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" },
  });
}

/** Returns a deep-frozen token grid so snapshots cannot mutate later cascade state. */
function freezeGrid(grid: readonly (readonly string[])[]): readonly (readonly string[])[] {
  return Object.freeze(grid.map((row) => Object.freeze([...row])));
}

/** Verifies a consumer-supplied board keeps the exact source grid geometry. */
function assertGrid(grid: readonly (readonly string[])[]): void {
  if (grid.length !== RUNE_MATCH_ROWS || grid.some((row) => row.length !== RUNE_MATCH_COLUMNS)) {
    throw new Error(`Rune Match requires a ${RUNE_MATCH_COLUMNS}-column by ${RUNE_MATCH_ROWS}-row grid`);
  }
  if (grid.some((row) => row.some((token) => !token.trim()))) throw new Error("Rune Match grid tokens must be nonblank");
}

/** Creates a no-adjacent-match deterministic board from the source-provided vocabulary. */
function createInitialGrid(tokens: readonly string[]): readonly (readonly string[])[] {
  const usableTokens = tokens.length > 1 ? tokens : [tokens[0]!, `${tokens[0]}-decoy`];
  const grid = Array.from({ length: RUNE_MATCH_ROWS }, (_, row) => Array.from(
    { length: RUNE_MATCH_COLUMNS },
    (_, column) => usableTokens[(row + column) % usableTokens.length]!,
  ));
  return freezeGrid(grid);
}

/** Finds horizontal and vertical groups of at least two equal rune tokens and joins their intersections. */
function findMatchGroups(grid: readonly (readonly string[])[]): readonly Readonly<{ token: string; coordinates: readonly Readonly<{ row: number; column: number }>[] }>[] {
  const segments: Array<Readonly<{ token: string; coordinates: readonly Readonly<{ row: number; column: number }>[] }>> = [];
  for (let row = 0; row < RUNE_MATCH_ROWS; row += 1) {
    let start = 0;
    for (let column = 1; column <= RUNE_MATCH_COLUMNS; column += 1) {
      if (column < RUNE_MATCH_COLUMNS && grid[row]![column] === grid[row]![column - 1]) continue;
      if (column - start >= 2) {
        segments.push(Object.freeze({ token: grid[row]![start]!, coordinates: Object.freeze(Array.from({ length: column - start }, (_, offset) => Object.freeze({ row, column: start + offset }))) }));
      }
      start = column;
    }
  }
  for (let column = 0; column < RUNE_MATCH_COLUMNS; column += 1) {
    let start = 0;
    for (let row = 1; row <= RUNE_MATCH_ROWS; row += 1) {
      if (row < RUNE_MATCH_ROWS && grid[row]![column] === grid[row - 1]![column]) continue;
      if (row - start >= 2) {
        segments.push(Object.freeze({ token: grid[start]![column]!, coordinates: Object.freeze(Array.from({ length: row - start }, (_, offset) => Object.freeze({ row: start + offset, column }))) }));
      }
      start = row;
    }
  }
  const groups: Array<Readonly<{ token: string; coordinates: readonly Readonly<{ row: number; column: number }>[] }>> = [];
  const visited = new Set<number>();
  for (let index = 0; index < segments.length; index += 1) {
    if (visited.has(index)) continue;
    const pending = [index];
    const coordinates = new Map<string, Readonly<{ row: number; column: number }>>();
    visited.add(index);
    while (pending.length > 0) {
      const currentIndex = pending.pop()!;
      const segment = segments[currentIndex]!;
      for (const coordinate of segment.coordinates) coordinates.set(`${coordinate.row},${coordinate.column}`, coordinate);
      for (let candidateIndex = 0; candidateIndex < segments.length; candidateIndex += 1) {
        if (visited.has(candidateIndex)) continue;
        const candidate = segments[candidateIndex]!;
        if (candidate.coordinates.some((coordinate) => coordinates.has(`${coordinate.row},${coordinate.column}`))) {
          visited.add(candidateIndex);
          pending.push(candidateIndex);
        }
      }
    }
    const first = segments[index]!;
    groups.push(Object.freeze({ token: first.token, coordinates: Object.freeze([...coordinates.values()]) }));
  }
  return Object.freeze(groups);
}

/** Applies source-shaped gravity and deterministic refill after one match wave. */
function applyGravity(grid: readonly (readonly string[])[], groups: readonly Readonly<{ coordinates: readonly Readonly<{ row: number; column: number }>[] }>[], tokens: readonly string[]): readonly (readonly string[])[] {
  const removed = new Set(groups.flatMap((group) => group.coordinates.map((coordinate) => `${coordinate.row},${coordinate.column}`)));
  const next = Array.from({ length: RUNE_MATCH_ROWS }, () => Array<string>(RUNE_MATCH_COLUMNS));
  let cursor = 0;
  for (let column = 0; column < RUNE_MATCH_COLUMNS; column += 1) {
    const survivors = Array.from({ length: RUNE_MATCH_ROWS }, (_, row) => grid[row]![column]!)
      .filter((_, row) => !removed.has(`${row},${column}`));
    for (let row = RUNE_MATCH_ROWS - 1; row >= 0; row -= 1) {
      const survivor = survivors.pop();
      if (survivor) {
        next[row]![column] = survivor;
        continue;
      }
      const choices = tokens.length > 1 ? tokens : [tokens[0]!, `${tokens[0]}-decoy`];
      let token = choices[cursor % choices.length]!;
      cursor += 1;
      const below = row < RUNE_MATCH_ROWS - 1 ? next[row + 1]![column] : undefined;
      const left = column > 0 ? next[row]![column - 1] : undefined;
      if (token === below || token === left) token = choices[cursor % choices.length]!;
      cursor += 1;
      next[row]![column] = token;
    }
  }
  return freezeGrid(next);
}

/** Processes repeated source-shaped matches and gravity, bounded at 100 cascade waves. */
function processCascade(grid: readonly (readonly string[])[], tokens: readonly string[]): RuneMatchCascadeSnapshot {
  assertGrid(grid);
  let current = freezeGrid(grid);
  let cascades = 0;
  const groups: RuneMatchCascadeGroup[] = [];
  let found = findMatchGroups(current);
  while (found.length > 0 && cascades <= 100) {
    for (const group of found) {
      groups.push(Object.freeze({ cascadeIndex: cascades, size: group.coordinates.length, token: group.token, claimId: "RM-MECH-003" }));
    }
    current = applyGravity(current, found, tokens);
    cascades += 1;
    found = findMatchGroups(current);
  }
  return Object.freeze({ grid: current, cascades, groups: Object.freeze(groups), claimId: "RM-MECH-004" });
}

/**
 * Builds the Rune Match candidate cartridge without exposing it through a catalog or host.
 * @returns A title-specific candidate cartridge and its non-playable scope.
 */
export function buildRuneMatchPuzzleCartridge(): RuneMatchPuzzleCartridge {
  return Object.freeze({
    manifest: createManifest(),
    scope: createPuzzleCartridgeScope("rune-match"),
    accessibilityText: "Use Enter or a pointer tap to confirm a matched rune group of two or more.",
    createSession(input: unknown, complete?: (result: GameResults) => void): RuneMatchPuzzleSession {
      const content = validateNonEmptyContent(input, "vocabulary").items;
      const tokens = Object.freeze(content.map((item) => item.term));
      const accountant = createResultAccountant();
      const normalizeInput = createInputActionNormalizer({ keyboard: { Enter: "confirm" }, pointerTap: { action: "confirm" } });
      let targetIndex = 0;
      let status: RuneMatchPuzzleSnapshot["status"] = "playing";
      let grid = createInitialGrid(tokens);
      let cascadeCount = 0;
      let delivered: GameResults | undefined;
      const latch = createCompletionLatch<GameResults>((result) => { delivered = result; complete?.(result); });
      const snapshot = (): RuneMatchPuzzleSnapshot => Object.freeze({ status, targetIndex, grid, cascadeCount, claimIds: RUNE_MATCH_CLAIM_IDS });
      return Object.freeze({
        resolveGroup(term: string, groupSize: number): RuneMatchPuzzleSnapshot {
          if (status !== "playing") return snapshot();
          const correct = groupSize >= 2 && term === content[targetIndex]?.term;
          accountant.recordAttempt({ correct });
          if (correct) {
            accountant.addScore(groupSize * 10);
            targetIndex += 1;
            if (targetIndex === content.length) {
              status = "victory";
              const final = finalizeResult(accountant, { xpPerCorrect: 2, xpPerAccuracyPoint: 6, xpCap: 10, zeroAttemptsXp: 0 });
              latch.complete({ accuracy: final.accuracy, xp: final.xp, score: final.score, correctAnswers: final.correctAnswers, totalAttempts: final.totalAttempts });
            }
          }
          return snapshot();
        },
        resolveCascade(candidateGrid: readonly (readonly string[])[]): RuneMatchCascadeSnapshot {
          const cascade = processCascade(candidateGrid, tokens);
          grid = cascade.grid;
          cascadeCount = cascade.cascades;
          return cascade;
        },
        snapshot,
        dispatchPhysicalInput: (physical: PhysicalInputDescriptor) => Object.freeze(normalizeInput(physical).map(({ action }) => action)),
        resolveQcComposition,
        results(): GameResults {
          if (!delivered) throw new Error("Rune Match has not reached a terminal result");
          return delivered;
        },
      });
    },
  });
}
