/**
 * `capability:input-action-normalization` shared core.
 *
 * Shared adapters own translation from physical modalities to bounded semantic
 * action identifiers. Rules receive semantic actions and never depend on DOM,
 * pointer, keyboard, touch, or engine event objects. Games own action
 * vocabularies, gesture thresholds, hit regions, and whether an action is
 * currently enabled.
 *
 * Source evidence: astral-mage, dragon-rider, enchanted-library,
 * griffin-riders-escape. The bounded vocabulary covers normalized left/right
 * controls (dragon-rider), multimodal traversal (griffin-riders-escape), and
 * nonblank input validation (astral-mage) without title-specific bindings.
 */

/** Bounded semantic action identifiers accepted by game-owned rules. */
export const INPUT_ACTION_IDS = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
  "cancel",
  "pause",
  "restart",
] as const);

/** One bounded semantic action identifier. */
export type InputActionId = (typeof INPUT_ACTION_IDS)[number];

/** Whether a physical event represents a press or release edge. */
export type InputActionEdge = "press" | "release";

/** One normalized semantic action emitted by the adapter. */
export interface InputAction {
  /** Bounded semantic action identifier. */
  readonly action: InputActionId;
  /** Edge that triggered the action. */
  readonly edge: InputActionEdge;
}

/** Keyboard code-to-action map supplied by a cartridge or host. */
export type KeyboardActionMap = Readonly<Record<string, InputActionId>>;

/** Pointer tap mapping that fires one action on press and release. */
export interface PointerTapMap {
  /** Action fired when a pointer tap begins and ends. */
  readonly action: InputActionId;
}

/** Pointer drag mapping that fires directional move actions. */
export interface PointerDragMap {
  /** Action fired when the pointer drags left of the threshold. */
  readonly leftAction: InputActionId;
  /** Action fired when the pointer drags right of the threshold. */
  readonly rightAction: InputActionId;
  /** Optional upward move action. */
  readonly upAction?: InputActionId;
  /** Optional downward move action. */
  readonly downAction?: InputActionId;
  /** Minimum horizontal or vertical delta before a move action fires. */
  readonly threshold?: number;
}

/** Configuration that binds physical descriptors to bounded semantic actions. */
export interface InputActionNormalizerConfig {
  /** Keyboard code-to-action map. */
  readonly keyboard: KeyboardActionMap;
  /** Optional pointer tap mapping. */
  readonly pointerTap?: PointerTapMap;
  /** Optional pointer drag mapping. */
  readonly pointerDrag?: PointerDragMap;
}

/** Transport-independent physical input descriptor consumed by the adapter. */
export type PhysicalInputDescriptor =
  | { readonly modality: "keyboard"; readonly code: string }
  | { readonly modality: "pointer"; readonly phase: "down" | "up" | "drag"; readonly x: number; readonly y: number; readonly deltaX?: number; readonly deltaY?: number };

const ACCEPTED_ACTIONS: ReadonlySet<string> = new Set(INPUT_ACTION_IDS);

function assertAcceptedAction(action: string, label: string): void {
  if (!ACCEPTED_ACTIONS.has(action)) {
    throw new Error(
      `${label} references ${JSON.stringify(action)} which is not an accepted action id; `
        + `accepted actions are: ${INPUT_ACTION_IDS.join(", ")}`,
    );
  }
}

/**
 * Creates a pure input-action normalizer bound to a cartridge-supplied physical map.
 * @param config Keyboard, pointer-tap, and pointer-drag bindings.
 * @returns A function that translates physical descriptors into bounded semantic actions.
 */
export function createInputActionNormalizer(
  config: InputActionNormalizerConfig,
): (descriptor: PhysicalInputDescriptor) => readonly InputAction[] {
  for (const [code, action] of Object.entries(config.keyboard)) {
    assertAcceptedAction(action, `Keyboard code ${code}`);
  }
  if (config.pointerTap) assertAcceptedAction(config.pointerTap.action, "Pointer tap");
  if (config.pointerDrag) {
    assertAcceptedAction(config.pointerDrag.leftAction, "Pointer drag left");
    assertAcceptedAction(config.pointerDrag.rightAction, "Pointer drag right");
    if (config.pointerDrag.upAction) assertAcceptedAction(config.pointerDrag.upAction, "Pointer drag up");
    if (config.pointerDrag.downAction) assertAcceptedAction(config.pointerDrag.downAction, "Pointer drag down");
  }
  const dragThreshold = config.pointerDrag?.threshold ?? 0;

  return (descriptor: PhysicalInputDescriptor): readonly InputAction[] => {
    if (descriptor.modality === "keyboard") {
      const action = config.keyboard[descriptor.code];
      return action === undefined ? [] : [{ action, edge: "press" }];
    }
    if (config.pointerTap && (descriptor.phase === "down" || descriptor.phase === "up")) {
      return [{ action: config.pointerTap.action, edge: descriptor.phase === "down" ? "press" : "release" }];
    }
    if (config.pointerDrag && descriptor.phase === "drag") {
      const dx = descriptor.deltaX ?? 0;
      const dy = descriptor.deltaY ?? 0;
      if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0 && Math.abs(dx) >= dragThreshold) {
        if (dx < 0) return [{ action: config.pointerDrag.leftAction, edge: "press" }];
        return [{ action: config.pointerDrag.rightAction, edge: "press" }];
      }
      if (Math.abs(dy) > 0 && Math.abs(dy) >= dragThreshold) {
        if (dy < 0 && config.pointerDrag.upAction) {
          return [{ action: config.pointerDrag.upAction, edge: "press" }];
        }
        if (dy > 0 && config.pointerDrag.downAction) {
          return [{ action: config.pointerDrag.downAction, edge: "press" }];
        }
      }
    }
    return [];
  };
}
