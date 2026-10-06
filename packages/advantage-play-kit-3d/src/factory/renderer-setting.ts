/**
 * The one "2D mode (older phones)" setting of the Advantage Play Kit. The ported 3D games and
 * the Primary Advantage skin pages read the same value, so a student who picks 2D once gets 2D
 * everywhere. The setting is the Forge demo's: the JSON under the storage key `chibi-quest`
 * with `flat: true`. `?renderer=phaser` forces 2D for one visit, and a device without WebGL2
 * gets 2D.
 */

/** The storage key the Chibi Quest host saves its choices under (shared with the Forge demo). */
export const RENDERER_SETTINGS_KEY = "chibi-quest";

/** A renderer choice. */
export type Renderer = "2d" | "3d";

/** What the choice reads. */
export interface RendererInputs {
  /** The page query string (`?renderer=phaser` forces 2D). */
  search: string;
  /** The saved settings JSON, or null. */
  saved: string | null;
  /** Whether the device has WebGL2. */
  webgl2: boolean;
}

/**
 * Chooses the renderer from the inputs.
 * @param inputs The query string, the saved settings, and the WebGL2 check.
 * @returns "2d" when forced or unsupported, else "3d".
 */
export function chooseRenderer({ search, saved, webgl2 }: RendererInputs): Renderer {
  if (new URLSearchParams(search).get("renderer") === "phaser") return "2d";
  try {
    const settings = JSON.parse(saved ?? "{}") as { flat?: boolean };
    if (settings.flat) return "2d";
  } catch {
    // Unreadable settings count as no setting.
  }
  return webgl2 ? "3d" : "2d";
}

/**
 * Reads the inputs from the browser and chooses the renderer. Safe to call on a server: it
 * answers "2d" there, so a page renders its fallback first and upgrades on the client.
 * @returns The renderer.
 */
export function detectRenderer(): Renderer {
  if (typeof window === "undefined") return "2d";
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(RENDERER_SETTINGS_KEY);
  } catch {
    saved = null;
  }
  let webgl2 = false;
  try {
    webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    webgl2 = false;
  }
  return chooseRenderer({ search: window.location.search, saved, webgl2 });
}

/**
 * Reads the saved "2D mode (older phones)" choice.
 * @returns True when the student chose 2D.
 */
export function readFlatMode(): boolean {
  try {
    return Boolean((JSON.parse(window.localStorage.getItem(RENDERER_SETTINGS_KEY) ?? "{}") as { flat?: boolean }).flat);
  } catch {
    return false;
  }
}

/**
 * Saves the "2D mode (older phones)" choice beside the other Chibi Quest settings.
 * @param flat True for 2D.
 */
export function saveFlatMode(flat: boolean): void {
  try {
    const current = JSON.parse(window.localStorage.getItem(RENDERER_SETTINGS_KEY) ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem(RENDERER_SETTINGS_KEY, JSON.stringify({ ...current, flat }));
  } catch {
    // Storage can be blocked; the choice applies to this visit only.
  }
}
