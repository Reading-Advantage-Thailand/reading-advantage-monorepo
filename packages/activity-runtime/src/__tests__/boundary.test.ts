import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(import.meta.dirname, "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (entry === "__tests__" || entry.endsWith(".test.ts")) return [];
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("activity runtime package boundaries", () => {
  it("declares stable core, authoring, server, and testing subpath exports", () => {
    const manifest = JSON.parse(readFileSync(join(sourceRoot, "..", "package.json"), "utf8"));
    expect(Object.keys(manifest.exports)).toEqual([".", "./core", "./authoring", "./server", "./testing"]);
  });

  it("contains no forbidden framework, UI, database, auth, or provider imports", () => {
    const source = sourceFiles(sourceRoot).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/from ["'](?:react|next|vinext|@reading-advantage\/(?:db|auth)|@ai-sdk\/)/);
  });

  it("requires JSDoc immediately before exported declarations", () => {
    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, "utf8");
      const declarations = source.matchAll(/^export (?:const|class|interface|type|function) ([A-Za-z0-9_]+)/gm);
      for (const declaration of declarations) {
        const preceding = source.slice(0, declaration.index).trimEnd();
        expect(preceding.endsWith("*/"), `${file}: ${declaration[1]} requires JSDoc`).toBe(true);
      }
    }
  });
});
