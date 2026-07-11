/** Normalized pointer position and button state. */
export interface APKPointerState {
  /** Whether the pointer is currently pressed. */
  down: boolean;
  /** Active pointer identifier. */
  id: number | null;
  /** Browser pointer category retained through release for gesture resolution. */
  kind: "mouse" | "pen" | "touch" | null;
  /** Client-space horizontal coordinate where the active gesture began. */
  startX: number;
  /** Client-space vertical coordinate where the active gesture began. */
  startY: number;
  /** Client-space horizontal coordinate. */
  x: number;
  /** Client-space vertical coordinate. */
  y: number;
}

/** Immutable normalized input snapshot read by a cartridge. */
export interface APKInputSnapshot {
  /** Pressed KeyboardEvent codes. */
  keys: readonly string[];
  /** Current primary pointer state. */
  pointer: APKPointerState;
  /** Whether this controller has released its listeners. */
  destroyed: boolean;
}

/** Browser input controller owned by one mounted cartridge. */
export interface APKInputController {
  /** Returns the current normalized input state. */
  snapshot(): APKInputSnapshot;
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
  const pointer: APKPointerState = {
    down: false,
    id: null,
    kind: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  };
  const previousTouchAction = surface.style.touchAction;
  let destroyed = false;

  const onKeyDown = (event: KeyboardEvent) => keys.add(event.code);
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onPointerDown = (event: PointerEvent) => {
    pointer.down = true;
    pointer.id = event.pointerId;
    pointer.kind = event.pointerType === "touch" ||
      event.pointerType === "pen" ||
      event.pointerType === "mouse"
      ? event.pointerType
      : "mouse";
    pointer.startX = event.clientX;
    pointer.startY = event.clientY;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
    pointer.down = false;
    pointer.id = null;
    pointer.kind = event.pointerType === "touch" ||
      event.pointerType === "pen" ||
      event.pointerType === "mouse"
      ? event.pointerType
      : pointer.kind;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const preventBrowserGesture = (event: Event) => event.preventDefault();

  surface.style.touchAction = "none";
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerUp);
  surface.addEventListener("contextmenu", preventBrowserGesture);

  return {
    snapshot: () => ({
      keys: [...keys].sort(),
      pointer: { ...pointer },
      destroyed,
    }),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      keys.clear();
      pointer.down = false;
      pointer.id = null;
      pointer.kind = null;
      surface.style.touchAction = previousTouchAction;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerUp);
      surface.removeEventListener("contextmenu", preventBrowserGesture);
    },
  };
}
