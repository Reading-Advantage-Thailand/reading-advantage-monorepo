import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(__dirname, "../..");
const sourceDirs = ["app", "components", "lib", "server", "actions", "configs", "public"];
const sourceExt = /\.(ts|tsx|js|jsx|mjs)$/;
const thisFile = path.resolve(__dirname, "removed-surfaces.test.ts");

/**
 * Lists every source file under the scanned app folders, except this guard test.
 * @returns Absolute paths of the source files.
 */
function listSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (sourceExt.test(name) && full !== thisFile) out.push(full);
    }
  };
  for (const dir of sourceDirs) walk(path.join(appRoot, dir));
  return out;
}

/**
 * Returns the source files whose text matches a pattern.
 * @param pattern The pattern to search for.
 * @returns Paths relative to the app root.
 */
function filesMatching(pattern: RegExp): string[] {
  return listSources()
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(appRoot, file));
}

describe("SYS-04: System Testing page", () => {
  it("has no page folder and no test actions file", () => {
    expect(existsSync(path.join(appRoot, "app/[locale]/system/test"))).toBe(false);
    expect(existsSync(path.join(appRoot, "actions/test.ts"))).toBe(false);
  });

  it("has no source that names the removed code", () => {
    expect(filesMatching(/deleteAllArticles|@\/actions\/test["']/)).toEqual([]);
  });

  it("has no source that deletes all rows of articles", () => {
    expect(filesMatching(/\.delete\(articles\)\s*(\.returning|;)/)).toEqual([]);
  });
});
