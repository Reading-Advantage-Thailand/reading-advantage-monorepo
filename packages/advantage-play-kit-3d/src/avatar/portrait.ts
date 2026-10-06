/**
 * Avatar portraits from layers (docs/avatar-system.md, section 9). The forge renders the base and
 * every piece of the avatar pack at one fixed camera into layers of one frame
 * (scripts/avatar-portraits.ts); a client draws the layers of a loadout in slot order. No 3D: the
 * phone HUD, the dashboard, the profile page, the shop, and the class list use it.
 *
 * Each layer has a color image (WebP with alpha, in the default colors) and a tint mask image
 * (lossless WebP, opaque, PORTRAIT_SIZE wide and twice as high: the mask channels R, G, B in the top
 * half, A in the bottom half). `recolorLayer` gives a layer the student's colors with the formula of
 * the 3D shader: per channel, color *= mix(1, option / default, mask), in linear light.
 *
 * Every layer was rendered with the base body as a depth-only occluder, so a layer holds only what
 * shows in front of the body. The draw order settles where two pieces overlap: the far hand first,
 * then the pieces from the back to the front, the near (weapon) hand last. A head piece that keeps
 * the full hair (a band under the fringe) has a layer per hair style with that style as an occluder.
 */
import { strongestHairForm, type HairForm } from './hair.js';
import { hairTint, tintScales, type TintChoice, type VariantTable } from './tint.js';

export const PORTRAIT_SIZE = 512;

/**
 * The fixed portrait camera: orthographic, three-quarter from the avatar's right (the weapon hand
 * near, the avatar looking to the image right), a little from above (lower than the sprites, so
 * the face shows under a hat brim). `halfSize` is half the frame in meters around `target`.
 */
export const PORTRAIT_CAMERA = { azimuth: -35, elevation: 20, target: [0, 0.62, 0] as const, halfSize: 0.78 } as const;

/** The base layers: `base` is every base body that no piece hides (skin, pants); a piece can hide the others. */
export const BASE_LAYERS = ['base', 'shoes', 'undershirt'] as const;

/** Draw order: the base layers, then the piece slots from far to near. */
export const PORTRAIT_ORDER = [...BASE_LAYERS, 'offhand', 'back', 'feet', 'chest', 'waist', 'shoulders', 'hands', 'hair', 'head', 'mainhand'] as const;

export interface PortraitPiece {
  readonly id: string;
  readonly slot: string;
  readonly hides: readonly string[];
  readonly hair: HairForm;
}

/**
 * The layer name of a hair style in one hair color and form: full, capped, or tucked (under a head
 * piece that caps or tucks the hair). Hair layers are rendered in each color: a hair color
 * multiplies the albedo by up to 5 (brown to blond), and the same multiplier on a lit image also
 * scales the highlights.
 */
export const hairLayer = (style: string, form: Exclude<HairForm, 'hidden'>, color: string): string => `${style}${form === 'full' ? '' : `.${form}`}@${color}`;

/**
 * The layer name of a head piece that keeps the full hair, over one hair style: it was rendered
 * with the style as an occluder, so the fringe in front of a band shows through.
 */
export const overHairLayer = (piece: string, style: string): string => `${piece}+${style}`;

/**
 * The layer names of a loadout in draw order: the base layers that no piece hides, the hair style
 * (the chosen one or `defaultHair`, in `hairColor`; capped under a capping head piece; none under a
 * hiding one), and every other piece (a head piece that keeps the full hair over that style).
 */
export function portraitLayers(pieces: readonly PortraitPiece[], hairColor: string, defaultHair = 'avatar-hair-swept'): string[] {
  const hides = new Set(pieces.flatMap((p) => p.hides));
  const hair = strongestHairForm(pieces.filter((p) => p.slot === 'head').map((p) => p.hair));
  const style = pieces.find((p) => p.slot === 'hair')?.id ?? defaultHair;
  const bySlot = new Map<string, string>();
  for (const layer of BASE_LAYERS) if (!hides.has(layer)) bySlot.set(layer, layer);
  for (const p of pieces) if (p.slot !== 'hair') bySlot.set(p.slot, p.slot === 'head' && p.hair === 'full' ? overHairLayer(p.id, style) : p.id);
  if (hair !== 'hidden') bySlot.set('hair', hairLayer(style, hair, hairColor));
  return PORTRAIT_ORDER.flatMap((slot) => (bySlot.has(slot) ? [bySlot.get(slot)!] : []));
}

/** A worn piece for a portrait: its catalog entry, its slot table (`dyes`), and the chosen dyes. */
export interface PortraitItem extends PortraitPiece {
  readonly table: VariantTable | null;
  readonly dyes?: Readonly<Record<string, string>>;
}

export interface PortraitLoadout {
  /** The slot table of the avatar base and the student's choice (a preset or an option per slot). */
  readonly base: VariantTable | null;
  readonly tints?: TintChoice;
  readonly pieces: readonly PortraitItem[];
  /** The hair style worn when the loadout has none. */
  readonly defaultHair: PortraitItem;
}

/**
 * The layers of a loadout in draw order with the color multipliers of each: the base layers take
 * the student's tints, the hair style is the layer in the base hair color (or the style's default
 * color), a piece takes its dyes (the same colors as the 3D composer).
 */
export function portraitPlan(loadout: PortraitLoadout): { layer: string; scales: [number, number, number][] }[] {
  const style = loadout.pieces.find((p) => p.slot === 'hair') ?? loadout.defaultHair;
  const chosen = hairTint(loadout.base, loadout.tints);
  const hairSlot = style.table?.slots.hair;
  const color = chosen && hairSlot?.options[chosen] ? chosen : (hairSlot?.default ?? 'default');
  const none = (): [number, number, number][] => NO_TINT.map((s) => [...s] as [number, number, number]);
  const scalesOf = (layer: string): [number, number, number][] => {
    if ((BASE_LAYERS as readonly string[]).includes(layer)) return loadout.base ? tintScales(loadout.base, loadout.tints ?? {}) : none();
    if (layer.startsWith(`${style.id}@`) || layer.startsWith(`${style.id}.capped@`) || layer.startsWith(`${style.id}.tucked@`)) {
      const { hair: _baked, ...dyes } = style.dyes ?? {};
      return style.table ? tintScales(style.table, dyes) : none();
    }
    const item = loadout.pieces.find((p) => p.id === layer || layer === overHairLayer(p.id, style.id))!;
    return item.table ? tintScales(item.table, item.dyes ?? {}) : none();
  };
  return portraitLayers(loadout.pieces, color, loadout.defaultHair.id).map((layer) => ({ layer, scales: scalesOf(layer) }));
}

const toLinear = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  toLinear[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const toSrgb = (v: number): number => {
  const c = v <= 0 ? 0 : v >= 1 ? 1 : v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(c * 255);
};

/** Channel multipliers that change nothing (the default colors). */
export const NO_TINT: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
];

/**
 * A layer in other colors. `color` is RGBA (size x size), `mask` RGBA (size x 2 size), `scales`
 * the multipliers of the mask channels R, G, B, A (from `tintScales`). Returns new RGBA pixels.
 */
export function recolorLayer(color: Uint8ClampedArray, mask: Uint8ClampedArray, scales: readonly (readonly [number, number, number])[], size: number = PORTRAIT_SIZE): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(color);
  const plane = size * size * 4;
  const m = [0, 0, 0, 0];
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    if (color[o + 3] === 0) continue;
    m[0] = mask[o]! / 255;
    m[1] = mask[o + 1]! / 255;
    m[2] = mask[o + 2]! / 255;
    m[3] = mask[plane + o]! / 255;
    for (let c = 0; c < 3; c++) {
      let k = 1;
      for (let ch = 0; ch < 4; ch++) k *= 1 + (scales[ch]![c]! - 1) * m[ch]!;
      if (k !== 1) out[o + c] = toSrgb(toLinear[color[o + c]!]! * k);
    }
  }
  return out;
}

/**
 * Layers drawn over each other in the given order (straight alpha, blended in sRGB bytes as a 2D
 * canvas does). Returns RGBA pixels (size x size).
 */
export function stackLayers(layers: readonly Uint8ClampedArray[], size: number = PORTRAIT_SIZE): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(size * size * 4);
  for (const layer of layers)
    for (let o = 0; o < out.length; o += 4) {
      const a = layer[o + 3]! / 255;
      if (a === 0) continue;
      const below = (out[o + 3]! / 255) * (1 - a);
      const alpha = a + below;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round((layer[o + c]! * a + out[o + c]! * below) / alpha);
      out[o + 3] = Math.round(alpha * 255);
    }
  return out;
}

/** A pack image as RGBA pixels (browser only). */
export async function portraitPixels(url: string): Promise<Uint8ClampedArray> {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const g = canvas.getContext('2d')!;
  g.drawImage(bitmap, 0, 0);
  return g.getImageData(0, 0, bitmap.width, bitmap.height).data;
}
