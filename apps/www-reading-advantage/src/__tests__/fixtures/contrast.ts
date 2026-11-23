/**
 * Computes WCAG contrast from the real compiled stylesheet. The stylesheet is
 * injected into the test document, and jsdom applies its class, type, id and
 * descendant selectors. No background is read from class tokens by hand.
 *
 * The backdrop is the composite of every painted ancestor background, walked
 * from the root toward the text. An opaque layer stops the walk. A layer that
 * cannot be read throws; it is never treated as transparent.
 */
import { compiledCss, jsdomCss } from "./real-css";

/** An sRGB colour with an alpha channel from 0 to 1. */
export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** A painted background layer read from one element. */
export interface BackgroundLayer {
  /** The parsed colour, or null when the element paints no background. */
  readonly color: Color | null;
  /** True when a background image would paint behind the text. */
  readonly hasImage: boolean;
}

/** The page backdrop used when no ancestor paints a background. */
const PAGE_BACKGROUND = "#ffffff";

/** WCAG AA contrast floor for normal body text. */
export const AA_CONTRAST_MIN = 4.5;

/** The id of the injected stylesheet that carries the real cascade. */
const CASCADE_STYLE_ID = "contrast-fixture-real-cascade";

/** Custom property values from the compiled stylesheet. */
const customProperties = new Map<string, string>();
for (const match of compiledCss.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  if (!customProperties.has(match[1])) {
    customProperties.set(match[1], match[2].trim());
  }
}

/**
 * Injects the real compiled stylesheet into the test document once.
 * @returns Nothing. The style element is reused across reads.
 */
function ensureCascade(): void {
  if (document.getElementById(CASCADE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = CASCADE_STYLE_ID;
  style.textContent = jsdomCss;
  document.head.appendChild(style);
}

ensureCascade();

/**
 * Reads the effective value of one custom property for an element.
 * Inline declarations win, then jsdom's computed value (which inherits from
 * ancestors), then the compiled :root map.
 * @param element The element whose cascade applies.
 * @param name The custom property name.
 * @returns The declared value, or undefined when nothing sets it.
 */
function effectiveCustomProperty(
  element: Element,
  name: string,
): string | undefined {
  let node: Element | null = element;
  while (node !== null) {
    if (node instanceof HTMLElement) {
      const inline = node.style.getPropertyValue(name);
      if (inline.trim()) return inline.trim();
    }
    const computed = window.getComputedStyle(node).getPropertyValue(name);
    if (computed.trim()) return computed.trim();
    node = node.parentElement;
  }
  return customProperties.get(name);
}

/**
 * Resolves var() references from the effective cascade of an element.
 * @param value The colour value to resolve.
 * @param element The element whose cascade applies.
 * @returns The value with resolvable variables substituted.
 * @throws When a referenced property is set but its winning value is unknown.
 */
function resolveVariables(value: string, element: Element): string {
  return value.replace(
    /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g,
    (whole, name: string, fallback: string | undefined) => {
      const declared = effectiveCustomProperty(element, name);
      const source =
        declared ?? (fallback ? fallback.trim() : undefined) ?? customProperties.get(name);
      if (source === undefined) {
        throw new Error(
          `Unresolved custom property ${name} on <${element.tagName.toLowerCase()}>`,
        );
      }
      const resolved = resolveVariables(source, element);
      if (/var\(/.test(resolved)) {
        throw new Error(
          `Unresolved custom property ${name} on <${element.tagName.toLowerCase()}>`,
        );
      }
      return resolved;
    },
  );
}

/**
 * Clamps a channel to the sRGB byte range.
 * @param value The computed channel value.
 * @returns An integer from 0 to 255.
 */
function channel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Converts an OKLCh colour to sRGB using the standard OKLab matrices.
 * @param lightness The OKLab lightness from 0 to 1.
 * @param chroma The OKLab chroma.
 * @param hue The hue in degrees.
 * @param alpha The alpha channel from 0 to 1.
 * @returns The colour in sRGB space.
 */
function oklchToRgb(
  lightness: number,
  chroma: number,
  hue: number,
  alpha: number,
): Color {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const encode = (linear: number): number =>
    linear <= 0.0031308
      ? 12.92 * linear
      : 1.055 * linear ** (1 / 2.4) - 0.055;
  return {
    r: channel(encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255),
    g: channel(encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255),
    b: channel(encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255),
    a: alpha,
  };
}

/**
 * Parses a resolved CSS colour into sRGB channels.
 * @param value A colour from the compiled stylesheet: hex, rgb(a), or oklch.
 * @returns The parsed colour.
 * @throws When the colour is unresolved or uses an unsupported syntax.
 */
export function parseColor(value: string): Color {
  const text = value.trim();

  if (text.startsWith("#")) {
    const hex = text.slice(1);
    if (/^[\da-f]{3}$|^[\da-f]{4}$|^[\da-f]{6}$|^[\da-f]{8}$/i.test(hex) === false) {
      throw new Error(`Unsupported colour: ${value}`);
    }
    const wide = hex.length <= 4
      ? hex.split("").map((digit) => digit + digit).join("")
      : hex;
    return {
      r: parseInt(wide.slice(0, 2), 16),
      g: parseInt(wide.slice(2, 4), 16),
      b: parseInt(wide.slice(4, 6), 16),
      a: wide.length === 8 ? parseInt(wide.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = text.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i,
  );
  if (rgb) {
    return {
      r: channel(Number(rgb[1])),
      g: channel(Number(rgb[2])),
      b: channel(Number(rgb[3])),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  const oklch = text.match(
    /^oklch\(\s*([\d.]+)(%)?\s*([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i,
  );
  if (oklch) {
    const lightness = Number(oklch[1]) / (oklch[2] === "%" ? 100 : 1);
    return oklchToRgb(
      lightness,
      Number(oklch[3]),
      Number(oklch[4]),
      oklch[5] === undefined ? 1 : Number(oklch[5]),
    );
  }

  throw new Error(`Unresolved or unsupported colour: ${value}`);
}

/**
 * Computes the WCAG relative luminance of one colour.
 * @param color The colour in sRGB space.
 * @returns The relative luminance from 0 to 1.
 */
export function relativeLuminance(color: Color): number {
  const linear = (byte: number): number => {
    const value = byte / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linear(color.r) +
    0.7152 * linear(color.g) +
    0.0722 * linear(color.b)
  );
}

/**
 * Computes the WCAG contrast ratio of two opaque colours.
 * @param foreground The text colour.
 * @param background The backdrop colour.
 * @returns The contrast ratio from 1 to 21.
 */
export function contrastRatio(foreground: Color, background: Color): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Blends a translucent colour over an opaque backdrop.
 * @param foreground The colour with alpha.
 * @param backdrop The opaque colour underneath.
 * @returns The blended opaque colour.
 */
function blend(foreground: Color, backdrop: Color): Color {
  if (foreground.a >= 1) return foreground;
  const alpha = foreground.a;
  return {
    r: channel(foreground.r * alpha + backdrop.r * (1 - alpha)),
    g: channel(foreground.g * alpha + backdrop.g * (1 - alpha)),
    b: channel(foreground.b * alpha + backdrop.b * (1 - alpha)),
    a: 1,
  };
}

/**
 * Reads the painted background layer of one element from jsdom's cascade.
 * @param element The rendered element.
 * @returns The colour layer, or null when nothing is painted.
 * @throws When a background image or an unreadable colour would paint.
 */
export function readBackgroundLayer(element: Element): BackgroundLayer {
  ensureCascade();
  const tag = element.tagName.toLowerCase();
  const style = window.getComputedStyle(element);
  const image = style.backgroundImage;
  if (image && image !== "none") {
    throw new Error(`Unsupported background image "${image}" on <${tag}>`);
  }
  const value = style.backgroundColor;
  if (!value || value === "transparent" || /^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(value)) {
    return { color: null, hasImage: false };
  }
  const resolved = resolveVariables(value, element);
  try {
    const color = parseColor(resolved);
    if (color.a === 0) return { color: null, hasImage: false };
    return { color, hasImage: false };
  } catch {
    throw new Error(`Unsupported background colour "${value}" on <${tag}>`);
  }
}

/**
 * Resolves the full painted backdrop behind an element.
 * @param element The rendered element.
 * @param read The background reader, injectable for unit tests.
 * @returns The composed opaque backdrop colour.
 * @throws When a painted layer or background image cannot be resolved.
 */
export function resolveBackdrop(
  element: Element,
  read: (element: Element) => BackgroundLayer = readBackgroundLayer,
): Color {
  const layer = read(element);
  if (layer.hasImage) {
    throw new Error(`Background image on <${element.tagName.toLowerCase()}>`);
  }
  if (layer.color !== null && layer.color.a >= 1) return layer.color;
  const parent = element.parentElement;
  const behind = parent
    ? resolveBackdrop(parent, read)
    : parseColor(PAGE_BACKGROUND);
  if (layer.color === null) return behind;
  return blend(layer.color, behind);
}

/**
 * Computes the rendered contrast of one element against its painted backdrop.
 * @param element The rendered text element.
 * @returns The WCAG contrast ratio.
 * @throws When the foreground or backdrop colour cannot be resolved.
 */
export function contrastOf(element: Element): number {
  const background = resolveBackdrop(element);
  ensureCascade();
  const value = window.getComputedStyle(element).color;
  if (!value) throw new Error(`Unresolved foreground colour: ${element.tagName}`);
  const foreground = blend(
    parseColor(resolveVariables(value, element)),
    background,
  );
  return contrastRatio(foreground, background);
}
