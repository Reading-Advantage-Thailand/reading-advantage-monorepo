import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("shared-core and provider-neutral boundaries", () => {
  it("uses only the public core API and no app, database, or provider imports", () => {
    const files = [
      "adapter.ts",
      "bindings.ts",
      "contracts.ts",
      "curriculum-inventory.ts",
      "validation.ts",
      "publication.ts",
    ];
    const source = files.map((file) => readFileSync(join(packageRoot, "src", file), "utf8")).join("\n");
    expect(source).toContain('from "@reading-advantage/knowledge-space-core"');
    expect(source).not.toMatch(/from ["'](?:@reading-advantage\/(?:domain|db)|\.\.\/\.\.\/apps|@ai-sdk|openai)/);
    expect(source).not.toContain("knowledge-space-core/src/");
    const generator = readFileSync(join(packageRoot, "scripts/generate-curriculum-bindings.ts"), "utf8");
    expect(generator).not.toMatch(/writeFileSync\([^,]+source/i);
    expect(generator).toContain("collectCurriculumInventory");
  });

  it("declares packed graph and CLI verification contracts", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      exports: Record<string, unknown>;
      scripts: Record<string, string>;
    };
    expect(manifest.exports["./graph"]).toBe("./dist/data/code-knowledge-space.json");
    expect(manifest.scripts["graph:validate"]).toContain("dist/cli.js validate");
    expect(manifest.scripts["graph:report"]).toContain("dist/cli.js report");
    expect(manifest.scripts["graph:verify-source"]).toContain("verify-source");
    expect(manifest.scripts["bindings:validate"]).toContain("bindings-validate");
    expect(manifest.scripts["bindings:verify-source"]).toContain("bindings-verify-source");
  });
});
