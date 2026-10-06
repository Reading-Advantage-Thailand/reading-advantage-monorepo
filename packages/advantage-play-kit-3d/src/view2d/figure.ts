/**
 * The student's figure in a 2D view (docs/avatar-system.md, section 11). Owner rule: the avatar is
 * the student's identity, so a student with an avatar never appears as a hero sprite. There are no
 * 2D sheets of an avatar yet: the figure is one still image of the student (the avatar portrait,
 * made by the avatar module as a `FigureSource`) at the scale of the 2D sprites, and `Figure2D`
 * moves it with simple motion (a breath, a bob, a lunge, a hop, a fall) under the hero clip names.
 * Until the image is ready, or when it does not load, the figure is a neutral grey silhouette.
 */
import type * as Phaser from 'phaser';

/** Pixels per meter of the 2D sprite sheets (scripts/apk2d-sprites.ts): a figure made at it matches a hero sheet at the same scale. */
export const SPRITE_PPM = 64;

/** A still image of the student and the loading state (the avatar module makes one from the portrait). */
export interface FigureSource {
  /** The image once it is ready; null while it loads, and after it did not load. */
  readonly image: HTMLCanvasElement | null;
  /** Resolves true when the image is ready, false when it did not load (the silhouette stays). */
  readonly ready: Promise<boolean>;
  /** The side of the square image in pixels. */
  readonly size: number;
  /** Image pixels per meter. */
  readonly ppm: number;
  /** The ground point under the figure, as fractions of the image size. */
  readonly origin: { readonly x: number; readonly y: number };
  /** The way the figure looks in the image: +1 to the image right, -1 to the left. */
  readonly facing: 1 | -1;
}

/** The side of the figure texture at `ppm` (the 2D sprites have 64 pixels per meter). */
const sideAt = (source: FigureSource, ppm: number): number => Math.max(8, Math.round((source.size * ppm) / source.ppm));

/** The source image at `ppm`, halved step by step for a clean small image. */
function scaledImage(image: HTMLCanvasElement, side: number): HTMLCanvasElement {
  let current = image;
  while (current.width / 2 >= side) {
    const half = document.createElement('canvas');
    half.width = half.height = Math.round(current.width / 2);
    const g = half.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(current, 0, 0, half.width, half.height);
    current = half;
  }
  const out = document.createElement('canvas');
  out.width = out.height = side;
  const g = out.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(current, 0, 0, side, side);
  return out;
}

/**
 * A neutral grey silhouette in the frame of the figure (`side` pixels, `ppm` pixels per meter,
 * standing on `origin`): a head, a body, arms, and legs, with no face, hair, or clothes.
 */
export function silhouetteCanvas(side: number, ppm: number, origin: { x: number; y: number }): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const g = canvas.getContext('2d')!;
  const gx = origin.x * side;
  const gy = origin.y * side;
  /** A point `x` meters right of the ground point and `y` meters above it (seen a little from above). */
  const at = (x: number, y: number): [number, number] => [gx + x * ppm, gy - y * 0.94 * ppm];
  const shapes = (grow: number) => {
    g.beginPath();
    const [hx, hy] = at(0, 0.78);
    g.moveTo(hx + 0.21 * ppm + grow, hy);
    g.arc(hx, hy, 0.21 * ppm + grow, 0, Math.PI * 2);
    const [bx, by] = at(0, 0.38);
    g.moveTo(bx + 0.16 * ppm + grow, by);
    g.ellipse(bx, by, 0.16 * ppm + grow, 0.2 * ppm + grow, 0, 0, Math.PI * 2);
    for (const side of [-1, 1]) {
      const [lx, ly] = at(side * 0.075 - 0.05, 0.25);
      g.roundRect(lx - grow, ly - grow, 0.1 * ppm + grow * 2, 0.25 * 0.94 * ppm + grow * 2, 0.05 * ppm);
      const [ax, ay] = at(side * 0.2 - 0.04, 0.52);
      g.roundRect(ax - grow, ay - grow, 0.08 * ppm + grow * 2, 0.26 * 0.94 * ppm + grow * 2, 0.04 * ppm);
    }
  };
  const line = Math.max(1, ppm / 40);
  shapes(line);
  g.fillStyle = '#5d636d';
  g.fill();
  shapes(0);
  g.fillStyle = '#9aa1ac';
  g.fill();
  return canvas;
}

/** The texture key of the figure at `ppm`: the student's image when it is ready, else the silhouette. Made once per game. */
export function figureTexture(scene: Phaser.Scene, source: FigureSource, ppm: number): string {
  const side = sideAt(source, ppm);
  if (source.image) {
    const key = `avatar-figure@${ppm}`;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, scaledImage(source.image, side));
    return key;
  }
  const key = `avatar-silhouette@${ppm}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, silhouetteCanvas(side, ppm, source.origin));
  return key;
}

type MotionKind = 'lunge' | 'recoil' | 'hop' | 'fall' | 'nod';

/** The motion and length (seconds) of a hero clip name. */
const MOTIONS: readonly { readonly test: RegExp; readonly kind: MotionKind; readonly seconds: number }[] = [
  { test: /^(attack|cast|shoot|throw|swing|strike|spell|slash)/, kind: 'lunge', seconds: 0.5 },
  { test: /^(hit|hurt)/, kind: 'recoil', seconds: 0.4 },
  { test: /^(victory|cheer|celebrate|jump)/, kind: 'hop', seconds: 0.9 },
  { test: /^(death|die|defeat|fall)/, kind: 'fall', seconds: 0.7 },
];

const motionOf = (clip: string) => MOTIONS.find((m) => m.test.test(clip)) ?? { kind: 'nod' as const, seconds: 0.4 };

/** A pose of the figure: an offset in meters (x right, y up), a lean in radians toward its facing, a squash. */
interface Pose {
  x: number;
  y: number;
  lean: number;
  squash: number;
}

/** The pose of a motion at u (0 to 1). */
function poseOf(kind: MotionKind, u: number): Pose {
  switch (kind) {
    case 'lunge': {
      const p = u < 0.3 ? Math.sin((u / 0.3) * (Math.PI / 2)) : 1 - (u - 0.3) / 0.7;
      return { x: 0.18 * p, y: 0, lean: 0.25 * p, squash: 1 };
    }
    case 'recoil': {
      const p = Math.sin(Math.PI * u);
      return { x: -0.1 * p, y: 0, lean: -0.2 * p, squash: 1 };
    }
    case 'hop': {
      const h = Math.abs(Math.sin(2 * Math.PI * u));
      return { x: 0, y: 0.22 * h, lean: 0, squash: 1 + 0.06 * (1 - h) * (u < 0.98 ? 1 : 0) };
    }
    case 'fall': {
      const p = 1 - (1 - u) ** 3;
      return { x: 0, y: 0, lean: -(Math.PI / 2) * 0.95 * p, squash: 1 };
    }
    case 'nod':
      return { x: 0, y: 0.06 * Math.sin(Math.PI * u), lean: 0, squash: 1 };
  }
}

/**
 * The student's figure as a Phaser sprite with simple motion: `play` a hero clip name, `face` a
 * screen direction, and call `update` each frame (it returns the offset in pixels to add to the
 * sprite's ground point). The view places the sprite; the figure turns, leans, and squashes it.
 */
export class Figure2D {
  readonly sprite: Phaser.GameObjects.Sprite;
  private flip = false;
  private time = 0;
  private action: { kind: MotionKind; seconds: number; elapsed: number; speed: number; hold: boolean; resolve: (() => void) | null } | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly source: FigureSource,
    /** Pixels per meter of the view (the 2D sprites: 64). */
    private readonly ppm: number,
    parent?: Phaser.GameObjects.Container,
  ) {
    this.sprite = scene.add.sprite(0, 0, figureTexture(scene, source, ppm)).setOrigin(source.origin.x, source.origin.y);
    parent?.add(this.sprite);
    if (!source.image) {
      void source.ready.then((ok) => {
        if (ok && this.sprite.scene) this.sprite.setTexture(figureTexture(this.sprite.scene, source, ppm));
      });
    }
  }

  /** Faces a screen direction (dx > 0: right); a direction straight up or down keeps the side. */
  face(dx: number): void {
    if (Math.abs(dx) < 1e-3) return;
    this.flip = Math.sign(dx) !== this.source.facing;
  }

  /** The length of a clip's motion in seconds at a speed. */
  seconds(clip: string, speed = 1): number {
    return motionOf(clip).seconds / speed;
  }

  /** Plays the motion of a clip name; resolves when it ends. With `hold`, the last pose stays until `rest`. */
  play(clip: string, speed = 1, hold = false): Promise<void> {
    this.action?.resolve?.();
    const { kind, seconds } = motionOf(clip);
    return new Promise((resolve) => {
      this.action = { kind, seconds, elapsed: 0, speed, hold, resolve };
    });
  }

  /** Ends a motion or a held pose (back to the idle breath or the walking bob). */
  rest(): void {
    this.action?.resolve?.();
    this.action = null;
  }

  /** Advances the motion; returns the offset in pixels (x right, y down, at the sprite's scale) from its ground point. */
  update(dt: number, moving: boolean): { x: number; y: number } {
    this.time += dt;
    let pose: Pose;
    if (this.action) {
      const a = this.action;
      a.elapsed += dt * a.speed;
      const u = Math.min(1, a.elapsed / a.seconds);
      pose = poseOf(a.kind, u);
      if (u >= 1) {
        a.resolve?.();
        a.resolve = null;
        if (!a.hold) this.action = null;
      }
    } else if (moving) {
      pose = { x: 0, y: 0.05 * Math.abs(Math.sin(this.time * Math.PI * 4.4)), lean: 0.08, squash: 1 };
    } else {
      pose = { x: 0, y: 0, lean: 0, squash: 1 + 0.018 * Math.sin((this.time * Math.PI * 2) / 2.2) };
    }
    const forward = this.flip ? -this.source.facing : this.source.facing;
    this.sprite.setFlipX(this.flip);
    this.sprite.rotation = forward * pose.lean;
    this.sprite.scaleY = Math.abs(this.sprite.scaleX) * pose.squash;
    const k = Math.abs(this.sprite.scaleX) * this.ppm;
    return { x: forward * pose.x * k, y: -pose.y * k };
  }
}
