#!/usr/bin/env node
/**
 * Fail CI when the shadcn lint warning count or the local copy count goes up.
 *
 * Usage: node scripts/ci/shadcn-ratchet.mjs
 *
 * The gate measures two counts on the `components/ui` folders of the apps that use
 * shadcn:
 *
 * 1. The number of messages from the `@shadcn/lint` rules, each rule at warn level.
 * 2. The number of local component copies. A copy is an app file whose kebab name
 *    matches a component file in `packages/ui/src/components`.
 *
 * It compares both counts with `scripts/ci/shadcn-ratchet-baseline.json`.
 *
 * Exit 0: both counts are equal to or lower than the baseline. A lower count prints a
 * note that asks for a lower baseline.
 * Exit 1: at least one count is higher than the baseline.
 * Exit 2: the gate cannot measure, for example a missing module or a bad baseline.
 *
 * The script reads the tree and writes no file. It uses Node built-ins, ESLint as a
 * library, `@shadcn/lint`, and `@typescript-eslint/parser`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The root of the repository, two folders above this script. */
const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** The app folders that hold a shadcn component copy. */
const SCOPES = [
  "apps/primary-advantage/components/ui",
  "apps/reading-advantage/components/ui",
  "apps/science-advantage/components/ui",
];

/** The folder that owns the shared components. */
const UI_COMPONENTS = "packages/ui/src/components";

/** The baseline file, relative to the repository root. */
const BASELINE_PATH = "scripts/ci/shadcn-ratchet-baseline.json";

/** The `@shadcn/lint` rules that the gate runs at warn level. */
const RULES = [
  "no-restyle",
  "no-arbitrary-values",
  "no-inline-styles",
  "require-static-classes",
];

/**
 * The shadcn settings that the gate gives to the rules.
 *
 * `no-raw-colors` and `no-unknown-classes` are not in RULES: both need a Tailwind
 * theme build. The build worker times out in this repository (see the spec), and the
 * bundled fallback grammar is not stable enough for a ratchet.
 */
const SETTINGS = {
  shadcn: {
    ui: "@/components/ui",
    componentImports: ["^@reading-advantage/ui(/|$)"],
  },
};

/** The source pattern that the gate gives to ESLint inside a scope folder. */
const SOURCE_PATTERN = "**/*.{ts,tsx}";

/** A failure that means the gate cannot measure. It maps to exit 2. */
export class RatchetError extends Error {
  /**
   * Build the error with the gate prefix.
   *
   * @param {string} message The reason.
   */
  constructor(message) {
    super(message);
    this.name = "RatchetError";
  }
}

/**
 * Turn a kebab file name into the component name.
 *
 * @param {string} name The file base name, such as `alert-dialog`.
 * @returns {string} The component name, such as `AlertDialog`.
 */
export function pascalCase(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Read and check the baseline file text.
 *
 * @param {string} text The file text.
 * @returns {{ lintWarnings: number, copies: number, copyFiles?: string[] }} The baseline.
 * @throws {RatchetError} When the text is not JSON or a count is not a whole number of zero or more.
 */
export function parseBaseline(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new RatchetError(`${BASELINE_PATH} is not valid JSON`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new RatchetError(`${BASELINE_PATH} must hold one JSON object`);
  }
  for (const key of ["lintWarnings", "copies"]) {
    const value = data[key];
    if (!Number.isInteger(value) || value < 0) {
      throw new RatchetError(`${BASELINE_PATH} needs an integer ${key} of zero or more`);
    }
  }
  if (data.copyFiles !== undefined) {
    if (!Array.isArray(data.copyFiles) || data.copyFiles.some((item) => typeof item !== "string")) {
      throw new RatchetError(`${BASELINE_PATH} needs copyFiles as a list of paths`);
    }
  }
  return {
    lintWarnings: data.lintWarnings,
    copies: data.copies,
    ...(data.copyFiles === undefined ? {} : { copyFiles: data.copyFiles }),
  };
}

/**
 * Count the app files that repeat a component of `packages/ui`.
 *
 * @param {{ root?: string, scopes?: string[], uiComponents?: string }} [options] The tree to read.
 * @returns {{ copies: number, files: string[] }} The count and the sorted repository paths.
 * @throws {RatchetError} When the shared component folder does not exist.
 */
export function countLocalCopies(options = {}) {
  const root = options.root ?? ROOT;
  const scopes = options.scopes ?? SCOPES;
  const uiComponents = options.uiComponents ?? UI_COMPONENTS;

  const uiDir = join(root, uiComponents);
  if (!isDirectory(uiDir)) {
    throw new RatchetError(`the shared component folder is missing: ${uiComponents}`);
  }
  const owned = new Set(
    readdirSync(uiDir)
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => name.slice(0, -4)),
  );

  const files = [];
  for (const scope of scopes) {
    const scopeDir = join(root, scope);
    if (!isDirectory(scopeDir)) continue;
    for (const name of readdirSync(scopeDir).sort()) {
      if (!name.endsWith(".tsx")) continue;
      if (owned.has(pascalCase(name.slice(0, -4)))) files.push(posix.join(scope, name));
    }
  }
  files.sort();
  return { copies: files.length, files };
}

/**
 * Count the messages that the shadcn rules report on the app `components/ui` folders.
 *
 * @param {{ root?: string, scopes?: string[] }} [options] The tree to read.
 * @returns {Promise<{ lintWarnings: number, files: number }>} The message count and the number of files with a message.
 * @throws {RatchetError} When a scope folder is missing, a module does not load, or ESLint fails.
 */
export async function countLintWarnings(options = {}) {
  const root = options.root ?? ROOT;
  const scopes = options.scopes ?? SCOPES;

  for (const scope of scopes) {
    if (!isDirectory(join(root, scope))) {
      throw new RatchetError(`a scope folder is missing: ${scope}`);
    }
  }

  // The no-restyle rule reads the Tailwind theme for its message hints. The theme build
  // times out for reading-advantage (see the spec), and the count does not change with or
  // without the theme. A short budget keeps CI fast and the count the same.
  process.env.SHADCN_LINT_TAILWIND_TIMEOUT ??= "5000";

  const [eslintModule, shadcnModule, parserModule] = await Promise.all([
    loadModule("eslint", root),
    loadModule("@shadcn/lint", root),
    loadModule("@typescript-eslint/parser", root),
  ]);

  const { ESLint } = eslintModule;
  const shadcn = shadcnModule.plugin ?? shadcnModule.default?.plugin;
  const parser = parserModule.default ?? parserModule;
  if (typeof ESLint !== "function") throw new RatchetError("the eslint module holds no ESLint class");
  if (!shadcn) throw new RatchetError("the @shadcn/lint module holds no plugin export");

  const rules = Object.fromEntries(RULES.map((rule) => [`shadcn/${rule}`, "warn"]));
  let results;
  try {
    const eslint = new ESLint({
      cwd: root,
      errorOnUnmatchedPattern: false,
      warnIgnored: false,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.{ts,tsx}"],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: "latest",
              sourceType: "module",
              ecmaFeatures: { jsx: true },
            },
          },
          plugins: { shadcn },
          settings: SETTINGS,
          rules,
        },
      ],
    });
    results = await eslint.lintFiles(scopes.map((scope) => `${scope}/${SOURCE_PATTERN}`));
  } catch (error) {
    throw new RatchetError(`the eslint run failed: ${oneLine(error?.message ?? error)}`);
  }

  const messages = results.flatMap((result) => result.messages);
  const files = results.filter((result) => result.messages.length > 0).length;
  return { lintWarnings: messages.length, files };
}

/**
 * Compare the current counts with the baseline.
 *
 * @param {{ baseline: { lintWarnings: number, copies: number, copyFiles?: string[] }, current: { lintWarnings: number, copies: number, copyFiles?: string[] } }} input The two sides.
 * @returns {{ exitCode: number, lines: string[] }} The exit code and the report lines.
 */
export function compareCounts({ baseline, current }) {
  const lines = [];
  let exitCode = 0;
  const pairs = [
    ["lint warnings", "lintWarnings"],
    ["local copies", "copies"],
  ];
  for (const [label, key] of pairs) {
    const before = baseline[key];
    const after = current[key];
    if (after > before) {
      exitCode = 1;
      lines.push(
        `shadcn-ratchet: ${label} went up: baseline ${before}, current ${after}, delta +${after - before}. ` +
          "Remove the new finding or the new copy, or raise the baseline in the same change with a reason.",
      );
    } else if (after < before) {
      lines.push(
        `shadcn-ratchet: ${label} went down: baseline ${before}, current ${after}. ` +
          `Lower the baseline in ${BASELINE_PATH}.`,
      );
    } else {
      lines.push(`shadcn-ratchet: ${label} ${after} equals the baseline ${before}.`);
    }
  }

  if (Array.isArray(baseline.copyFiles) && Array.isArray(current.copyFiles)) {
    const added = current.copyFiles.filter((file) => !baseline.copyFiles.includes(file));
    const removed = baseline.copyFiles.filter((file) => !current.copyFiles.includes(file));
    if (added.length > 0 || removed.length > 0) {
      lines.push("shadcn-ratchet: the copy file list changed at the same count:");
      for (const file of removed) lines.push(`  - ${file}`);
      for (const file of added) lines.push(`  + ${file}`);
      if (exitCode === 0) {
        lines.push(`shadcn-ratchet: update copyFiles in ${BASELINE_PATH} to match the tree.`);
      }
    }
  }

  return { exitCode, lines };
}

/**
 * Check that a path is an existing folder.
 *
 * @param {string} path The absolute path.
 * @returns {boolean} True when the path is a folder.
 */
function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Import a module by name, with any failure turned into a RatchetError.
 *
 * @param {string} name The module name.
 * @param {string} root The repository root.
 * @returns {Promise<Record<string, unknown>>} The module namespace.
 * @throws {RatchetError} When the module does not load.
 */
async function loadModule(name, root) {
  try {
    return await import(name);
  } catch (error) {
    throw new RatchetError(
      `the module ${name} did not load from ${relative(process.cwd(), root) || "."}: ` +
        `${oneLine(error?.message ?? error)}. Run pnpm install.`,
    );
  }
}

/**
 * Flatten an error message to one line.
 *
 * @param {unknown} value The error or its message.
 * @returns {string} The message on one line.
 */
function oneLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

/**
 * Run the gate.
 *
 * @returns {Promise<void>} Nothing.
 */
async function main() {
  try {
    let text;
    try {
      text = readFileSync(join(ROOT, BASELINE_PATH), "utf8");
    } catch {
      throw new RatchetError(`the baseline file is missing: ${BASELINE_PATH}`);
    }
    const baseline = parseBaseline(text);
    const copies = countLocalCopies();
    const lint = await countLintWarnings();
    const current = {
      lintWarnings: lint.lintWarnings,
      copies: copies.copies,
      copyFiles: copies.files,
    };

    console.log(
      `shadcn-ratchet: measured ${current.lintWarnings} lint messages in ${lint.files} files ` +
        `and ${current.copies} local copies.`,
    );
    const report = compareCounts({ baseline, current });
    for (const line of report.lines) console.log(line);
    process.exitCode = report.exitCode;
  } catch (error) {
    console.error(`shadcn-ratchet: ${oneLine(error?.message ?? error)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
