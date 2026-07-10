import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(import.meta.dirname, "..");

describe("activity runtime package boundaries", () => {
  it("declares stable core, authoring, server, and testing subpath exports", () => {
    const manifest = JSON.parse(readFileSync(join(sourceRoot, "..", "package.json"), "utf8"));
    expect(Object.keys(manifest.exports)).toEqual([".", "./core", "./authoring", "./server", "./testing"]);
  });

  it("contains no forbidden framework, UI, database, auth, or provider imports", () => {
    const files = readdirSync(sourceRoot).filter((file) => file.endsWith(".ts"));
    const source = files.map((file) => readFileSync(join(sourceRoot, file), "utf8")).join("\n");
    expect(source).not.toMatch(/from ["'](?:react|next|vinext|@reading-advantage\/(?:db|auth)|@ai-sdk\/)/);
  });
});
