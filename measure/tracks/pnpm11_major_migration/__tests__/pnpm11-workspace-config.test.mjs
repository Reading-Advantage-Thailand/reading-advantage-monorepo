import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../../../", import.meta.url).pathname;

function readText(filename) {
  return readFileSync(join(repoRoot, filename), "utf8");
}

function readJson(filename) {
  return JSON.parse(readText(filename));
}

function getTopLevelBlocks(text) {
  const blocks = new Set();
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_]+):/);
    if (match) blocks.add(match[1]);
  }
  return blocks;
}

function getBlockContent(text, blockName) {
  const lines = text.split("\n");
  let inside = false;
  let baseIndent = null;
  const result = [];
  for (const rawLine of lines) {
    const match = rawLine.match(new RegExp(`^([\\t ]*)${blockName}:`));
    if (match) {
      inside = true;
      baseIndent = match[1].length;
      continue;
    }
    if (inside) {
      const currentIndent = rawLine.match(/^(\s*)/)[1].length;
      if (rawLine.trim() === "") continue;
      if (currentIndent <= baseIndent && rawLine.match(/^\s*[a-zA-Z0-9_]+:/)) {
        break;
      }
      result.push(rawLine);
    }
  }
  return result.join("\n");
}

function getListItems(text) {
  const items = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*-\s+"([^"]+)"/);
    if (match) items.push(match[1]);
  }
  return items;
}

function getOverridePins(text) {
  const pins = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([a-z0-9-]+):\s*["']?([^"'\n]+)["']?/);
    if (match) pins.push(match[1]);
  }
  return pins;
}

describe("Phase 3 pnpm 11 workspace config contract", () => {
  const workspaceText = readText("pnpm-workspace.yaml");
  const pkg = readJson("package.json");
  const blocks = getTopLevelBlocks(workspaceText);

  it("pnpm-workspace.yaml preserves the 3 standard workspace globs", () => {
    const globs = getListItems(workspaceText);
    assert.deepEqual(globs, ["apps/*", "packages/*", "packages/integrations/*"]);
  });

  it("pnpm-workspace.yaml declares top-level overrides:", () => {
    assert.ok(blocks.has("overrides"), "overrides block is absent");
  });

  it("pnpm-workspace.yaml declares top-level peerDependencyRules:", () => {
    assert.ok(blocks.has("peerDependencyRules"), "peerDependencyRules block is absent");
  });

  it("pnpm-workspace.yaml declares top-level allowBuilds:", () => {
    assert.ok(blocks.has("allowBuilds"), "allowBuilds block is absent");
  });

  it("pnpm-workspace.yaml declares nodeLinker: hoisted", () => {
    assert.ok(blocks.has("nodeLinker"), "nodeLinker key is absent");
    assert.match(workspaceText, /nodeLinker:\s*hoisted/);
  });

  it("pnpm-workspace.yaml declares resolvePeersFromWorkspaceRoot: true", () => {
    assert.ok(blocks.has("resolvePeersFromWorkspaceRoot"), "resolvePeersFromWorkspaceRoot key is absent");
    assert.match(workspaceText, /resolvePeersFromWorkspaceRoot:\s*true/);
  });

  it("pnpm-workspace.yaml overrides: block pins the 5 monorepo packages", () => {
    assert.ok(blocks.has("overrides"), "overrides block is absent");
    const overridesContent = getBlockContent(workspaceText, "overrides");
    const pins = getOverridePins(overridesContent);
    assert.deepEqual(
      pins.sort(),
      ["drizzle-orm", "next", "react", "react-dom", "vitest"].sort()
    );
  });

  it("package.json does NOT carry a pnpm field", () => {
    assert.equal(
      Object.hasOwn(pkg, "pnpm"),
      false,
      "package.json must not contain a top-level pnpm field"
    );
  });

  it("package.json#packageManager matches /^pnpm@11\\./", () => {
    assert.match(pkg.packageManager, /^pnpm@11\./);
  });
});
