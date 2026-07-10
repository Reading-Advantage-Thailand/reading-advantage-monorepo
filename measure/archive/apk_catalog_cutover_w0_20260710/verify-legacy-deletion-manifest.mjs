import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const trackDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(trackDirectory, "../../..");
const manifestPath = resolve(trackDirectory, "legacy-deletion-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const expectedPublicIds = ["dragon-flight", "dungeon-liberator", "magic-defense"];
const allowedDispositions = new Set(["retain", "delete", "defer"]);
const errors = [];

/** Records a failed manifest invariant.
 * @param condition Whether the invariant holds.
 * @param message Error text recorded when the invariant fails.
 * @returns Nothing.
 */
function assertManifest(condition, message) {
  if (!condition) errors.push(message);
}

assertManifest(manifest.trackId === "apk_catalog_cutover_w0_20260710", "trackId must match W0");
assertManifest(
  JSON.stringify(manifest.publicIds) === JSON.stringify(expectedPublicIds),
  "publicIds must contain the exact W0 identities in canonical order",
);
assertManifest(Array.isArray(manifest.games) && manifest.games.length === 3, "exactly three game records are required");

const seenPaths = new Set();
const allEntries = [
  ...manifest.games.flatMap((game) => {
    assertManifest(expectedPublicIds.includes(game.publicId), `unexpected public ID: ${game.publicId}`);
    assertManifest(Boolean(game.replacement?.cartridgeModule), `${game.publicId} needs a cartridge module`);
    assertManifest(game.replacement?.editionPacks?.length === 2, `${game.publicId} needs both edition packs`);
    assertManifest(game.replacement?.hostProofs?.length === 3, `${game.publicId} needs all three host proofs`);
    assertManifest(Boolean(game.replacement?.completionBoundary), `${game.publicId} needs a completion boundary`);
    return game.legacyPaths;
  }),
  ...manifest.crossGamePaths,
];

for (const entry of allEntries) {
  assertManifest(Boolean(entry.path), "every inventory entry needs a path");
  assertManifest(!seenPaths.has(entry.path), `duplicate inventory path: ${entry.path}`);
  seenPaths.add(entry.path);
  assertManifest(allowedDispositions.has(entry.disposition), `invalid disposition for ${entry.path}`);
  assertManifest(Boolean(entry.ownerWave), `${entry.path} needs an ownerWave`);
  assertManifest(Boolean(entry.reason), `${entry.path} needs a reason`);
  assertManifest(Array.isArray(entry.callers), `${entry.path} needs a callers array`);
  if (entry.disposition === "delete") {
    assertManifest(entry.callers.length === 0, `delete entry has recorded callers: ${entry.path}`);
    assertManifest(!existsSync(resolve(repositoryRoot, entry.path)), `deleted path is still present: ${entry.path}`);
  } else {
    assertManifest(existsSync(resolve(repositoryRoot, entry.path)), `inventory path is missing: ${entry.path}`);
  }
  if (entry.disposition === "defer") {
    assertManifest(entry.ownerWave !== manifest.trackId, `deferred entry needs a successor owner: ${entry.path}`);
    assertManifest(entry.callers.length > 0, `deferred entry needs caller evidence: ${entry.path}`);
  }
  for (const caller of entry.callers) {
    assertManifest(existsSync(resolve(repositoryRoot, caller)), `caller path is missing: ${caller}`);
  }
}

for (const game of manifest.games) {
  const replacementPaths = [
    game.replacement.cartridgeModule,
    game.replacement.completionBoundary,
    ...game.replacement.hostProofs,
  ];
  for (const replacementPath of replacementPaths) {
    assertManifest(
      existsSync(resolve(repositoryRoot, replacementPath)),
      `${game.publicId} replacement evidence is missing: ${replacementPath}`,
    );
  }
}

if (errors.length > 0) {
  console.error(`Legacy deletion manifest failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries(
    [...allowedDispositions].map((disposition) => [
      disposition,
      allEntries.filter((entry) => entry.disposition === disposition).length,
    ]),
  );
  console.log(
    `Legacy deletion manifest valid: ${allEntries.length} exact paths (${counts.retain} retain, ${counts.delete} delete, ${counts.defer} defer).`,
  );
}
