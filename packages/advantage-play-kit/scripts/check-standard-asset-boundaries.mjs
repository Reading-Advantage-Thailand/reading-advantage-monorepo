import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * The only new-production source areas this guard owns. Legacy editions deliberately
 * remain outside this check until their migration has an explicit track and baseline.
 */
export const DEFAULT_PRODUCTION_SOURCE_ROOTS = Object.freeze([
  Object.freeze({
    label: "APK React host",
    root: "src/react",
    allowFiles: Object.freeze(["standard-asset-gallery.tsx"]),
  }),
  Object.freeze({
    label: "new game cartridges",
    root: "../game-cartridges/src",
    allowFiles: Object.freeze([]),
  }),
]);

const FORBIDDEN_REFERENCE_RULES = Object.freeze([
  Object.freeze({
    code: "STANDARD_PHYSICAL_PATH",
    message: "direct canonical standard-pack physical paths are not cartridge or host APIs",
    pattern: /(?:^|[/\\])(?:packages[/\\]advantage-play-kit[/\\])?assets[/\\]standard(?:[/\\]|$)/iu,
  }),
  Object.freeze({
    code: "MATERIALIZED_PATH",
    message: "materialized output paths may only be consumed by the deployment boundary",
    pattern: /(?:^|[/\\])(?:\.materialized|materialized(?:-standard)?-pack|materialized[/\\]standard-pack)(?:[/\\]|$)/iu,
  }),
  Object.freeze({
    code: "PRIVATE_PACK_ROOT",
    message: "new cartridges and hosts must select semantic keys, not private asset-pack roots",
    pattern: /(?:^|[/\\])(?:assets|art|asset-packs?|packs)(?:[/\\]|$)/iu,
  }),
]);

/** The sole public package entrypoint permitted for semantic standard-asset selection. */
const SEMANTIC_ASSET_API_IMPORTS = new Set(["@reading-advantage/advantage-play-kit/assets"]);

/** Returns whether a file is production source rather than a test or declaration. */
function isProductionSourceFile(path) {
  const extension = path.slice(path.lastIndexOf("."));
  return SOURCE_EXTENSIONS.has(extension)
    && !path.endsWith(".d.ts")
    && !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path);
}

/** Recursively returns production source files in stable lexical order. */
async function listProductionSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await listProductionSourceFiles(path));
    else if (entry.isFile() && isProductionSourceFile(path)) files.push(path);
  }
  return files;
}

/** Extracts source string literals without treating comments as a production API escape hatch. */
function findStringLiterals(source) {
  const literals = [];
  const expression = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/gu;
  for (const match of source.matchAll(expression)) {
    const prefix = source.slice(0, match.index);
    literals.push({
      value: match[2],
      line: prefix.split("\n").length,
    });
  }
  return literals;
}

/**
 * Checks the finite new-production source boundary for physical standard-pack coupling.
 * @param options Package root and optional explicit source-root configuration.
 * @returns Stable violations suitable for build output and focused tests.
 */
export async function checkStandardAssetBoundaries({
  packageRoot = PACKAGE_ROOT,
  sourceRoots = DEFAULT_PRODUCTION_SOURCE_ROOTS,
} = {}) {
  const issues = [];
  for (const sourceRoot of sourceRoots) {
    const root = resolve(packageRoot, sourceRoot.root);
    let rootStat;
    try {
      rootStat = await stat(root);
    } catch {
      issues.push({ file: sourceRoot.root, line: 0, code: "MISSING_SOURCE_ROOT", message: `${sourceRoot.label} root is missing` });
      continue;
    }
    if (!rootStat.isDirectory()) {
      issues.push({ file: sourceRoot.root, line: 0, code: "INVALID_SOURCE_ROOT", message: `${sourceRoot.label} root is not a directory` });
      continue;
    }
    const allowFiles = new Set(sourceRoot.allowFiles ?? []);
    for (const file of await listProductionSourceFiles(root)) {
      const withinRoot = relative(root, file).split(sep).join("/");
      if (allowFiles.has(withinRoot)) continue;
      const displayPath = relative(packageRoot, file).split(sep).join("/");
      const source = await readFile(file, "utf8");
      for (const literal of findStringLiterals(source)) {
        if (SEMANTIC_ASSET_API_IMPORTS.has(literal.value)) continue;
        for (const rule of FORBIDDEN_REFERENCE_RULES) {
          if (rule.pattern.test(literal.value)) {
            issues.push({ file: displayPath, line: literal.line, code: rule.code, message: rule.message, value: literal.value });
            break;
          }
        }
      }
    }
  }
  return issues.sort((left, right) => `${left.file}:${left.line}:${left.code}`.localeCompare(`${right.file}:${right.line}:${right.code}`));
}

/** Parses explicit test/CI roots without allowing an unbounded production scope. */
function parseArgs(values) {
  const roots = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== "--root" || !values[index + 1]) {
      throw new Error("Usage: check-standard-asset-boundaries.mjs [--root <directory>]...");
    }
    roots.push({ label: "explicit production source", root: values[index + 1], allowFiles: [] });
    index += 1;
  }
  return roots.length ? roots : DEFAULT_PRODUCTION_SOURCE_ROOTS;
}

/** Runs the checker as a deterministic package build gate. */
async function main() {
  const issues = await checkStandardAssetBoundaries({ sourceRoots: parseArgs(process.argv.slice(2)) });
  if (issues.length) {
    for (const issue of issues) {
      console.error(`${issue.file}:${issue.line} ${issue.code}: ${issue.message}${issue.value ? ` (${JSON.stringify(issue.value)})` : ""}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Standard asset boundary check passed.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
