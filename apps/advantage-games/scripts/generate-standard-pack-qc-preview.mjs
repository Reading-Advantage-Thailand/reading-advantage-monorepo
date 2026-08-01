import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execPath, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = join(appRoot, "..", "..");
const packageRoot = join(repositoryRoot, "packages", "advantage-play-kit");
const sourceRoot = join(packageRoot, "assets", "standard");
const releasePath = join(sourceRoot, "standard-pack-release.json");
const materializationRoot = join(appRoot, ".generated", "standard-pack-qc");
const publicPreviewRoot = join(appRoot, "public", "assets", "apk", "standard-pack-qc");
const previewModulePath = join(appRoot, "src", "lib", "apk", "standard-pack-qc-preview.json");

/** The finite, receipt-backed semantic keys deliberately included in the QC surface. */
const PREVIEW_KEYS = [
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747",
  "side-view/32x32/characters/enemy-001-idle",
  "top-down/32x32/characters/hero-01",
  "ui/16x16/controls/gamepad-buttons",
  "ui/20x20/inventory/slot",
  "ui/32x32/items/armor-icons",
];

const release = JSON.parse(await readFile(releasePath, "utf8"));
const assetByKey = new Map(release.assets.map((asset) => [asset.key, asset]));
const selected = PREVIEW_KEYS.map((key) => {
  const asset = assetByKey.get(key);
  if (!asset) throw new Error(`QC preview key is absent from the pinned release: ${key}`);
  return asset;
});

await mkdir(dirname(previewModulePath), { recursive: true });
await rm(materializationRoot, { force: true, recursive: true });
await rm(publicPreviewRoot, { force: true, recursive: true });
await mkdir(publicPreviewRoot, { recursive: true });
execFileSync(execPath, [
  join(packageRoot, "scripts", "materialize-standard-pack.mjs"),
  "--release", releasePath,
  "--source-root", sourceRoot,
  "--output-root", materializationRoot,
  "--version", release.version,
  "--catalog-digest", release.digest,
  "--source-receipt-digest", release.sourceReceiptDigest,
  ...PREVIEW_KEYS.flatMap((key) => ["--key", key]),
], { stdio: "inherit" });

const publicFileFor = (asset) => `asset-${asset.physical.sha256.slice(0, 16)}.${asset.extension}`;
await Promise.all(selected.map((asset) => copyFile(
  join(materializationRoot, asset.path),
  join(publicPreviewRoot, publicFileFor(asset)),
)));

const preview = {
  schemaVersion: 1,
  version: release.version,
  catalogDigest: release.digest,
  sourceReceiptDigest: release.sourceReceiptDigest,
  requiredCredit: release.requiredCredit,
  assets: selected.map((asset) => ({
    key: asset.key,
    view: asset.view,
    category: asset.category,
    extension: asset.extension,
    cellSize: asset.cellSize,
    mediaType: asset.physical.kind,
    previewUrl: `/assets/apk/standard-pack-qc/${publicFileFor(asset)}`,
  })),
};
await writeFile(previewModulePath, `${JSON.stringify(preview, null, 2)}\n`);
stdout.write(`Generated ${preview.assets.length} pinned standard-pack QC previews.\n`);
