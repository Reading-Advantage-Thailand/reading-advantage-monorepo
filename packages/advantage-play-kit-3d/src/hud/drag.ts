/**
 * Pointer drag for touch and mouse: the student drags an element (a word ingredient) and drops it
 * on a target (a cauldron). A short press without movement is a tap, not a drag, so the same
 * element also works with taps (and click-then-click for mouse users). The dragged copy follows
 * the pointer; the original stays in place until the game moves or removes it.
 *
 * With a real mouse, a press on text can start the browser's own text selection or native drag,
 * which cancels the pointer events; so the press prevents those defaults, and the drag follows
 * the pointer on the window (it does not depend on pointer capture, which some browsers drop).
 */
export interface DragHandlers {
  /** A press and release with no drag. */
  tap?(): void;
  start?(): void;
  /** The pointer position in viewport pixels during the drag. */
  move?(x: number, y: number): void;
  /** Where the drag ended, in viewport pixels. */
  drop(x: number, y: number): void;
}

const THRESHOLD = 6;

/**
 * Makes `el` draggable; `handles` are extra elements that also start the same drag (for example
 * an invisible area over the 3D object the word rides on). Returns a function that removes it.
 */
export function makeDraggable(el: HTMLElement, on: DragHandlers, handles: HTMLElement[] = []): () => void {
  const sources = [el, ...handles];
  for (const s of sources) {
    s.style.touchAction = 'none';
    s.style.userSelect = 'none';
    s.setAttribute('draggable', 'false');
  }
  let startX = 0;
  let startY = 0;
  let offX = 0;
  let offY = 0;
  let id: number | null = null;
  let ghost: HTMLElement | null = null;

  const move = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    if (!ghost) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD) return;
      const r = el.getBoundingClientRect();
      ghost = el.cloneNode(true) as HTMLElement;
      ghost.classList.add('drag-ghost');
      ghost.classList.remove('held');
      Object.assign(ghost.style, { position: 'fixed', left: '0', top: '0', width: `${r.width}px`, height: `${r.height}px`, margin: '0', pointerEvents: 'none', zIndex: '50' });
      document.body.append(ghost);
      el.classList.add('dragging');
      on.start?.();
    }
    e.preventDefault();
    ghost.style.transform = `translate(${e.clientX - offX}px, ${e.clientY - offY}px) scale(1.08)`;
    on.move?.(e.clientX, e.clientY);
  };
  const end = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    if (ghost) {
      ghost.remove();
      ghost = null;
      el.classList.remove('dragging');
      if (e.type === 'pointerup') on.drop(e.clientX, e.clientY);
    } else if (e.type === 'pointerup') on.tap?.();
  };
  const down = (e: PointerEvent): void => {
    if (id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // No text selection and no native drag: they would cancel the pointer events.
    e.preventDefault();
    id = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    const r = el.getBoundingClientRect();
    // From a handle, the copy is centered on the pointer; from the element, it keeps the grab point.
    offX = e.currentTarget === el ? e.clientX - r.left : r.width / 2;
    offY = e.currentTarget === el ? e.clientY - r.top : r.height / 2;
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  const noNative = (e: Event): void => e.preventDefault();
  for (const s of sources) {
    s.addEventListener('pointerdown', down);
    s.addEventListener('dragstart', noNative);
  }
  return () => {
    for (const s of sources) {
      s.removeEventListener('pointerdown', down);
      s.removeEventListener('dragstart', noNative);
    }
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    ghost?.remove();
  };
}

/** True when the viewport point is inside the element's box (grown by `pad` pixels). */
export function hit(el: Element, x: number, y: number, pad = 0): boolean {
  const r = el.getBoundingClientRect();
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}
