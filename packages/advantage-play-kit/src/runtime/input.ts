/** Normalized pointer position and button state. */
export interface APKPointerState {
  /** Whether the pointer is currently pressed. */
  down: boolean;
  /** Whether a completed release is queued for the next snapshot. */
  released?: boolean;
  /** Whether the most recent active gesture ended through browser cancellation. */
  cancelled: boolean;
  /** Active pointer identifier. */
  id: number | null;
  /** Browser pointer category retained through release for gesture resolution. */
  kind: "mouse" | "pen" | "touch" | null;
  /** Surface-local CSS-pixel horizontal coordinate where the active gesture began. */
  startX: number;
  /** Surface-local CSS-pixel vertical coordinate where the active gesture began. */
  startY: number;
  /** Surface-local CSS-pixel horizontal coordinate. */
  x: number;
  /** Surface-local CSS-pixel vertical coordinate. */
  y: number;
}

/** Immutable normalized input snapshot read by a cartridge. */
export interface APKInputSnapshot {
  /** Pressed KeyboardEvent codes. */
  keys: readonly string[];
  /** Key-down codes observed since the previous snapshot, including short taps. */
  pressed?: readonly string[];
  /** Current primary pointer state. */
  pointer: APKPointerState;
  /** Whether this controller has released its listeners. */
  destroyed: boolean;
}

/** Browser input controller owned by one mounted cartridge. */
export interface APKInputController {
  /** Returns the current normalized input state. */
  snapshot(): APKInputSnapshot;
  /** Cancels an active pointer gesture before responsive targets move. */
  cancelActiveGesture(): void;
  /** Releases listeners and restores host element styles. */
  destroy(): void;
}

/**
 * Normalizes keyboard, mouse, pen, and touch-compatible pointer events.
 * @param surface Element that owns pointer and browser-gesture handling.
 * @returns A controller that exposes snapshots and deterministic teardown.
 */
export function createInputController(surface: HTMLElement): APKInputController {
  const keys = new Set<string>();
  const pressed = new Set<string>();
  const pointer: APKPointerState = {
    down: false,
    released: false,
    cancelled: false,
    id: null,
    kind: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  };
  const previousTouchAction = surface.style.touchAction;
  let destroyed = false;

  /**
   * Converts browser client coordinates into CSS pixels local to the play surface.
   * @param event Pointer event reported in viewport-relative client coordinates.
   * @returns The pointer position relative to the surface's top-left corner.
   */
  const localPointerPosition = (event: PointerEvent) => {
    const rect = surface.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const onKeyDown = (event: KeyboardEvent) => {
    keys.add(event.code);
    if (!event.repeat) pressed.add(event.code);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onPointerDown = (event: PointerEvent) => {
    const position = localPointerPosition(event);
    pointer.down = true;
    pointer.released = false;
    pointer.cancelled = false;
    pointer.id = event.pointerId;
    pointer.kind = event.pointerType === "touch" ||
      event.pointerType === "pen" ||
      event.pointerType === "mouse"
      ? event.pointerType
      : "mouse";
    pointer.startX = position.x;
    pointer.startY = position.y;
    pointer.x = position.x;
    pointer.y = position.y;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
    const position = localPointerPosition(event);
    pointer.x = position.x;
    pointer.y = position.y;
  };
  const finishPointer = (event: PointerEvent, cancelled: boolean) => {
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
    const position = localPointerPosition(event);
    pointer.down = false;
    pointer.released = !cancelled;
    pointer.cancelled = cancelled;
    pointer.id = null;
    pointer.kind = event.pointerType === "touch" ||
      event.pointerType === "pen" ||
      event.pointerType === "mouse"
      ? event.pointerType
      : pointer.kind;
    pointer.x = position.x;
    pointer.y = position.y;
  };
  const onPointerUp = (event: PointerEvent) => finishPointer(event, false);
  const onPointerCancel = (event: PointerEvent) => finishPointer(event, true);
  const preventBrowserGesture = (event: Event) => event.preventDefault();

  surface.style.touchAction = "none";
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);
  surface.addEventListener("contextmenu", preventBrowserGesture);

  return {
    snapshot: () => {
      const snapshot: APKInputSnapshot = {
        keys: [...keys].sort(),
        pressed: [...pressed],
        pointer: { ...pointer },
        destroyed,
      };
      pressed.clear();
      pointer.released = false;
      return snapshot;
    },
    cancelActiveGesture: () => {
      if (!pointer.down && pointer.id === null) return;
      pointer.down = false;
      pointer.released = false;
      pointer.cancelled = true;
      pointer.id = null;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      keys.clear();
      pressed.clear();
      pointer.down = false;
      pointer.released = false;
      pointer.cancelled = false;
      pointer.id = null;
      pointer.kind = null;
      surface.style.touchAction = previousTouchAction;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerCancel);
      surface.removeEventListener("contextmenu", preventBrowserGesture);
    },
  };
}
