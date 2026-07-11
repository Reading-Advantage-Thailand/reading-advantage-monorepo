import type { APKInputSnapshot } from "@reading-advantage/advantage-play-kit";

/** Normalized educational actions shared by traversal cartridges. */
export type TraversalAction =
  | "left"
  | "center"
  | "right"
  | "up"
  | "down"
  | "collect";

/** One normalized pointer/touch hit region on the play surface. */
export interface TraversalInputRegion {
  /** Action emitted on a new pointer press inside this region. */
  readonly action: TraversalAction;
  /** Inclusive normalized horizontal start from zero to one. */
  readonly minimumX: number;
  /** Inclusive normalized horizontal end from zero to one. */
  readonly maximumX: number;
  /** Inclusive normalized vertical start from zero to one. */
  readonly minimumY: number;
  /** Inclusive normalized vertical end from zero to one. */
  readonly maximumY: number;
}

/** Optional touch-swipe actions resolved when a gesture releases. */
export interface TraversalSwipeBindings {
  /** Minimum dominant-axis travel in client pixels. */
  readonly threshold: number;
  /** Action emitted for a dominant leftward swipe. */
  readonly left?: TraversalAction;
  /** Action emitted for a dominant rightward swipe. */
  readonly right?: TraversalAction;
  /** Action emitted for a dominant upward swipe. */
  readonly up?: TraversalAction;
  /** Action emitted for a dominant downward swipe. */
  readonly down?: TraversalAction;
}

/** Keyboard, hit-region, and swipe declarations for one cartridge. */
export interface TraversalInputBindings {
  /** KeyboardEvent codes mapped to each traversal action. */
  readonly keyboard: Partial<Readonly<Record<TraversalAction, readonly string[]>>>;
  /** Pointer and touch press regions expressed in normalized surface coordinates. */
  readonly regions?: readonly TraversalInputRegion[];
  /** Optional touch-only swipe mappings. */
  readonly swipe?: TraversalSwipeBindings;
}

/** Client-space bounds used to normalize pointer regions. */
export interface TraversalSurfaceBounds {
  /** Client-space left edge. */
  readonly left: number;
  /** Client-space top edge. */
  readonly top: number;
  /** Positive surface width. */
  readonly width: number;
  /** Positive surface height. */
  readonly height: number;
}

function appendUnique(actions: TraversalAction[], action: TraversalAction | undefined): void {
  if (action !== undefined && !actions.includes(action)) actions.push(action);
}

function resolveSwipeAction(
  snapshot: APKInputSnapshot,
  swipe: TraversalSwipeBindings,
): TraversalAction | undefined {
  const deltaX = snapshot.pointer.x - snapshot.pointer.startX;
  const deltaY = snapshot.pointer.y - snapshot.pointer.startY;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < swipe.threshold) return undefined;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX < 0 ? swipe.left : swipe.right;
  }
  return deltaY < 0 ? swipe.up : swipe.down;
}

function containsPoint(
  region: TraversalInputRegion,
  normalizedX: number,
  normalizedY: number,
): boolean {
  return normalizedX >= region.minimumX && normalizedX <= region.maximumX &&
    normalizedY >= region.minimumY && normalizedY <= region.maximumY;
}

/**
 * Resolves newly pressed keys, pointer regions, and completed touch swipes.
 * @param previous Prior immutable APK input snapshot.
 * @param current Current immutable APK input snapshot.
 * @param bindings Cartridge action declarations.
 * @param bounds Current client-space play-surface bounds.
 * @returns Stable de-duplicated traversal actions for this input transition.
 * @throws When surface bounds, regions, or swipe thresholds are invalid.
 */
export function resolveTraversalActions(
  previous: APKInputSnapshot,
  current: APKInputSnapshot,
  bindings: TraversalInputBindings,
  bounds: TraversalSurfaceBounds,
): readonly TraversalAction[] {
  if (!Number.isFinite(bounds.left) || !Number.isFinite(bounds.top) ||
      !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) ||
      bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Traversal input surface bounds must be positive and finite");
  }
  const actions: TraversalAction[] = [];
  const previousKeys = new Set(previous.keys);
  for (const [action, codes] of Object.entries(bindings.keyboard) as [
    TraversalAction,
    readonly string[],
  ][]) {
    if (codes.some((code) => current.keys.includes(code) && !previousKeys.has(code))) {
      appendUnique(actions, action);
    }
  }

  if (current.pointer.down && !previous.pointer.down) {
    const normalizedX = (current.pointer.x - bounds.left) / bounds.width;
    const normalizedY = (current.pointer.y - bounds.top) / bounds.height;
    for (const region of bindings.regions ?? []) {
      if ([region.minimumX, region.maximumX, region.minimumY, region.maximumY]
        .some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
          region.minimumX > region.maximumX || region.minimumY > region.maximumY) {
        throw new Error("Traversal input regions must use ordered zero-to-one bounds");
      }
      if (containsPoint(region, normalizedX, normalizedY)) {
        appendUnique(actions, region.action);
        break;
      }
    }
  }

  if (bindings.swipe !== undefined) {
    if (!Number.isFinite(bindings.swipe.threshold) || bindings.swipe.threshold <= 0) {
      throw new Error("Traversal swipe threshold must be positive and finite");
    }
    const touchReleased = previous.pointer.down &&
      !current.pointer.down &&
      !current.pointer.cancelled &&
      current.pointer.kind === "touch";
    const startX = (current.pointer.startX - bounds.left) / bounds.width;
    const startY = (current.pointer.startY - bounds.top) / bounds.height;
    const startedInRegion = (bindings.regions ?? []).some((region) =>
      containsPoint(region, startX, startY),
    );
    if (touchReleased && !startedInRegion) {
      appendUnique(actions, resolveSwipeAction(current, bindings.swipe));
    }
  }

  return actions;
}
