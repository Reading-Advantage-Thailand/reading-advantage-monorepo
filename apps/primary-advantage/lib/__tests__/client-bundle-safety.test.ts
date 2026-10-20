import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The browser bundle must not reach server-only packages. tsc and vitest do not catch this,
 * only `next build` does (590435b65 and the 2026-10-13 build failure). This test follows the
 * value imports of every "use client" module through the app-local modules and checks each
 * package import on the way.
 */
const APP = resolve(__dirname, "../..");
const SCAN = ["app", "components", "hooks", "lib", "actions", "configs", "i18n", "types", "utils"];
const EXTS = [".ts", ".tsx", ".js", ".mjs"];

/** Package subpaths that hold only client-safe code. */
const ALLOWED: Record<string, readonly string[]> = {
  "@reading-advantage/auth": ["@reading-advantage/auth/roles", "@reading-advantage/auth/password-schema"],
  "@reading-advantage/domain": [
    "@reading-advantage/domain/assignments/due-date",
    "@reading-advantage/domain/calendar-day",
    "@reading-advantage/domain/primary-books/step-map",
    "@reading-advantage/domain/teacher-class-csv",
    "@reading-advantage/domain/stories/contracts",
    "@reading-advantage/domain/primary-quest/rules",
  ],
  "@reading-advantage/db": [],
  postgres: [],
  "@node-rs/argon2": [],
};

/** Lists every source file under the scanned folders. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".") || name === "__tests__") continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (EXTS.some((ext) => name.endsWith(ext)) && !/\.(test|spec)\.|\.d\.ts$/.test(name)) out.push(path);
    }
  };
  for (const folder of SCAN) if (existsSync(join(APP, folder))) walk(join(APP, folder));
  return out;
}

/** Reads the value import and re-export specifiers of a module (type-only imports are skipped). */
function valueImports(source: string): string[] {
  const specs: string[] = [];
  const re = /(?:^|\n)\s*(import|export)\s+(type\s+)?([^;]*?)\s*from\s*["']([^"']+)["']/g;
  for (const m of source.matchAll(re)) {
    if (m[2]) continue;
    const clause = m[3]!.trim();
    if (clause.startsWith("{") && /^\{\s*(type\s+[^,}]+,?\s*)+\}$/.test(clause)) continue;
    specs.push(m[4]!);
  }
  for (const m of source.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) specs.push(m[1]!);
  return specs;
}

/** Resolves an app-local specifier to a file, or null for a package. */
function resolveLocal(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(APP, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const candidate of [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => join(base, "index" + e))]) {
    if (candidate.endsWith(".d.ts")) continue;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Tells whether a package specifier is allowed in the browser bundle. */
function allowed(spec: string): boolean {
  for (const [pkg, ok] of Object.entries(ALLOWED)) {
    if (spec === pkg || spec.startsWith(pkg + "/")) return ok.includes(spec);
  }
  return true;
}

const directive = (source: string, name: string) => new RegExp(`^\\s*["']${name}["']`).test(source.replace(/^(\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*/, ""));

describe("client bundle safety", () => {
  it("keeps server-only packages out of every client import graph", () => {
    const violations: string[] = [];
    const seen = new Set<string>();
    const visit = (file: string, chain: string[]) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = readFileSync(file, "utf8");
      if (chain.length > 0 && directive(source, "use server")) return;
      for (const spec of valueImports(source)) {
        const local = resolveLocal(file, spec);
        if (local) visit(local, [...chain, relative(APP, file)]);
        else if (!spec.startsWith("@/") && !spec.startsWith(".") && !allowed(spec)) {
          violations.push(`${[...chain, relative(APP, file)].join(" -> ")} imports ${spec}`);
        }
      }
    };
    for (const file of sourceFiles()) {
      if (directive(readFileSync(file, "utf8"), "use client")) visit(file, []);
    }
    expect(violations).toEqual([]);
  });

  it("finds a counterexample: a client module that imports the auth barrel", () => {
    expect(allowed("@reading-advantage/auth")).toBe(false);
    expect(allowed("@reading-advantage/domain/stories")).toBe(false);
    expect(allowed("@reading-advantage/auth/roles")).toBe(true);
    expect(valueImports('import type { A } from "@reading-advantage/auth";')).toEqual([]);
    expect(valueImports('import { type A } from "@reading-advantage/auth";')).toEqual([]);
    expect(valueImports('import { ROLES } from "@reading-advantage/auth";')).toEqual(["@reading-advantage/auth"]);
  });
});
