/** Browser-safe asset views used by the standard APK asset filesystem. */
export const STANDARD_ASSET_VIEWS = [
  "top-down",
  "side-view",
  "ui",
  "world",
  "effects",
  "audio",
  "font",
] as const;

/** One approved top-level standard-library view. */
export type StandardAssetView = (typeof STANDARD_ASSET_VIEWS)[number];

/** Intended cell dimensions, distinct from the encoded image dimensions. */
export interface AssetCellSize {
  width: number;
  height: number;
}

/** Parsed filesystem-derived metadata for a standard APK asset. */
export interface StandardAssetPath {
  path: string;
  key: string;
  view: StandardAssetView;
  cellSize: AssetCellSize | null;
  category: string;
  extension: string;
}

/** Browser URL and stable semantic key for one standard asset. */
export interface ResolvedStandardAsset {
  url: string;
  key: string;
}

const RASTER_EXTENSIONS = new Set(["png"]);
const AUDIO_EXTENSIONS = new Set(["ogg", "mp3", "wav"]);
const FONT_EXTENSIONS = new Set(["ttf", "otf", "woff2"]);
const NAME_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CELL_SIZE = /^(?<width>[1-9][0-9]*)x(?<height>[1-9][0-9]*)$/u;
const NATIVE_VIEWS = new Set<StandardAssetView>(["audio", "font", "world"]);

function invalid(path: string, reason: string): never {
  throw new Error(`Invalid APK standard asset path ${JSON.stringify(path)}: ${reason}`);
}

function parseCellSize(path: string, view: StandardAssetView, segment: string): AssetCellSize | null {
  if (segment === "native") {
    if (!NATIVE_VIEWS.has(view)) invalid(path, `${view} assets require an explicit cell size`);
    return null;
  }
  const match = CELL_SIZE.exec(segment);
  if (!match?.groups) invalid(path, "cell size must be <width>x<height> or native");
  if (view === "audio" || view === "font") invalid(path, `${view} assets must use native cell size`);
  return { width: Number(match.groups.width), height: Number(match.groups.height) };
}

function allowedExtension(view: StandardAssetView, extension: string): boolean {
  if (view === "audio") return AUDIO_EXTENSIONS.has(extension);
  if (view === "font") return FONT_EXTENSIONS.has(extension);
  return RASTER_EXTENSIONS.has(extension);
}

/**
 * Parses the standard library path `<view>/<cell-size>/<category...>/<name>.<ext>`.
 * The extension-free path is the stable semantic key used by APK code.
 */
export function parseStandardAssetPath(path: string): StandardAssetPath {
  if (!path || path.startsWith("/") || path.includes("\\")) invalid(path, "path must be relative and use forward slashes");
  const segments = path.split("/");
  if (segments.length < 4 || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    invalid(path, "path requires view, cell size, category, and filename");
  }
  const [viewSegment, cellSegment, ...tail] = segments;
  if (!STANDARD_ASSET_VIEWS.includes(viewSegment as StandardAssetView)) invalid(path, "unknown view");
  const view = viewSegment as StandardAssetView;
  const cellSize = parseCellSize(path, view, cellSegment!);
  const filename = tail.pop()!;
  const extensionOffset = filename.lastIndexOf(".");
  if (extensionOffset <= 0 || extensionOffset === filename.length - 1) invalid(path, "filename requires an extension");
  const name = filename.slice(0, extensionOffset);
  const extension = filename.slice(extensionOffset + 1);
  if (!NAME_SEGMENT.test(name) || !tail.every((segment) => NAME_SEGMENT.test(segment))) {
    invalid(path, "names must use lowercase kebab-case");
  }
  if (!allowedExtension(view, extension)) invalid(path, `.${extension} is not supported for ${view}`);
  return {
    path,
    key: [...segments.slice(0, -1), name].join("/"),
    view,
    cellSize,
    category: tail.join("/"),
    extension,
  };
}

/** Validates a filesystem-derived asset catalog and rejects semantic-key collisions. */
export function validateStandardAssetCatalog(paths: readonly string[]): readonly StandardAssetPath[] {
  const records = paths.map(parseStandardAssetPath);
  const keys = new Set<string>();
  for (const record of records) {
    if (keys.has(record.key)) throw new Error(`Duplicate APK standard asset key: ${record.key}`);
    keys.add(record.key);
  }
  return Object.freeze(records);
}

/** Resolves a known-safe standard path to a browser URL without reading the filesystem. */
export function resolveStandardAsset(root: string, path: string): ResolvedStandardAsset {
  const record = parseStandardAssetPath(path);
  const normalizedRoot = root.replace(/\/+$/u, "");
  if (!normalizedRoot) throw new Error("APK standard asset root must not be empty");
  return { url: `${normalizedRoot}/${record.path}`, key: record.key };
}
