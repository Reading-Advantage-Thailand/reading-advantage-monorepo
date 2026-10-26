import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";
import { GUARD_ENTRIES, type GuardEntry } from "./security-upgrade-guard-list";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Compares two dotted versions as numeric segments. `-1`, `0`, or `1`.
 * A non-numeric segment falls back to string order for that segment only.
 */
function compareVersions(a: string, b: string): number {
  const as = a.split(".");
  const bs = b.split(".");
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const av = as[i] ?? "0";
    const bv = bs[i] ?? "0";
    const an = Number.parseInt(av, 10);
    const bn = Number.parseInt(bv, 10);
    if (Number.isNaN(an) || Number.isNaN(bn)) {
      const r = av.localeCompare(bv);
      if (r !== 0) return r < 0 ? -1 : 1;
      continue;
    }
    if (an !== bn) return an < bn ? -1 : 1;
  }
  return 0;
}

/**
 * Returns the `packages:` section lines of a pnpm lockfile. Empty string if absent.
 */
function extractPackagesSection(src: string): string {
  const lines = src.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimEnd() === "packages:") {
      start = i + 1;
    } else if (start !== -1 && line.trim() !== "" && !/^\s/.test(line) && line.endsWith(":")) {
      end = i;
      break;
    }
  }
  if (start === -1) return "";
  return lines.slice(start, end).join("\n");
}

/**
 * Parses locked versions from a `packages:` section. Reads package keys only
 * (A1: a comment containing a version is not a locked version). A scoped name is
 * split on its last `@`. A `(peer@ver)` snapshot suffix is stripped.
 */
function parseLockedVersions(section: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const raw of section.split(/\r?\n/)) {
    if (!raw.startsWith("  ") || raw.startsWith("   ")) continue;
    let key = raw.slice(2).trimEnd();
    if (key.startsWith("'")) key = key.slice(1);
    if (key.endsWith(":")) key = key.slice(0, -1);
    if (key.endsWith("'")) key = key.slice(0, -1);
    const paren = key.indexOf("(");
    if (paren !== -1) key = key.slice(0, paren);
    const at = key.lastIndexOf("@");
    if (at <= 0) continue;
    const version = key.slice(at + 1);
    if (!/^[0-9]/.test(version)) continue;
    const name = key.slice(0, at);
    let list = map.get(name);
    if (!list) {
      list = [];
      map.set(name, list);
    }
    list.push(version);
  }
  return map;
}

/**
 * Evaluates the guard entries against the parsed lockfile versions. Returns one
 * failure string per violated floor, each labeled `advisory=`, `package=`,
 * `locked=`, `fixed=` (or `missing_line=` for an absent line).
 */
function evaluateGuard(locked: Map<string, string[]>, entries: GuardEntry[]): string[] {
  const failures: string[] = [];
  if (entries.length === 0) {
    failures.push("guard_list=empty");
    return failures;
  }
  for (const entry of entries) {
    const list = (locked.get(entry.packageName) ?? []).filter((v) => v.startsWith(entry.linePrefix));
    if (list.length === 0) {
      if (entry.requirePresent) {
        const advisory = entry.advisoryIds.length ? entry.advisoryIds.join(" ") : "<none>";
        failures.push(`advisory=${advisory} missing_line=${entry.packageName} ${entry.linePrefix}`);
      }
      continue;
    }
    for (const v of list) {
      if (compareVersions(v, entry.fixedVersion) < 0) {
        failures.push(`advisory=${entry.advisoryIds.join(" ")} package=${entry.packageName} locked=${v} fixed=${entry.fixedVersion}`);
      }
    }
  }
  return failures;
}

/**
 * Parses a flat `key: value` block (for example `overrides:` or `catalog:`) from
 * `pnpm-workspace.yaml`. Surrounding YAML quotes on keys are stripped.
 */
function parseFlatBlock(src: string, blockName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = src.split(/\r?\n/);
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, "");
    if (line === "") continue;
    if (line === `${blockName}:`) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (!line.startsWith(" ") && !line.startsWith("\t")) break;
      const m = line.match(/^  (".*?"|'.*?'|[^:]+):\s*(.*)$/);
      if (m) {
        let key = m[1];
        if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
          key = key.slice(1, -1);
        }
        out[key] = m[2];
      }
    }
  }
  return out;
}

/**
 * Recursively discovers every `package.json` under `root`, skipping vendored trees.
 */
function findPackageJsonFiles(root: string): string[] {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".git", ".turbo", ".next", "dist", "coverage"]);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop() as string;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (skip.has(name) || name.startsWith(".")) continue;
      const p = join(dir, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(p);
      } else if (name === "package.json") {
        out.push(p);
      }
    }
  }
  return out;
}

describe("refutation fixtures", () => {
  const nextEntry: GuardEntry = {
    advisoryIds: ["GHSA-673q-mjm6-r5xr", "GHSA-2464-fhr4-w9xw", "GHSA-p3m5-59mp-jv5r"],
    packageName: "next",
    linePrefix: "",
    fixedVersion: "16.4.1",
    requirePresent: true,
  };

  it("key next@16.2.9 fails the next floor with the required labels", () => {
    const locked = parseLockedVersions("  next@16.2.9:\n    resolution: {integrity: x}\n");
    const msg = evaluateGuard(locked, [nextEntry]).join("\n");
    expect(msg).toContain("advisory=");
    expect(msg).toContain("package=next");
    expect(msg).toContain("locked=16.2.9");
    expect(msg).toContain("fixed=16.4.1");
  });

  it("a comment containing 16.2.9 does not fail a next@16.4.1 key (A1)", () => {
    const locked = parseLockedVersions("  next@16.4.1:\n    resolution: {integrity: x}\n  # old locked 16.2.9\n");
    expect(evaluateGuard(locked, [nextEntry])).toEqual([]);
  });

  it("sharp@0.35.6 passes the 0.35.5 floor", () => {
    const entry: GuardEntry = { advisoryIds: ["GHSA-wq5f-xc86-pv6w"], packageName: "sharp", linePrefix: "", fixedVersion: "0.35.5", requirePresent: true };
    const locked = parseLockedVersions("  sharp@0.35.6:\n    resolution: {integrity: x}\n");
    expect(evaluateGuard(locked, [entry])).toEqual([]);
  });

  it("only zod@3.25.76 with prefix 4. fails missing_line (no 3.x treated as the fix)", () => {
    const entry: GuardEntry = { advisoryIds: ["GHSA-mrhx-c7xc-m3w5"], packageName: "zod", linePrefix: "4.", fixedVersion: "4.6.6", requirePresent: true };
    const locked = parseLockedVersions("  zod@3.25.76:\n    resolution: {integrity: x}\n");
    const msg = evaluateGuard(locked, [entry]).join("\n");
    expect(msg).toContain("missing_line=zod 4.");
    expect(msg).not.toContain("3.25.76");
  });

  it("brace-expansion@5.0.11 does not hide the older 1. floor", () => {
    const entry: GuardEntry = { advisoryIds: ["GHSA-mh99-v99m-4gvg"], packageName: "brace-expansion", linePrefix: "1.", fixedVersion: "1.1.20", requirePresent: true };
    const locked = parseLockedVersions("  brace-expansion@1.1.15:\n    resolution: {integrity: x}\n  brace-expansion@5.0.11:\n    resolution: {integrity: x}\n");
    const msg = evaluateGuard(locked, [entry]).join("\n");
    expect(msg).toContain("locked=1.1.15");
  });

  it("an empty packages: section fails (A4)", () => {
    const locked = parseLockedVersions("");
    expect(evaluateGuard(locked, [nextEntry]).length).toBeGreaterThan(0);
  });

  it("an empty guard list fails (A4)", () => {
    const locked = parseLockedVersions("  next@16.4.1:\n    resolution: {integrity: x}\n");
    expect(evaluateGuard(locked, []).length).toBeGreaterThan(0);
  });

  it("a scoped name @sentry/nextjs@10.59.0 is not skipped (A7)", () => {
    const entry: GuardEntry = { advisoryIds: ["GHSA-mchm-gjx6-7h55"], packageName: "@sentry/nextjs", linePrefix: "", fixedVersion: "10.75.2", requirePresent: true };
    const locked = parseLockedVersions("  '@sentry/nextjs@10.59.0':\n    resolution: {integrity: x}\n");
    const msg = evaluateGuard(locked, [entry]).join("\n");
    expect(msg).toContain("package=@sentry/nextjs");
    expect(msg).toContain("locked=10.59.0");
  });
});

describe("guard list", () => {
  it("is not empty (A4)", () => {
    expect(GUARD_ENTRIES.length).toBeGreaterThan(0);
  });

  it("requires presence on every row", () => {
    for (const e of GUARD_ENTRIES) expect(e.requirePresent).toBe(true);
  });

  it("does not require the out-of-scope major packages", () => {
    const banned = ["nodemailer", "next-mdx-remote", "vinext", "@opentelemetry/propagator-jaeger", "@faker-js/faker", "basic-ftp"];
    for (const b of banned) {
      expect(GUARD_ENTRIES.filter((e) => e.packageName === b).map((e) => e.packageName)).toEqual([]);
    }
  });

  it("zod appears only with prefix 4.", () => {
    for (const e of GUARD_ENTRIES.filter((e) => e.packageName === "zod")) {
      expect(e.linePrefix).toBe("4.");
    }
  });

  it("js-yaml appears only with floors 3.15.2 and 4.3.2", () => {
    const floors = GUARD_ENTRIES.filter((e) => e.packageName === "js-yaml").map((e) => e.fixedVersion).sort();
    expect(floors).toEqual(["3.15.2", "4.3.2"]);
  });
});

describe("live version guard", () => {
  it("fails while any locked version sits below the fixed version of a critical or high advisory", () => {
    const lockfile = readFileSync(resolve(ROOT, "pnpm-lock.yaml"), "utf8");
    const section = extractPackagesSection(lockfile);
    const locked = parseLockedVersions(section);
    if (locked.size === 0) {
      throw new Error("version-guard: packages: section parsed to zero packages (A4)");
    }
    const failures = evaluateGuard(locked, GUARD_ENTRIES);
    if (failures.length > 0) {
      throw new Error(`version-guard failures (${failures.length}):\n${failures.join("\n")}`);
    }
  });
});

describe("workspace contract", () => {
  const ws = readFileSync(resolve(ROOT, "pnpm-workspace.yaml"), "utf8");

  const OVERRIDES_EXPECTED = {
    "drizzle-orm": "0.45.2",
    next: "16.4.1",
    react: "19.2.9",
    "react-dom": "19.2.9",
    vitest: "4.1.8",
    vite: "8.1.6",
    typescript: "5.9.3",
    "@types/react": "19.2.2",
    "@types/react-dom": "19.2.2",
    "@vitejs/plugin-react": "6.0.3",
  };

  const CATALOG_EXPECTED = {
    "@ai-sdk/google": "^2.0.36",
    "@ai-sdk/google-vertex": "^3.0.142",
    "@ai-sdk/openai": "^2.0.68",
    "@ai-sdk/react": "^2.0.0",
    "@electric-sql/pglite": "^0.5.3",
    "@eslint/eslintrc": "^3.3.5",
    "@eslint/js": "^9.39.4",
    "@google-cloud/storage": "^7.19.0",
    "@hookform/resolvers": "^5.2.2",
    "@node-rs/argon2": "^2.0.2",
    "@playwright/test": "^1.60.0",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.6.1",
    "@react-three/postprocessing": "^3.0.4",
    "@react-three/test-renderer": "^9.1.0",
    "@tailwindcss/postcss": "^4.1.18",
    "@tanstack/react-query": "^5.90.10",
    "@tanstack/react-table": "^8.21.3",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@trpc/client": "^11.1.0",
    "@trpc/react-query": "^11.1.0",
    "@trpc/server": "^11.1.0",
    "@types/node": "^20.19.25",
    "@types/pg": "^8.15.6",
    "@types/three": "^0.185.0",
    "@vitest/coverage-v8": "^4.1.8",
    ai: "^5.0.201",
    axios: "^1.7.7",
    "base64-js": "^1.5.1",
    bcryptjs: "^3.0.2",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    "date-fns": "^4.1.0",
    dotenv: "^17.2.3",
    eslint: "^9.38.0",
    "eslint-config-next": "^16.0.0",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^5.2.0",
    "framer-motion": "^12.23.26",
    globals: "^16.5.0",
    googleapis: "^148.0.0",
    jest: "^30.2.0",
    "jest-environment-jsdom": "^30.2.0",
    jsdom: "^29.1.1",
    konva: "^10.0.12",
    "lucide-react": "^0.562.0",
    nanoid: "^5.1.11",
    "next-intl": "^4.0.2",
    "next-themes": "^0.4.6",
    nuqs: "^2.8.1",
    openai: "^6.1.0",
    pg: "^8.16.3",
    phaser: "4.2.1",
    postcss: "^8.5.15",
    postgres: "^3.4.9",
    prettier: "^3.8.1",
    "prettier-plugin-tailwindcss": "^0.6.12",
    "react-day-picker": "^9.14.0",
    "react-hook-form": "^7.65.0",
    "react-konva": "^19.2.1",
    "react-textarea-autosize": "^8.5.9",
    recharts: "^3.5.1",
    "remark-gfm": "^4.0.1",
    resend: "^4.6.0",
    "sentence-tokenizer": "^1.0.1",
    sharp: "^0.35.5",
    sonner: "^2.0.7",
    superjson: "^2.2.2",
    "tailwind-merge": "^3.2.0",
    tailwindcss: "^4.1.18",
    "tailwindcss-animate": "^1.0.7",
    three: "^0.185.1",
    "text-readability": "^1.1.1",
    "ts-fsrs": "^5.2.0",
    "ts-node": "^10.9.2",
    tsup: "^8.4.0",
    tsx: "^4.22.0",
    "tw-animate-css": "^1.4.0",
    "typescript-eslint": "^8.31.1",
    vaul: "^1.1.2",
    zod: "^3.25.76",
    zustand: "^5.0.9",
  };

  it("the overrides keys move next/react/react-dom/vite and no other override value changes", () => {
    const overrides = parseFlatBlock(ws, "overrides");
    expect(overrides).toEqual(OVERRIDES_EXPECTED);
  });

  it("the catalog sharp range is ^0.35.5 and no other catalog range changes", () => {
    const catalog = parseFlatBlock(ws, "catalog");
    expect(catalog).toEqual(CATALOG_EXPECTED);
  });

  it("keeps nodeLinker: hoisted", () => {
    expect(/^nodeLinker:\s*hoisted\s*$/m.test(ws)).toBe(true);
  });

  it("minimumReleaseAgeExclude still lists vinext@0.2.0 and phaser@4.2.1, nothing else", () => {
    const lines = ws.split(/\r?\n/);
    const idx = lines.findIndex((l) => l.trimEnd() === "minimumReleaseAgeExclude:");
    expect(idx).not.toBe(-1);
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s+(.+)$/);
      if (m) items.push(m[1].trim());
      else if (lines[i].trim() !== "" && !/^\s/.test(lines[i])) break;
    }
    expect(items).toEqual(["vinext@0.2.0", "phaser@4.2.1"]);
  });

  it("every direct next/react/react-dom entry in a workspace manifest equals the override", () => {
    const overrides = parseFlatBlock(ws, "overrides");
    const failures: string[] = [];
    let found = 0;
    for (const f of findPackageJsonFiles(ROOT)) {
      let pkg: Record<string, unknown>;
      try {
        pkg = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
      } catch {
        continue;
      }
      for (const dep of ["dependencies", "devDependencies"]) {
        const sec = (pkg[dep] ?? {}) as Record<string, string>;
        for (const pkgName of ["next", "react", "react-dom"]) {
          const val = sec[pkgName];
          if (val === undefined) continue;
          found++;
          const expected = overrides[pkgName];
          if (val !== expected) {
            failures.push(`package=${pkgName} file=${relative(ROOT, f)} declared=${val} override=${expected}`);
          }
        }
      }
    }
    expect(found).toBeGreaterThan(0);
    if (failures.length > 0) throw new Error(`manifest/override mismatches:\n${failures.join("\n")}`);
  });
});