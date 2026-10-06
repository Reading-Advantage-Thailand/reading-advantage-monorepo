/**
 * The joystick of arena games. A joystick rests at the bottom left of the screen, so the student
 * sees how to move; a finger (or the mouse) held anywhere on the play area brings it under the
 * finger, and dragging steers toward the drag direction. On a computer, WASD and the arrow keys
 * steer too. It reports a direction of length 0 to 1 in screen terms (x to the right, y down);
 * the game turns it into world directions.
 *
 * The joystick has its own touch area under the other HUD controls: the HUD root itself ignores
 * pointer input (so taps reach the 3D scene), and a joystick on it would never see a finger.
 */
export interface JoystickOptions {
  /** Drag distance in pixels for full speed. */
  radius?: number;
  /** A short hint under the resting joystick (from the game's catalog, e.g. "Drag to move"). */
  hint?: string;
  /** Called with the new direction whenever it changes (0, 0 when released). */
  change(x: number, y: number): void;
}

export interface Joystick {
  dispose(): void;
}

const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  w: [0, -1],
  s: [0, 1],
};

/** Attaches a joystick to `surface` (the HUD root). */
export function attachJoystick(surface: HTMLElement, options: JoystickOptions): Joystick {
  const radius = options.radius ?? 56;
  const zone = document.createElement('div');
  zone.className = 'joystick-zone';
  const base = document.createElement('div');
  base.className = 'joystick rest';
  base.innerHTML = `<i></i>${options.hint ? `<span></span>` : ''}`;
  const knob = base.querySelector('i') as HTMLElement;
  const hint = base.querySelector('span');
  if (hint) hint.textContent = options.hint ?? '';
  zone.append(base);
  // First in the HUD: every other control (buttons, tags) stays on top of the touch area.
  surface.prepend(zone);
  let id: number | null = null;
  let ox = 0;
  let oy = 0;
  let last: [number, number] = [0, 0];
  const held = new Set<string>();

  const emit = (x: number, y: number): void => {
    if (Math.abs(x - last[0]) < 0.02 && Math.abs(y - last[1]) < 0.02) return;
    last = [x, y];
    options.change(x, y);
  };
  const rest = (): void => {
    base.classList.add('rest');
    base.style.left = '';
    base.style.top = '';
    knob.style.transform = 'translate(-50%, -50%)';
  };

  const down = (e: PointerEvent): void => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    ox = e.clientX;
    oy = e.clientY;
    const r = zone.getBoundingClientRect();
    base.classList.remove('rest');
    base.style.left = `${ox - r.left}px`;
    base.style.top = `${oy - r.top}px`;
    knob.style.transform = 'translate(-50%, -50%)';
    base.classList.add('on');
    zone.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    e.preventDefault();
    let dx = e.clientX - ox;
    let dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (len > radius) {
      dx = (dx / len) * radius;
      dy = (dy / len) * radius;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // A small dead zone, then a linear ramp to full speed.
    const k = len < 8 ? 0 : Math.min(1, len / radius);
    emit(len ? (dx / Math.hypot(dx, dy)) * k : 0, len ? (dy / Math.hypot(dx, dy)) * k : 0);
  };
  const up = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    base.classList.remove('on');
    rest();
    emit(0, 0);
  };
  const keyState = (): void => {
    let x = 0;
    let y = 0;
    for (const k of held) {
      const v = KEYS[k];
      if (v) {
        x += v[0];
        y += v[1];
      }
    }
    const len = Math.hypot(x, y) || 1;
    emit(x / len, y / len);
  };
  const keydown = (e: KeyboardEvent): void => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!KEYS[key]) return;
    e.preventDefault();
    held.add(key);
    keyState();
  };
  const keyup = (e: KeyboardEvent): void => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!held.delete(key)) return;
    keyState();
  };
  zone.addEventListener('pointerdown', down);
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerup', up);
  zone.addEventListener('pointercancel', up);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  rest();
  return {
    dispose() {
      zone.removeEventListener('pointerdown', down);
      zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerup', up);
      zone.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      zone.remove();
    },
  };
}
