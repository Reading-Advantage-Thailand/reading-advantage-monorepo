import { createSeededRandom, seededShuffle } from "../../internal/random";

export * from "./input";

/** Horizontal direction used by bounded lane traversal. */
export type LaneDirection = "left" | "right";

/** Cardinal direction used by vertical-grid traversal. */
export type GridDirection = "up" | "down" | "left" | "right";

/** Inputs required to build one deterministic lane-gate wave. */
export interface GateWaveOptions {
  /** Content index represented by the correct gate. */
  readonly correctIndex: number;
  /** Unique wrong content indices available for the other lanes. */
  readonly decoyIndices: readonly number[];
  /** Number of lanes and gates in the wave. */
  readonly laneCount: number;
  /** Stable wave ordinal used in generated gate identities. */
  readonly waveIndex: number;
  /** Reproducible shuffle seed. */
  readonly seed: number;
}

/** One content-bearing gate assigned to a deterministic lane. */
export interface GateWaveTarget {
  /** Stable wave-and-lane identity. */
  readonly id: string;
  /** Zero-based lane index. */
  readonly lane: number;
  /** Index of the educational item displayed by the gate. */
  readonly contentIndex: number;
  /** Whether this gate represents the required answer. */
  readonly correct: boolean;
}

/** One target moving along a one-dimensional scrolling axis. */
export interface ScrollTarget {
  /** Stable target identity. */
  readonly id: string;
  /** Current axis position in world pixels. */
  readonly position: number;
}

/** Inputs required to advance scrolling targets by one frame. */
export interface ScrollAdvanceOptions {
  /** Immutable live targets before this frame. */
  readonly targets: readonly ScrollTarget[];
  /** Elapsed frame time in milliseconds. */
  readonly deltaMs: number;
  /** Signed movement speed in pixels per second. */
  readonly speed: number;
  /** Axis position at which gameplay resolves a crossing. */
  readonly collisionLine: number;
}

/** Updated targets and identities that crossed the collision line this frame. */
export interface ScrollAdvanceResult {
  /** New immutable target positions. */
  readonly targets: readonly ScrollTarget[];
  /** Target IDs that crossed the collision line between frames. */
  readonly crossedTargetIds: readonly string[];
}

/** Integer position on a bounded vertical traversal grid. */
export interface GridPosition {
  /** Zero-based horizontal column. */
  readonly column: number;
  /** Vertical row within configured bounds. */
  readonly row: number;
}

/** Legal dimensions for a vertical traversal grid. */
export interface GridBounds {
  /** Positive number of horizontal columns. */
  readonly columns: number;
  /** Inclusive lowest row. */
  readonly minimumRow: number;
  /** Inclusive highest row. */
  readonly maximumRow: number;
}

/** Ordered-target counters before one selection. */
export interface OrderedTargetState {
  /** Index of the currently required target. */
  readonly targetIndex: number;
  /** Index selected by the player. */
  readonly selectedIndex: number;
  /** Selections already counted. */
  readonly attempts: number;
  /** Correct selections already counted. */
  readonly correctAnswers: number;
}

/** Ordered-target counters after one selection. */
export interface OrderedTargetResolution {
  /** Whether the selected index matched the required index. */
  readonly correct: boolean;
  /** Next required index, advanced only for a correct selection. */
  readonly nextTargetIndex: number;
  /** Attempt count including this selection. */
  readonly attempts: number;
  /** Correct-answer count including a correct selection. */
  readonly correctAnswers: number;
}

function requireNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

/**
 * Moves one step left or right while clamping to the available lanes.
 * @param currentLane Current zero-based lane.
 * @param direction Requested horizontal direction.
 * @param laneCount Positive number of lanes.
 * @returns The clamped zero-based destination lane.
 * @throws When the lane count or current lane is invalid.
 */
export function moveLane(
  currentLane: number,
  direction: LaneDirection,
  laneCount: number,
): number {
  if (!Number.isInteger(laneCount) || laneCount <= 0) {
    throw new Error("Lane count must be a positive integer");
  }
  requireNonNegativeInteger(currentLane, "Current lane");
  if (currentLane >= laneCount) throw new Error("Current lane is outside lane bounds");
  const offset = direction === "left" ? -1 : 1;
  return Math.min(laneCount - 1, Math.max(0, currentLane + offset));
}

/**
 * Assigns one correct item and unique decoys to seeded lanes.
 * @param options Correct item, decoys, lanes, identity ordinal, and seed.
 * @returns A deterministic gate for every lane with exactly one correct target.
 * @throws When indices are invalid, duplicated, or insufficient for the lane count.
 */
export function createGateWave(options: GateWaveOptions): readonly GateWaveTarget[] {
  const { correctIndex, decoyIndices, laneCount, waveIndex, seed } = options;
  if (!Number.isInteger(laneCount) || laneCount <= 0) {
    throw new Error("Lane count must be a positive integer");
  }
  requireNonNegativeInteger(correctIndex, "Correct index");
  requireNonNegativeInteger(waveIndex, "Wave index");
  if (!Number.isInteger(seed)) throw new Error("Gate wave seed must be an integer");
  const uniqueDecoys = [...new Set(decoyIndices)];
  if (uniqueDecoys.length !== decoyIndices.length) {
    throw new Error("Gate wave decoy indices must be unique");
  }
  uniqueDecoys.forEach((index) => requireNonNegativeInteger(index, "Decoy index"));
  if (uniqueDecoys.includes(correctIndex)) {
    throw new Error("Gate wave decoys must not include the correct index");
  }
  if (uniqueDecoys.length < laneCount - 1) {
    throw new Error("Gate wave requires one unique content index per lane");
  }

  const contentIndices = seededShuffle(
    [correctIndex, ...uniqueDecoys.slice(0, laneCount - 1)],
    createSeededRandom(seed),
  );
  return contentIndices.map((contentIndex, lane) => ({
    id: `gate:${waveIndex}:${lane}`,
    lane,
    contentIndex,
    correct: contentIndex === correctIndex,
  }));
}

/**
 * Advances targets and reports collision-line crossings between frames.
 * @param options Immutable targets, elapsed time, speed, and collision line.
 * @returns Updated positions plus IDs that crossed in the direction of travel.
 * @throws When timing or numeric inputs are not finite and valid.
 */
export function advanceScrollTargets(
  options: ScrollAdvanceOptions,
): ScrollAdvanceResult {
  const { targets, deltaMs, speed, collisionLine } = options;
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Scroll delta must be a finite non-negative number");
  }
  if (!Number.isFinite(speed) || !Number.isFinite(collisionLine)) {
    throw new Error("Scroll speed and collision line must be finite numbers");
  }
  const offset = speed * (deltaMs / 1_000);
  const crossedTargetIds: string[] = [];
  const advancedTargets = targets.map((target) => {
    if (!Number.isFinite(target.position)) {
      throw new Error("Scroll target positions must be finite numbers");
    }
    const position = target.position + offset;
    const crossedForward = offset > 0 &&
      target.position < collisionLine && position >= collisionLine;
    const crossedBackward = offset < 0 &&
      target.position > collisionLine && position <= collisionLine;
    if (crossedForward || crossedBackward) crossedTargetIds.push(target.id);
    return { ...target, position };
  });
  return { targets: advancedTargets, crossedTargetIds };
}

/**
 * Moves one cell on a bounded vertical grid without mutating the input position.
 * @param position Current integer grid coordinate.
 * @param direction Requested cardinal direction.
 * @param bounds Column count and inclusive row bounds.
 * @returns The clamped destination coordinate.
 * @throws When the grid bounds or current position are invalid.
 */
export function moveGridPosition(
  position: GridPosition,
  direction: GridDirection,
  bounds: GridBounds,
): GridPosition {
  if (!Number.isInteger(bounds.columns) || bounds.columns <= 0) {
    throw new Error("Grid columns must be a positive integer");
  }
  if (!Number.isInteger(bounds.minimumRow) ||
      !Number.isInteger(bounds.maximumRow) ||
      bounds.minimumRow > bounds.maximumRow) {
    throw new Error("Grid row bounds must be ordered integers");
  }
  requireNonNegativeInteger(position.column, "Grid column");
  if (!Number.isInteger(position.row) ||
      position.column >= bounds.columns ||
      position.row < bounds.minimumRow ||
      position.row > bounds.maximumRow) {
    throw new Error("Grid position is outside configured bounds");
  }

  const columnOffset = direction === "left" ? -1 : direction === "right" ? 1 : 0;
  const rowOffset = direction === "down" ? -1 : direction === "up" ? 1 : 0;
  return {
    column: Math.min(bounds.columns - 1, Math.max(0, position.column + columnOffset)),
    row: Math.min(
      bounds.maximumRow,
      Math.max(bounds.minimumRow, position.row + rowOffset),
    ),
  };
}

/**
 * Resolves one ordered-target selection without embedding scoring policy.
 * @param state Required and selected indices plus current attempt counters.
 * @returns Updated counters and whether the ordered selection was correct.
 * @throws When any supplied counter or index is negative or fractional.
 */
export function resolveOrderedTarget(
  state: OrderedTargetState,
): OrderedTargetResolution {
  requireNonNegativeInteger(state.targetIndex, "Target index");
  requireNonNegativeInteger(state.selectedIndex, "Selected index");
  requireNonNegativeInteger(state.attempts, "Attempts");
  requireNonNegativeInteger(state.correctAnswers, "Correct answers");
  const correct = state.targetIndex === state.selectedIndex;
  return {
    correct,
    nextTargetIndex: state.targetIndex + (correct ? 1 : 0),
    attempts: state.attempts + 1,
    correctAnswers: state.correctAnswers + (correct ? 1 : 0),
  };
}
