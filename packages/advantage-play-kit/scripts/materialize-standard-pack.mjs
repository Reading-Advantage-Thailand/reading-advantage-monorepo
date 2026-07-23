import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** Stops execution with one actionable materialization error. */
function fail(message) {
  throw new Error(`Standard-pack materialization failed: ${message}`);
}

/** Produces a lowercase SHA-256 digest for exact encoded bytes. */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/** Parses repeatable command-line values without accepting unknown flags. */
function parseArgs(values) {
  const result = { keys: [] };
  for (let index = 0; index < values.length; index += 1) {
    const flag = values[index];
    const value = values[index + 1];
    if (!flag?.startsWith("--") || value === undefined) fail("each flag requires a value");
    if (flag === "--key") result.keys.push(value);
    else if (["--release", "--source-root", "--output-root", "--version", "--catalog-digest", "--source-receipt-digest"].includes(flag)) result[flag.slice(2).replaceAll("-", "_")] = value;
    else fail(`unknown flag ${JSON.stringify(flag)}`);
    index += 1;
  }
  for (const name of ["release", "source_root", "output_root", "version", "catalog_digest", "source_receipt_digest"]) {
    if (typeof result[name] !== "string" || !result[name]) fail(`--${name.replaceAll("_", "-")} is required`);
  }
  if (!result.keys.length) fail("at least one --key is required");
  return result;
}

/** Rejects an unsafe source-relative catalog path before reading or copying it. */
function safeRelativePath(value) {
  if (!value || isAbsolute(value) || value.split(/[\\/]/u).includes("..") || value.includes("\\")) fail(`unsafe catalog path ${JSON.stringify(value)}`);
  return value;
}

/** Asserts one resolved child path remains inside its canonical root. */
function assertInside(root, child, label) {
  const path = relative(root, child);
  if (path === "" || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) fail(`${label} escapes its root`);
}

/** Lists every existing regular file below an output root using normalized relative paths. */
async function outputFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await outputFiles(root, child));
    else if (entry.isFile()) files.push(relative(root, child));
    else fail(`output contains a non-regular entry: ${JSON.stringify(relative(root, child))}`);
  }
  return files;
}

const options = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(options.release, "utf8"));
if (catalog.version !== options.version || catalog.digest !== options.catalog_digest || catalog.sourceReceiptDigest !== options.source_receipt_digest) {
  fail("release binding is stale");
}
const keys = [...new Set(options.keys)].sort((left, right) => left.localeCompare(right));
const assets = new Map(catalog.assets.map((asset) => [asset.key, asset]));
const selected = keys.map((key) => {
  if (key.includes(".") || key.endsWith("/")) fail("physical paths are not valid --key values");
  const asset = assets.get(key);
  if (!asset) fail(`unknown semantic key ${JSON.stringify(key)}`);
  return asset;
});
const sourceRoot = await realpath(options.source_root);
const outputRoot = resolve(options.output_root);
await mkdir(outputRoot, { recursive: true });
const outputRealRoot = await realpath(outputRoot);
const allowedOutputFiles = new Set([
  "materialization-manifest.json",
  ...selected.map((asset) => safeRelativePath(asset.path)),
]);
for (const path of await outputFiles(outputRealRoot)) {
  if (!allowedOutputFiles.has(path)) {
    fail(`output contains a file outside the selected semantic union: ${JSON.stringify(path)}`);
  }
}
const files = [];
for (const asset of selected) {
  const path = safeRelativePath(asset.path);
  const source = resolve(sourceRoot, path);
  assertInside(sourceRoot, source, "source path");
  const sourceReal = await realpath(source);
  assertInside(sourceRoot, sourceReal, "source symlink");
  const stat = await lstat(sourceReal);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`source is not a regular file: ${JSON.stringify(path)}`);
  const bytes = await readFile(sourceReal);
  if (bytes.length !== asset.physical.byteSize || sha256(bytes) !== asset.physical.sha256) fail(`source bytes do not match catalog: ${JSON.stringify(path)}`);
  const destination = resolve(outputRealRoot, path);
  assertInside(outputRealRoot, destination, "destination path");
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(sourceReal, destination);
  files.push({ key: asset.key, path, sha256: asset.physical.sha256, byteSize: asset.physical.byteSize });
}
const manifest = {
  schemaVersion: 1,
  version: catalog.version,
  catalogDigest: catalog.digest,
  sourceReceiptDigest: catalog.sourceReceiptDigest,
  requiredCredit: catalog.requiredCredit,
  files,
};
await writeFile(join(outputRealRoot, "materialization-manifest.json"), `${JSON.stringify(manifest)}\n`);
console.log(JSON.stringify({ outputRoot: outputRealRoot, fileCount: files.length, manifest }));
