/**
 * The APK input controller, copied so that a Phaser cartridge reads the same snapshots in the
 * standalone host as in the monorepo. Source: ../reading-advantage-monorepo (commit fe6aedc2b),
 * packages/advantage-play-kit/src/runtime/input.ts. The types are in contracts/apk.ts.
 */
import type { APKInputController, APKInputSnapshot, APKPointerState } from '../contracts/index.js';

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

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.composedPath().some((target) =>
      target instanceof Element && (
        target.matches("input, textarea, select, button, a[href], [role='textbox']")
        || (target.hasAttribute("contenteditable") && target.getAttribute("contenteditable") !== "false")
      ),
    )) return;
    keys.add(event.code);
    if (!event.repeat) pressed.add(event.code);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onPointerDown = (event: PointerEvent) => {
    if (pointer.down) return;
    pointer.down = true;
    pointer.released = false;
    pointer.cancelled = false;
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
  const finishPointer = (event: PointerEvent, cancelled: boolean) => {
    if (!pointer.down || event.pointerId !== pointer.id) return;
    pointer.down = false;
    pointer.released = !cancelled;
    pointer.cancelled = cancelled;
    pointer.id = null;
    pointer.kind = event.pointerType === "touch" ||
      event.pointerType === "pen" ||
      event.pointerType === "mouse"
      ? event.pointerType
      : pointer.kind;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => finishPointer(event, false);
  const onPointerCancel = (event: PointerEvent) => finishPointer(event, true);
  const preventBrowserGesture = (event: Event) => event.preventDefault();
  const reset = () => {
    keys.clear();
    pressed.clear();
    pointer.cancelled = pointer.down || pointer.released === true;
    pointer.down = false;
    pointer.released = false;
    pointer.id = null;
  };
  const onVisibilityChange = () => {
    if (document.hidden) reset();
  };

  surface.style.touchAction = "none";
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", onVisibilityChange);
  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
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
    reset,
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
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      surface.removeEventListener("contextmenu", preventBrowserGesture);
    },
  };
}
