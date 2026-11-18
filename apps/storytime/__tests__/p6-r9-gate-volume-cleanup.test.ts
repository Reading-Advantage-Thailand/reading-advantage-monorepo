// @vitest-environment node
/**
 * Task 6.2, round 9 (track storytime_app_rebuild_20261025): the Postgres volume cleanup of the
 * gate scripts.
 *
 * Finding (orchestrator, 2026-11-13): each gate script starts a throwaway Postgres with
 * `podman run -d --name ... postgres`. The image declares a VOLUME, so each run makes one
 * anonymous volume. The cleanup is `podman rm -f <name>` with no `-v`, so each run leaves the
 * volume behind. The disk of the machine is a hard limit.
 *
 * Pinned rule (one accepted form): the `podman rm` of the database container holds `-v` or
 * `--volumes`, alone or inside a flag group such as `-fv`. Two other forms are not accepted:
 *   - `podman run --rm` with no `-d`: the gate scripts run the container detached and `exec`
 *     into it, so this form cannot fit them.
 *   - a tmpfs mount on the data path: it changes the storage kind of the gate, and the PM did
 *     not ask for that.
 * The rule also covers every other direct `podman rm` in those scripts (the app containers of
 * phase4-docker-smoke.sh), because the PM list names lines 39 to 41 of that script together.
 * The `"${SMOKE_PODMAN[@]}" rm` calls are out of scope: they remove app containers of the smoke
 * store, not a database container.
 *
 * Every row reads files. No row calls podman. The scan skips full-line comments.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The nine scripts that start a throwaway database today (relative to the repo root). */
const KNOWN_DB_SCRIPTS = [
  "apps/storytime/__tests__/look-phase1-browser-gate.sh",
  "apps/storytime/__tests__/look-phase2-browser-gate.sh",
  "apps/storytime/__tests__/look-song-phone-browser-gate.sh",
  "apps/storytime/__tests__/phase2b-browser-gate.sh",
  "apps/storytime/__tests__/phase3-browser-gate.sh",
  "apps/storytime/__tests__/phase3-docker-smoke.sh",
  "apps/storytime/__tests__/phase4-browser-gate.sh",
  "apps/storytime/__tests__/phase4-docker-smoke.sh",
  "apps/storytime/__tests__/phase5-browser-gate.sh",
];

/** Floor of the scan: shell scripts tracked under the two folders (15 at the base). */
const SCRIPT_FLOOR = 15;

/** The labeled counts that the Red evidence quotes (A4). */
const counts = { scripts_scanned: 0, db_scripts_found: 0, rm_lines_without_volumes: 0 };

afterAll(() => {
  for (const [name, value] of Object.entries(counts)) console.log(`${name}=${value}`);
});

type Statement = { line: number; text: string };

/**
 * Joins the live lines of a shell text into statements. A full-line comment is skipped. A line
 * that ends with a backslash joins the next line.
 * @param text The shell text.
 * @returns The statements with the number of their first line.
 */
function statements(text: string): Statement[] {
  const out: Statement[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*#/.test(lines[i])) continue;
    let joined = lines[i];
    const start = i + 1;
    while (/\\\s*$/.test(joined) && i + 1 < lines.length) {
      i += 1;
      joined = `${joined.replace(/\\\s*$/, " ")}${lines[i]}`;
    }
    out.push({ line: start, text: joined });
  }
  return out;
}

/**
 * Tells if a `podman rm` statement removes the anonymous volumes of the container.
 * @param text One live statement that holds `podman rm`.
 * @returns True when the options hold `-v`, `--volumes`, or a flag group with `v`.
 */
function removesVolumes(text: string): boolean {
  const options = /\bpodman\s+rm\b([^"$|;&>]*)/.exec(text)?.[1] ?? "";
  return options
    .split(/\s+/)
    .some((token) => token === "--volumes" || /^-[a-zA-Z]*v[a-zA-Z]*$/.test(token));
}

/**
 * Reads the container variable names of the `podman run` statements that start a database.
 * @param list The live statements of the script.
 * @returns The variable name (or literal name) of each database container.
 */
function dbContainerNames(list: Statement[]): string[] {
  const names: string[] = [];
  for (const { text } of list) {
    if (!/\bpodman\s+run\b/.test(text) || !/postgres/.test(text)) continue;
    const name = /--name\s+"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?/.exec(text)?.[1];
    names.push(name ?? "<literal-name>");
  }
  return names;
}

type ScanResult = {
  dbNames: string[];
  /** Database containers with no `podman rm` that removes the volumes. */
  dbOffenders: string[];
  /** Direct `podman rm` statements with no volumes flag, in a script that starts a database. */
  rmOffenders: string[];
};

/**
 * Scans one shell text for the volume cleanup rule.
 * @param text The shell text.
 * @param label The name of the text, for the messages.
 * @returns The database names and the two offender lists.
 */
function scanText(text: string, label: string): ScanResult {
  const list = statements(text);
  const dbNames = dbContainerNames(list);
  if (dbNames.length === 0) return { dbNames, dbOffenders: [], rmOffenders: [] };
  const rms = list.filter(({ text: t }) => /\bpodman\s+rm\b/.test(t));
  const dbOffenders = dbNames
    .filter((name) => {
      const own = rms.filter(({ text: t }) => new RegExp(`\\$\\{?${name}\\}?`).test(t));
      return !own.some(({ text: t }) => removesVolumes(t));
    })
    .map((name) => `${label}: database container $${name} has no podman rm with -v or --volumes`);
  const rmOffenders = rms
    .filter(({ text: t }) => !removesVolumes(t))
    .map(({ line, text: t }) => `${label}:${line}: ${t.trim()}`);
  return { dbNames, dbOffenders, rmOffenders };
}

/**
 * Lists the tracked shell scripts under the two scan folders.
 * @returns Paths relative to the repo root.
 */
function trackedScripts(): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "apps/storytime/__tests__", "apps/storytime/scripts"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return out.split("\n").filter((p) => p.endsWith(".sh"));
}

/** The scan of every tracked script, read once. */
const scanned = trackedScripts().map((path) => ({
  path,
  result: scanText(readFileSync(join(repoRoot, path), "utf8"), path),
}));
counts.scripts_scanned = scanned.length;
counts.db_scripts_found = scanned.filter((s) => s.result.dbNames.length > 0).length;
counts.rm_lines_without_volumes = scanned.flatMap((s) => s.result.rmOffenders).length;

describe("row 1: the gate scripts remove the volumes of their database container", () => {
  it("1a: the scan finds the scripts (a scan that finds none must fail)", () => {
    expect(scanned.length).toBeGreaterThanOrEqual(SCRIPT_FLOOR);
    const found = scanned.filter((s) => s.result.dbNames.length > 0).map((s) => s.path);
    expect(found.sort()).toEqual([...KNOWN_DB_SCRIPTS].sort());
  });

  it("1b: each database container has a podman rm with -v or --volumes", () => {
    const offenders = scanned.flatMap((s) => s.result.dbOffenders);
    expect(offenders).toEqual([]);
  });

  it("1c: every direct podman rm of those scripts holds -v or --volumes", () => {
    const offenders = scanned.flatMap((s) => s.result.rmOffenders);
    expect(offenders).toEqual([]);
  });
});

describe("row 2: the cleanup still runs on every exit path (characterization)", () => {
  it("2a: each database script traps EXIT INT TERM to a handler that removes the container", () => {
    const bad: string[] = [];
    for (const { path } of scanned.filter((s) => s.result.dbNames.length > 0)) {
      const text = readFileSync(join(repoRoot, path), "utf8");
      const list = statements(text);
      const trap = list
        .map(({ text: t }) => /^\s*trap\s+(\w+)\s+EXIT\s+INT\s+TERM\s*$/.exec(t)?.[1])
        .find((name) => name !== undefined);
      if (!trap) {
        bad.push(`${path}: no live trap <handler> EXIT INT TERM line`);
        continue;
      }
      const lines = text.split("\n");
      const open = lines.findIndex((l) => l.startsWith(`${trap}() {`));
      const close = open < 0 ? -1 : lines.findIndex((l, i) => i > open && l === "}");
      if (open < 0 || close < 0) {
        bad.push(`${path}: handler ${trap} is not defined at the top level`);
        continue;
      }
      const body = statements(lines.slice(open, close + 1).join("\n"));
      for (const name of dbContainerNames(list)) {
        const removes = body.some(
          ({ text: t }) => /\bpodman\s+rm\b/.test(t) && new RegExp(`\\$\\{?${name}\\}?`).test(t),
        );
        if (!removes) bad.push(`${path}: handler ${trap} does not remove $${name}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("row 3: positive controls (the scan finds a poisoned copy and accepts a good one)", () => {
  const source = "apps/storytime/__tests__/phase3-browser-gate.sh";
  const real = readFileSync(join(repoRoot, source), "utf8");
  /** The copy with the volumes flag stripped from every direct `podman rm`. */
  const stripped = real
    .split("\n")
    .map((l) => (/^\s*#/.test(l) ? l : l.replace(/\bpodman\s+rm\s+(?:-\S+\s+)*/, "podman rm -f ")))
    .join("\n");
  /** The copy with `-v` on every direct `podman rm`. */
  const fixed = stripped
    .split("\n")
    .map((l) => (/^\s*#/.test(l) ? l : l.replace(/\bpodman\s+rm\s+-f\s+/, "podman rm -f -v ")))
    .join("\n");

  it("3a: a scratch copy of phase3-browser-gate.sh without -v fails the scan", () => {
    const dir = mkdtempSync(join(tmpdir(), "st-r9-"));
    try {
      const file = join(dir, "scratch-gate.sh");
      writeFileSync(file, stripped);
      const result = scanText(readFileSync(file, "utf8"), "scratch-gate.sh");
      expect(result.dbNames.length).toBe(1);
      expect(result.dbOffenders.length).toBe(1);
      expect(result.rmOffenders.length).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("3b: the same copy with -v on the podman rm passes the scan", () => {
    const result = scanText(fixed, "scratch-gate.sh");
    expect(result.dbNames.length).toBe(1);
    expect(result.dbOffenders).toEqual([]);
    expect(result.rmOffenders).toEqual([]);
  });

  it("3c: the accepted spellings pass and a near miss fails", () => {
    const body = (rm: string) =>
      `podman run -d --name "$DB" -p 1:5432 docker.io/library/postgres:16-alpine\n${rm}\n`;
    for (const rm of [
      'podman rm -f -v "$DB"',
      'podman rm -fv "$DB"',
      'podman rm -vf "$DB"',
      'podman rm --force --volumes "$DB"',
      'podman rm -v "$DB"',
    ]) {
      const result = scanText(body(rm), "x");
      expect([rm, result.dbOffenders, result.rmOffenders]).toEqual([rm, [], []]);
    }
    for (const rm of ['podman rm -f "$DB"', 'podman rm --force "$DB"', 'podman rm -f -v "$OTHER"']) {
      const result = scanText(body(rm), "x");
      expect([rm, result.dbOffenders.length > 0]).toEqual([rm, true]);
    }
  });
});

describe("row 4: the scan ignores comment lines", () => {
  it("4a: a comment that holds `podman rm -fv` does not satisfy the rule", () => {
    const text = [
      'podman run -d --name "$DB" -p 1:5432 docker.io/library/postgres:16-alpine',
      '# podman rm -fv "$DB"',
      '  # podman rm --volumes "$DB"',
      'podman rm -f "$DB"',
    ].join("\n");
    const result = scanText(text, "x");
    expect(result.dbOffenders.length).toBe(1);
    expect(result.rmOffenders.length).toBe(1);
  });

  it("4b: a comment that holds `podman run ... postgres` is not a database start", () => {
    const text = [
      '# podman run -d --name "$DB" docker.io/library/postgres:16-alpine',
      'podman rm -f "$DB"',
    ].join("\n");
    const result = scanText(text, "x");
    expect(result.dbNames).toEqual([]);
    expect(result.dbOffenders).toEqual([]);
  });

  it("4c: a run split over lines with a backslash is one statement", () => {
    const text = [
      'podman run -d --name "$DB" -p 1:5432 \\',
      "  -e POSTGRES_PASSWORD=x \\",
      "  docker.io/library/postgres:16-alpine",
      'podman rm -fv "$DB"',
    ].join("\n");
    const result = scanText(text, "x");
    expect(result.dbNames).toEqual(["DB"]);
    expect(result.dbOffenders).toEqual([]);
  });
});
