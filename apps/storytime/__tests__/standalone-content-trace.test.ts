// @vitest-environment node
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * List every content JSON file, relative to the app folder, with forward slashes.
 * @returns The sorted relative paths.
 */
function contentFiles(): string[] {
  return readdirSync(resolve(app, "content"), { recursive: true, encoding: "utf8" })
    .map((file) => `content/${file.replaceAll("\\", "/")}`)
    .filter((file) => file.endsWith(".json"))
    .sort();
}

/**
 * Turn a tracing glob (with * and **) into a regular expression on app-relative paths.
 * @param pattern The glob from outputFileTracingIncludes, relative to the app folder.
 * @returns A regular expression that matches the same paths.
 */
function globToRegExp(pattern: string): RegExp {
  const body = pattern
    .replace(/^\.\//, "")
    .split("**/")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*"))
    .join("(?:.*/)?");
  return new RegExp(`^${body}$`);
}

describe("standalone output holds apps/storytime/content", () => {
  it("has the nine content files on disk", () => {
    const files = contentFiles();
    expect(files).toContain("content/source.json");
    for (let week = 1; week <= 8; week += 1) {
      expect(files).toContain(`content/l2/w0${week}.json`);
    }
  });

  it("traces every content file into every route through outputFileTracingIncludes", () => {
    const includes = nextConfig.outputFileTracingIncludes ?? {};
    const patterns = includes["/**"] ?? [];
    expect(patterns.length, "No outputFileTracingIncludes entry for /**").toBeGreaterThan(0);
    const matchers = patterns.map(globToRegExp);
    for (const file of contentFiles()) {
      expect(
        matchers.some((matcher) => matcher.test(file)),
        `Standalone trace misses ${file}`,
      ).toBe(true);
    }
  });
});
