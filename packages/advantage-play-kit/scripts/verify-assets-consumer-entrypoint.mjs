import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_EXPORT = "@reading-advantage/advantage-play-kit/assets";

const REQUIRED_RUNTIME_EXPORTS = Object.freeze([
  "ASSET_CONTRACT_V2_FAILURE_CODES",
  "ASSET_CONTRACT_V2_VERSION",
  "createDescriptorAwareSemanticAssetResolver",
  "createDescriptorDrivenPresentationAdapter",
  "validateAssetContractV2Descriptor",
]);

/**
 * Verifies that the built assets subpath maps to the package generated consumer entrypoint.
 * @returns A promise that resolves after the package export contract is checked.
 * @throws When the built subpath is absent or lacks a required v2 public export.
 */
export async function verifyAssetsConsumerEntrypoint() {
  const packageJson = JSON.parse(await readFile(resolve(PACKAGE_ROOT, "package.json"), "utf8"));
  const assetsExport = packageJson.exports?.["./assets"];
  if (assetsExport?.import !== "./dist/assets/index.js" || assetsExport?.types !== "./dist/assets/index.d.ts") {
    throw new Error("The ./assets package export must map to the generated dist assets entrypoint.");
  }

  await access(resolve(PACKAGE_ROOT, assetsExport.import));
  await access(resolve(PACKAGE_ROOT, assetsExport.types));

  const consumerAssets = await import(ASSETS_EXPORT);
  const missingExports = REQUIRED_RUNTIME_EXPORTS.filter((name) => !(name in consumerAssets));
  if (missingExports.length > 0) {
    throw new Error(`The built ${ASSETS_EXPORT} entrypoint is missing: ${missingExports.join(", ")}.`);
  }
}

/** Runs the built-package consumer entrypoint verification. */
async function main() {
  await verifyAssetsConsumerEntrypoint();
  console.log("Built assets consumer entrypoint check passed.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
