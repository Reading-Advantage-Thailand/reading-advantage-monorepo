#!/usr/bin/env node
/**
 * Print the app ids that a commit range affects.
 *
 * Usage: node scripts/ci/affected-apps.mjs --base <sha> --head <sha>
 *
 * Output: one JSON array of app ids on stdout, sorted, on one line. Exit 0.
 * Failure: nothing on stdout, one message on stderr, exit 2.
 *
 * The script reads the table `scripts/ci/apps.json`, the workspace manifests, and the
 * lockfile from the head commit (and the base commit for the compare), never from the
 * working tree. It uses Node built-ins and `git` only, and it runs `git` without a shell.
 * The lowest Node version it needs is 18.
 */
import { spawnSync } from "node:child_process";

/** The text of a failure that maps to exit 2. */
class RangeFailure extends Error {}

/** The base of a new branch, 40 zeros. */
const ZERO_BASE = "0".repeat(40);

/** The shape of a commit id that the script accepts. */
const COMMIT_ID = /^[0-9a-f]{40}$/;

/** The package.json fields that hold dependency edges. */
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/** The root files that are a global input whenever they change. */
const GLOBAL_FILES = new Set([".pnpmfile.cjs", ".dockerignore", "turbo.json"]);

/** The lockfile sections that the script reads entry by entry. */
const LOCK_ENTRY_SECTIONS = new Set(["importers", "packages", "snapshots", "catalogs", "overrides"]);

/**
 * Stop the run with a failure that exits 2.
 *
 * @param {string} message The text for stderr.
 * @returns {never} Never returns.
 * @throws {RangeFailure} Always.
 */
function fail(message) {
  throw new RangeFailure(message);
}

/**
 * Run `git` with an argument array and no shell.
 *
 * @param {string[]} args The git arguments.
 * @param {boolean} [soft] Return null in place of a failure when true.
 * @returns {string | null} The stdout of the call, or null on a soft failure.
 * @throws {RangeFailure} When git fails and the call is not soft.
 */
function git(args, soft = false) {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 1 << 30 });
  if (result.error) fail(`git did not start: ${result.error.message}`);
  if (result.status !== 0) {
    if (soft) return null;
    const detail = (result.stderr ?? "").trim().split("\n")[0];
    return fail(`git ${args[0]} failed: ${detail}`);
  }
  return result.stdout;
}

/**
 * Read the command line.
 *
 * @param {string[]} argv The arguments after the script path.
 * @returns {{ base: string, head: string }} The two commit ids.
 * @throws {RangeFailure} When an argument is missing, repeated, unknown, or not a 40-hex id.
 */
function parseArgs(argv) {
  const found = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (flag !== "--base" && flag !== "--head") fail(`unknown argument ${JSON.stringify(flag)}`);
    if (found.has(flag)) fail(`${flag} is repeated`);
    if (index + 1 >= argv.length) fail(`${flag} has no value`);
    found.set(flag, argv[index + 1]);
  }
  for (const flag of ["--base", "--head"]) {
    if (!found.has(flag)) fail(`${flag} is required`);
    if (!COMMIT_ID.test(found.get(flag))) fail(`${flag} must be a 40-character lowercase hex commit id`);
  }
  return { base: found.get("--base"), head: found.get("--head") };
}

/**
 * Check that the clone holds a commit.
 *
 * @param {string} sha The commit id.
 * @param {string} label The name for the message.
 * @returns {void}
 * @throws {RangeFailure} When the clone does not hold the commit.
 */
function requireCommit(sha, label) {
  if (git(["cat-file", "-e", `${sha}^{commit}`], true) === null) {
    fail(`${label} ${sha} is not a commit that this clone holds`);
  }
}

/**
 * Turn a zero base into the merge base with `origin/master`.
 *
 * @param {string} base The base id, possibly 40 zeros.
 * @param {string} head The head id.
 * @returns {string} The base id to compare against.
 * @throws {RangeFailure} When the merge base is missing or equals the head.
 */
function resolveBase(base, head) {
  if (base !== ZERO_BASE) return base;
  const out = git(["merge-base", head, "origin/master"], true);
  const merged = out === null ? "" : out.trim();
  if (!COMMIT_ID.test(merged)) fail("zero base: no merge base with origin/master");
  if (merged === head) fail("zero base: the merge base equals the head, so the range is empty");
  return merged;
}

/**
 * Open a commit for reading files.
 *
 * @param {string} commit The commit id.
 * @returns {{ commit: string, files: Set<string>, read: (path: string) => string | null }} The reader.
 */
function openCommit(commit) {
  const listing = git(["ls-tree", "-r", "--name-only", "-z", commit]) ?? "";
  const files = new Set(listing.split("\0").filter((name) => name !== ""));
  const cache = new Map();
  return {
    commit,
    files,
    read(path) {
      if (!files.has(path)) return null;
      if (!cache.has(path)) cache.set(path, git(["cat-file", "blob", `${commit}:${path}`]));
      return cache.get(path);
    },
  };
}

/**
 * Remove one level of quotes from a YAML scalar.
 *
 * @param {string} value The scalar text.
 * @returns {string} The text without quotes.
 */
function unquote(value) {
  const text = value.trim();
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replaceAll("''", "'");
  }
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  return text;
}

/**
 * Parse one `key: value` line of a YAML subset.
 *
 * @param {string} text The line without its indent.
 * @returns {{ key: string, value: string } | null} The key and the value, or null.
 */
function parseKeyLine(text) {
  const match = text
    .trimEnd()
    .match(/^(?:'((?:[^']|'')*)'|"((?:[^"\\]|\\.)*)"|([^\s'"#:][^:]*?))\s*:(?:\s+(.*))?$/);
  if (!match) return null;
  const key = match[1] !== undefined ? match[1].replaceAll("''", "'") : (match[2] ?? match[3]);
  return { key, value: (match[4] ?? "").trim() };
}

/**
 * Split lines into entries at one indent. Blank and comment lines are dropped.
 *
 * @param {string[]} lines The lines of a block.
 * @param {number} indent The indent of the entry lines.
 * @returns {{ key: string, value: string, lines: string[] }[]} The entries, in order.
 */
function parseEntries(lines, indent) {
  const entries = [];
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const spaces = line.length - line.trimStart().length;
    const parsed = spaces === indent ? parseKeyLine(line.slice(indent)) : null;
    if (parsed) {
      current = { key: parsed.key, value: parsed.value, lines: [line] };
      entries.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return entries;
}

/**
 * Compare two maps of text and list the keys that differ.
 *
 * @param {Map<string, string>} before The map of the base.
 * @param {Map<string, string>} after The map of the head.
 * @returns {string[]} The keys that are added, removed, or changed.
 */
function changedKeys(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((key) => before.get(key) !== after.get(key));
}

/**
 * Cut the peer suffix off a lockfile key.
 *
 * @param {string} key A `packages:` or `snapshots:` key.
 * @returns {string} The `name@version` part.
 */
function baseKey(key) {
  const cut = key.indexOf("(");
  return cut < 0 ? key : key.slice(0, cut);
}

/**
 * Get the package name of a lockfile key.
 *
 * @param {string} key A `packages:` or `snapshots:` key.
 * @returns {string} The package name.
 */
function keyName(key) {
  const base = baseKey(key);
  const at = base.lastIndexOf("@");
  return at > 0 ? base.slice(0, at) : base;
}

/**
 * Get the package name that an override key selects.
 *
 * @param {string} key An override key such as `next`, `a>b`, or `foo@<1`.
 * @returns {string} The package name.
 */
function overrideName(key) {
  const last = key.slice(key.lastIndexOf(">") + 1);
  const at = last.lastIndexOf("@");
  return at > 0 ? last.slice(0, at) : last;
}

/**
 * Read the `name: value` pairs of any depth in a YAML block.
 *
 * @param {string[]} lines The lines of the block, header included.
 * @returns {Map<string, string>} The names and values that carry a value.
 */
function flatPairs(lines) {
  const pairs = new Map();
  for (const line of lines) {
    const parsed = parseKeyLine(line.trim());
    if (parsed && parsed.value !== "") pairs.set(parsed.key, parsed.value);
  }
  return pairs;
}

/**
 * Parse the top-level blocks of `pnpm-workspace.yaml`.
 *
 * @param {string} text The file text.
 * @returns {Map<string, { value: string, lines: string[] }>} The blocks by key.
 */
function parseWorkspaceYaml(text) {
  const blocks = new Map();
  for (const entry of parseEntries(text.split(/\r?\n/), 0)) blocks.set(entry.key, entry);
  return blocks;
}

/**
 * List the workspace folders that a commit holds.
 *
 * @param {{ files: Set<string>, read: (path: string) => string | null }} side The commit reader.
 * @returns {Map<string, { name: string, deps: string[], manifest: object }>} The packages by folder.
 * @throws {RangeFailure} When the workspace file or a manifest cannot be read.
 */
function readWorkspace(side) {
  const text = side.read("pnpm-workspace.yaml");
  if (text === null) fail(`pnpm-workspace.yaml is missing at ${side.commit}`);
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^packages:\s*(#.*)?$/.test(line));
  if (start < 0) fail(`pnpm-workspace.yaml holds no packages list at ${side.commit}`);
  const globs = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!item) break;
    globs.push(unquote(item[1]));
  }
  const folders = new Set();
  for (const glob of globs) {
    if (glob.startsWith("!")) continue;
    if (!glob.includes("*")) {
      folders.add(glob.replace(/\/$/, ""));
    } else if (/^[^*]+\/\*$/.test(glob)) {
      const prefix = glob.slice(0, -1);
      for (const file of side.files) {
        const rest = file.startsWith(prefix) ? file.slice(prefix.length) : "";
        if (rest.endsWith("/package.json") && !rest.slice(0, -13).includes("/")) {
          folders.add(file.slice(0, -13));
        }
      }
    } else {
      fail(`the workspace glob ${JSON.stringify(glob)} is not supported`);
    }
  }
  const packages = new Map();
  for (const folder of folders) {
    const raw = side.read(`${folder}/package.json`);
    if (raw === null) continue;
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch {
      fail(`${folder}/package.json is not valid JSON at ${side.commit}`);
    }
    if (typeof manifest.name !== "string") continue;
    const deps = DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {}));
    packages.set(folder, { name: manifest.name, deps, manifest });
  }
  return packages;
}

/**
 * Read the app table from a commit.
 *
 * @param {{ read: (path: string) => string | null }} side The commit reader.
 * @returns {{ id: string, path: string }[]} The rows of the table.
 * @throws {RangeFailure} When the table is missing or has a bad row.
 */
function readTable(side) {
  const raw = side.read("scripts/ci/apps.json");
  if (raw === null) fail("scripts/ci/apps.json is missing at the head commit");
  let rows;
  try {
    rows = JSON.parse(raw);
  } catch {
    return fail("scripts/ci/apps.json is not valid JSON");
  }
  if (!Array.isArray(rows) || rows.length === 0) fail("scripts/ci/apps.json holds no rows");
  for (const row of rows) {
    if (typeof row?.id !== "string" || typeof row?.path !== "string") {
      fail("scripts/ci/apps.json holds a row without id and path");
    }
  }
  return rows;
}

/**
 * Parse a pnpm lockfile (format 9) into entries.
 *
 * @param {string} text The lockfile text.
 * @returns {{ top: Map<string, string>, importers: Map<string, object>, packages: Map<string, string>, snapshots: Map<string, object>, catalogs: Map<string, string>, overrides: Map<string, string> }} The parsed lockfile.
 */
function parseLock(text) {
  const lock = {
    top: new Map(),
    importers: new Map(),
    packages: new Map(),
    snapshots: new Map(),
    catalogs: new Map(),
    overrides: new Map(),
  };
  for (const section of parseEntries(text.split(/\r?\n/), 0)) {
    const body = section.lines.slice(1);
    if (!LOCK_ENTRY_SECTIONS.has(section.key)) {
      lock.top.set(section.key, section.lines.join("\n"));
    } else if (section.key === "catalogs") {
      for (const catalog of parseEntries(body, 2)) {
        for (const entry of parseEntries(catalog.lines.slice(1), 4)) {
          lock.catalogs.set(`${catalog.key}/${entry.key}`, entry.lines.join("\n"));
        }
      }
    } else if (section.key === "overrides") {
      for (const entry of parseEntries(body, 2)) lock.overrides.set(entry.key, entry.lines.join("\n"));
    } else {
      for (const entry of parseEntries(body, 2)) {
        if (section.key === "packages") lock.packages.set(entry.key, entry.lines.join("\n"));
        else lock[section.key].set(entry.key, entry);
      }
    }
  }
  return lock;
}

/**
 * Get the text of an entry map for a compare.
 *
 * @param {Map<string, string | { lines: string[] }>} map The entries.
 * @returns {Map<string, string>} The entries as text.
 */
function asText(map) {
  return new Map([...map].map(([key, value]) => [key, typeof value === "string" ? value : value.lines.join("\n")]));
}

/**
 * List the direct resolved versions of an importer.
 *
 * @param {{ lines: string[] }} importer The importer entry.
 * @returns {[string, string][]} The pairs of dependency name and resolved version.
 */
function importerDeps(importer) {
  const pairs = [];
  for (const section of parseEntries(importer.lines.slice(1), 4)) {
    if (!DEPENDENCY_FIELDS.includes(section.key)) continue;
    for (const dep of parseEntries(section.lines.slice(1), 6)) {
      for (const line of dep.lines.slice(1)) {
        const field = parseKeyLine(line.trim());
        if (field?.key === "version") pairs.push([dep.key, unquote(field.value)]);
      }
    }
  }
  return pairs;
}

/**
 * Build a function that lists the base keys and names an importer resolves.
 *
 * @param {{ importers: Map<string, object>, snapshots: Map<string, { lines: string[] }> }} lock The parsed lockfile.
 * @returns {(path: string) => { keys: Set<string>, bases: Set<string>, names: Set<string> }} The resolver.
 */
function resolverFor(lock) {
  const children = new Map();
  const byBase = new Map();
  for (const key of lock.snapshots.keys()) {
    const base = baseKey(key);
    byBase.set(base, [...(byBase.get(base) ?? []), key]);
  }
  /**
   * Find the snapshot keys of a dependency. A version without a peer suffix matches
   * every snapshot with the same `name@version`.
   *
   * @param {string} name The dependency name.
   * @param {string} version The resolved version text.
   * @returns {string[]} The snapshot keys, empty for a link.
   */
  const keysOf = (name, version) => {
    if (version.startsWith("link:") || version.startsWith("file:")) return [];
    if (lock.snapshots.has(`${name}@${version}`)) return [`${name}@${version}`];
    if (lock.snapshots.has(version)) return [version];
    return byBase.get(baseKey(`${name}@${version}`)) ?? byBase.get(baseKey(version)) ?? [];
  };
  /**
   * List the snapshot keys that a snapshot lists.
   *
   * @param {string} key The snapshot key.
   * @returns {string[]} The child keys.
   */
  const childrenOf = (key) => {
    if (!children.has(key)) {
      const list = [];
      for (const section of parseEntries(lock.snapshots.get(key).lines.slice(1), 4)) {
        if (section.key !== "dependencies" && section.key !== "optionalDependencies") continue;
        for (const dep of parseEntries(section.lines.slice(1), 6)) {
          list.push(...keysOf(dep.key, unquote(dep.value)));
        }
      }
      children.set(key, list);
    }
    return children.get(key);
  };
  return (path) => {
    const keys = new Set();
    const importer = lock.importers.get(path);
    const queue = [];
    for (const [name, version] of importer ? importerDeps(importer) : []) {
      queue.push(...keysOf(name, version));
    }
    while (queue.length > 0) {
      const key = queue.pop();
      if (keys.has(key)) continue;
      keys.add(key);
      queue.push(...childrenOf(key));
    }
    return {
      keys,
      bases: new Set([...keys].map(baseKey)),
      names: new Set([...keys].map(keyName)),
    };
  };
}

/**
 * Compare the root `package.json` of two commits.
 *
 * @param {string | null} before The base text.
 * @param {string | null} after The head text.
 * @returns {{ global: boolean, catalog: Set<string>, overrides: Set<string> }} The effect.
 * @throws {RangeFailure} When a text is not valid JSON.
 */
function compareRootPackage(before, after) {
  if (before === null || after === null) return { global: before !== after, catalog: new Set(), overrides: new Set() };
  /**
   * Split a manifest into the entry maps and the rest.
   *
   * @param {string} text The manifest text.
   * @returns {{ rest: string, catalog: Map<string, string>, overrides: Map<string, string> }} The parts.
   */
  const split = (text) => {
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return fail("the root package.json is not valid JSON");
    }
    const pnpm = { ...(json.pnpm ?? {}) };
    const overrides = { ...(json.overrides ?? {}), ...(pnpm.overrides ?? {}) };
    const catalog = { ...(json.catalog ?? {}), ...(pnpm.catalog ?? {}) };
    delete json.overrides;
    delete json.catalog;
    delete pnpm.overrides;
    delete pnpm.catalog;
    if (json.pnpm) json.pnpm = pnpm;
    const text2 = (object) => new Map(Object.entries(object).map(([key, value]) => [key, JSON.stringify(value)]));
    return { rest: JSON.stringify(json), catalog: text2(catalog), overrides: text2(overrides) };
  };
  const a = split(before);
  const b = split(after);
  return {
    global: a.rest !== b.rest,
    catalog: new Set(changedKeys(a.catalog, b.catalog)),
    overrides: new Set(changedKeys(a.overrides, b.overrides).map(overrideName)),
  };
}

/**
 * Compare `pnpm-workspace.yaml` of two commits.
 *
 * @param {string | null} before The base text.
 * @param {string | null} after The head text.
 * @returns {{ global: boolean, catalog: Set<string>, overrides: Set<string> }} The effect.
 */
function compareWorkspaceYaml(before, after) {
  if (before === null || after === null) return { global: before !== after, catalog: new Set(), overrides: new Set() };
  const a = parseWorkspaceYaml(before);
  const b = parseWorkspaceYaml(after);
  const effect = { global: false, catalog: new Set(), overrides: new Set() };
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const left = a.get(key);
    const right = b.get(key);
    if (left && right && left.lines.join("\n") === right.lines.join("\n")) continue;
    if (key === "catalog" || key === "catalogs") {
      for (const name of changedKeys(flatPairs(left?.lines ?? []), flatPairs(right?.lines ?? []))) effect.catalog.add(name);
    } else if (key === "overrides") {
      for (const name of changedKeys(flatPairs(left?.lines ?? []), flatPairs(right?.lines ?? []))) {
        effect.overrides.add(overrideName(name));
      }
    } else {
      effect.global = true;
    }
  }
  return effect;
}

/**
 * Compare the lockfile of two commits.
 *
 * @param {string | null} before The base text.
 * @param {string | null} after The head text.
 * @returns {{ global: boolean, importers: Set<string>, snapshotKeys: Set<string>, packageKeys: Set<string>, catalog: Set<string>, overrides: Set<string>, locks: object[] }} The effect.
 */
function compareLock(before, after) {
  const effect = {
    global: false,
    importers: new Set(),
    snapshotKeys: new Set(),
    packageKeys: new Set(),
    catalog: new Set(),
    overrides: new Set(),
    locks: [],
  };
  if (before === null || after === null) {
    effect.global = before !== after;
    return effect;
  }
  const a = parseLock(before);
  const b = parseLock(after);
  effect.locks = [a, b];
  if (changedKeys(a.top, b.top).length > 0) effect.global = true;
  for (const path of changedKeys(asText(a.importers), asText(b.importers))) effect.importers.add(path);
  for (const key of changedKeys(a.packages, b.packages)) effect.packageKeys.add(key);
  for (const key of changedKeys(asText(a.snapshots), asText(b.snapshots))) effect.snapshotKeys.add(key);
  for (const key of changedKeys(a.catalogs, b.catalogs)) effect.catalog.add(key.slice(key.indexOf("/") + 1));
  for (const key of changedKeys(a.overrides, b.overrides)) effect.overrides.add(overrideName(key));
  return effect;
}

/**
 * Read the changed paths of a range.
 *
 * @param {string} base The base id.
 * @param {string} head The head id.
 * @returns {string[]} The changed paths, with a moved file counted at both paths.
 */
function changedPaths(base, head) {
  const out = git(["diff", "--name-only", "--no-renames", "-z", base, head, "--"]) ?? "";
  return out.split("\0").filter((name) => name !== "");
}

/**
 * Compute the app ids that a range affects.
 *
 * @param {string} base The base id.
 * @param {string} head The head id.
 * @returns {string[]} The sorted ids of the affected table rows.
 */
function affectedApps(base, head) {
  const before = openCommit(base);
  const after = openCommit(head);
  const rows = readTable(after);
  const allRows = () => rows.map((row) => row.id).sort();
  const paths = changedPaths(base, head);

  const workspaces = [readWorkspace(before), readWorkspace(after)];
  const folders = new Map();
  for (const workspace of workspaces) {
    for (const [folder, pkg] of workspace) folders.set(folder, folders.get(folder) ?? pkg);
  }
  const names = new Set([...folders.values()].map((pkg) => pkg.name));
  const dependents = new Map();
  for (const workspace of workspaces) {
    for (const pkg of workspace.values()) {
      for (const dep of pkg.deps) {
        if (!names.has(dep)) continue;
        if (!dependents.has(dep)) dependents.set(dep, new Set());
        dependents.get(dep).add(pkg.name);
      }
    }
  }

  const changed = new Set();
  const rowPaths = new Set();
  const rootChanged = new Set();
  for (const path of paths) {
    if (GLOBAL_FILES.has(path)) return allRows();
    if (["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"].includes(path)) rootChanged.add(path);
    const parts = path.split("/");
    for (let depth = parts.length - 1; depth > 0; depth -= 1) {
      const folder = parts.slice(0, depth).join("/");
      if (folders.has(folder)) {
        changed.add(folders.get(folder).name);
        break;
      }
    }
    for (const row of rows) if (path.startsWith(`${row.path}/`)) rowPaths.add(row.id);
  }

  const affectedRows = new Set(rowPaths);
  const markFolder = (folder) => {
    if (folders.has(folder)) changed.add(folders.get(folder).name);
  };

  const catalogNames = new Set();
  const overrideNames = new Set();
  if (rootChanged.has("package.json")) {
    const effect = compareRootPackage(before.read("package.json"), after.read("package.json"));
    if (effect.global) return allRows();
    effect.catalog.forEach((name) => catalogNames.add(name));
    effect.overrides.forEach((name) => overrideNames.add(name));
  }
  if (rootChanged.has("pnpm-workspace.yaml")) {
    const effect = compareWorkspaceYaml(before.read("pnpm-workspace.yaml"), after.read("pnpm-workspace.yaml"));
    if (effect.global) return allRows();
    effect.catalog.forEach((name) => catalogNames.add(name));
    effect.overrides.forEach((name) => overrideNames.add(name));
  }
  let lockEffect = null;
  if (rootChanged.has("pnpm-lock.yaml")) {
    lockEffect = compareLock(before.read("pnpm-lock.yaml"), after.read("pnpm-lock.yaml"));
    if (lockEffect.global) return allRows();
    lockEffect.catalog.forEach((name) => catalogNames.add(name));
    lockEffect.overrides.forEach((name) => overrideNames.add(name));
    lockEffect.importers.forEach(markFolder);
  }

  if (catalogNames.size > 0) {
    for (const workspace of workspaces) {
      for (const row of rows) {
        const manifest = workspace.get(row.path)?.manifest ?? {};
        const listed = DEPENDENCY_FIELDS.some((field) =>
          Object.entries(manifest[field] ?? {}).some(([name, spec]) => catalogNames.has(name) && String(spec).startsWith("catalog:")),
        );
        if (listed) affectedRows.add(row.id);
      }
    }
  }

  if (lockEffect && (lockEffect.snapshotKeys.size + lockEffect.packageKeys.size + overrideNames.size > 0)) {
    for (const lock of lockEffect.locks) {
      const resolve = resolverFor(lock);
      for (const path of lock.importers.keys()) {
        const resolved = resolve(path);
        const hitKey =
          [...lockEffect.snapshotKeys].some((key) => resolved.keys.has(key)) ||
          [...lockEffect.packageKeys].some((key) => resolved.bases.has(key));
        const hitName = [...overrideNames].some((name) => resolved.names.has(name));
        if (hitKey || hitName) markFolder(path);
      }
    }
  }

  const queue = [...changed];
  while (queue.length > 0) {
    for (const name of dependents.get(queue.pop()) ?? []) {
      if (!changed.has(name)) {
        changed.add(name);
        queue.push(name);
      }
    }
  }
  for (const row of rows) {
    if (folders.has(row.path) && changed.has(folders.get(row.path).name)) affectedRows.add(row.id);
  }
  return [...affectedRows].sort();
}

/**
 * Run the command line.
 *
 * @returns {void}
 */
function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    requireCommit(args.head, "head");
    if (args.base !== ZERO_BASE) requireCommit(args.base, "base");
    const base = resolveBase(args.base, args.head);
    process.stdout.write(`${JSON.stringify(affectedApps(base, args.head))}\n`);
    process.exitCode = 0;
  } catch (error) {
    const message = String(error?.message ?? error).replace(/\s+/g, " ").trim();
    process.stderr.write(`affected-apps: ${message}\n`);
    process.exitCode = 2;
  }
}

main();
