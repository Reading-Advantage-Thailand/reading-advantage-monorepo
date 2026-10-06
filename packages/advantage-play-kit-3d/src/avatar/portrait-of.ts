/**
 * The student's portrait in a 2D view (docs/avatar-system.md, sections 9 and 11; track
 * avatar_in_games_20261006): the layers of the launch avatar from the pack, recolored and stacked
 * as the 3D composer colors the avatar, a round face icon for the HUD, and the whole portrait as the
 * student's figure in a 2D game (`playerFigure`, the source of the view2d `Figure2D`). Browser only.
 */
import type { APKDiagnosticInput } from '../contracts/apk.js';
import type { LaunchAvatar } from '../contracts/avatar.js';
import { DEFAULT_HAIR, fromServedVersion, pieceDyes, type AvatarCatalog } from './launch.js';
import { PORTRAIT_CAMERA, PORTRAIT_SIZE, portraitPixels, portraitPlan, recolorLayer, stackLayers, type PortraitItem } from './portrait.js';

/** The pack's `portraits.json`, the field a client reads. */
interface PortraitIndex {
  readonly layers: Readonly<Record<string, { readonly color: string; readonly mask: string }>>;
}

/** The URL folder of the avatar pack versions in the apps (a 2D view's default). */
export const APP_AVATAR_URL = '/packs/avatar';

/**
 * The face in a portrait as fractions of its size: the center and the side of a square. Measured
 * on the base layer of the 2026-10-04 portraits (head rows 174 to 305 of 512, centered at x 258).
 */
export const PORTRAIT_FACE = { cx: 0.505, cy: 0.47, side: 0.37 } as const;

async function json(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

/**
 * The portrait of a launch avatar as RGBA pixels (PORTRAIT_SIZE square). `root` is the URL folder
 * of the pack versions (`/packs/avatar` in the apps). Throws when a file or a layer is missing.
 */
export async function avatarPortrait(root: string, avatar: LaunchAvatar): Promise<{ pixels: Uint8ClampedArray; version: string }> {
  const { value: catalog, version } = await fromServedVersion(avatar.catalogVersion, async (v) => (await json(`${root}/${v}/catalog.json`)) as AvatarCatalog);
  const dir = `${root}/${version}/`;
  const index = (await json(`${dir}portraits.json`)) as PortraitIndex;
  const items = new Map(catalog.items.map((i) => [i.id, i]));
  const itemOf = (id: string, dye: string | null): PortraitItem => {
    const item = items.get(id);
    if (!item?.equip) throw new Error(`no piece '${id}' in avatar pack ${version}`);
    return { id, slot: item.slot, hides: item.equip.hides, hair: item.equip.hair, table: item.dyes, dyes: pieceDyes(item.dyes, dye) };
  };
  const plan = portraitPlan({
    base: catalog.base.variants,
    tints: avatar.tints,
    pieces: avatar.pieces.map((p) => itemOf(p.itemId, p.dye)),
    defaultHair: itemOf(DEFAULT_HAIR, null),
  });
  const layers = await Promise.all(
    plan.map(async ({ layer, scales }) => {
      const files = index.layers[layer];
      if (!files) throw new Error(`no portrait layer '${layer}' in avatar pack ${version}`);
      const [color, mask] = await Promise.all([portraitPixels(dir + files.color), portraitPixels(dir + files.mask)]);
      return recolorLayer(color, mask, scales);
    }),
  );
  return { pixels: stackLayers(layers), version };
}

/** The face of a portrait in a circle, `size` pixels square, on a transparent canvas (a Phaser texture source). */
export function portraitIcon(pixels: Uint8ClampedArray, size = 96): HTMLCanvasElement {
  const full = document.createElement('canvas');
  full.width = full.height = PORTRAIT_SIZE;
  full.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), PORTRAIT_SIZE, PORTRAIT_SIZE), 0, 0);
  const side = PORTRAIT_FACE.side * PORTRAIT_SIZE;
  const icon = document.createElement('canvas');
  icon.width = icon.height = size;
  const g = icon.getContext('2d')!;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.fillStyle = '#f3e4c3';
  g.fill();
  g.clip();
  g.drawImage(full, PORTRAIT_FACE.cx * PORTRAIT_SIZE - side / 2, PORTRAIT_FACE.cy * PORTRAIT_SIZE - side / 2, side, side, 0, 0, size, size);
  return icon;
}

/** Portrait pixels per meter (the orthographic frame is twice `halfSize` meters high). */
export const PORTRAIT_PPM = PORTRAIT_SIZE / (2 * PORTRAIT_CAMERA.halfSize);

/** The ground point under the avatar in a portrait, as fractions of its size (the camera looks at `target`, `elevation` degrees from above). */
export const PORTRAIT_FEET = {
  x: 0.5,
  y: 0.5 + (PORTRAIT_CAMERA.target[1] * Math.cos((PORTRAIT_CAMERA.elevation * Math.PI) / 180)) / (2 * PORTRAIT_CAMERA.halfSize),
} as const;

/** The student's portrait as a figure for a 2D view: the same fields as the view2d `FigureSource`, and the pixels for a face icon. */
export interface PortraitFigure {
  image: HTMLCanvasElement | null;
  pixels: Uint8ClampedArray | null;
  readonly ready: Promise<boolean>;
  readonly size: number;
  readonly ppm: number;
  readonly origin: { readonly x: number; readonly y: number };
  /** The portrait camera stands at the avatar's right: the avatar looks to the image right. */
  readonly facing: 1;
}

/**
 * Starts to load the portrait of a launch avatar as the student's figure. It never throws: when a
 * file does not load, `ready` resolves false, a `warning` diagnostic goes out, and the 2D view
 * keeps the neutral silhouette (never a hero).
 */
export function portraitFigure(root: string, avatar: LaunchAvatar, diagnostic: (event: APKDiagnosticInput) => void): PortraitFigure {
  const figure: PortraitFigure = {
    image: null,
    pixels: null,
    size: PORTRAIT_SIZE,
    ppm: PORTRAIT_PPM,
    origin: PORTRAIT_FEET,
    facing: 1,
    ready: avatarPortrait(root, avatar).then(
      ({ pixels }) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = PORTRAIT_SIZE;
        canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), PORTRAIT_SIZE, PORTRAIT_SIZE), 0, 0);
        figure.pixels = pixels;
        figure.image = canvas;
        return true;
      },
      (error: unknown) => {
        diagnostic({
          level: 'warning',
          code: 'apk3d/avatar-fallback',
          message: 'The avatar portrait did not load; the 2D view shows a neutral figure in its place.',
          details: { reason: error instanceof Error ? error.message : String(error), classId: avatar.classId, catalogVersion: avatar.catalogVersion },
        });
        return false;
      },
    ),
  };
  return figure;
}

/**
 * The student's figure for a 2D view of a session: null when the session has no avatar (the view
 * shows its hero sprite), else the portrait figure, which starts to load at once (call it when the
 * view is made, so it loads while the pack loads).
 */
export function playerFigure(ctx: { readonly avatarRoot?: string; readonly options?: { readonly avatar?: LaunchAvatar }; diagnostic(event: APKDiagnosticInput): void }): PortraitFigure | null {
  const avatar = ctx.options?.avatar;
  return avatar ? portraitFigure(ctx.avatarRoot ?? APP_AVATAR_URL, avatar, (event) => ctx.diagnostic(event)) : null;
}
