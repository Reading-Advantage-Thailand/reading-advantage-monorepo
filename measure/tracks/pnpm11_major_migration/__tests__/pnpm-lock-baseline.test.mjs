import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../../../", import.meta.url).pathname;

function readText(filename) {
  return readFileSync(join(repoRoot, filename), "utf8");
}

function readJson(filename) {
  return JSON.parse(readText(filename));
}

function readLockfileHead(filename) {
  return readText(filename).split("\n").slice(0, 15);
}

function parseLockfileSetting(lines, key) {
  for (const line of lines) {
    const match = line.match(new RegExp(`^\\s*${key}:\\s*(.+)$`));
    if (match) return match[1].trim();
  }
  return undefined;
}

describe("Phase 1 baseline pin", () => {
  it("package.json#packageManager is pnpm@8.15.8", () => {
    const pkg = readJson("package.json");
    assert.equal(pkg.packageManager, "pnpm@8.15.8");
  });

  it("pnpm-lock.yaml lockfileVersion is '6.0'", () => {
    const head = readLockfileHead("pnpm-lock.yaml");
    const version = parseLockfileSetting(head, "lockfileVersion");
    assert.equal(version, "'6.0'");
  });

  it("pnpm-lock.yaml settings.autoInstallPeers is true", () => {
    const head = readLockfileHead("pnpm-lock.yaml");
    const value = parseLockfileSetting(head, "autoInstallPeers");
    assert.equal(value, "true");
  });

  it("pnpm-workspace.yaml declares exactly the 3 standard globs", () => {
    const text = readText("pnpm-workspace.yaml");
    const globs = [];
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*-\s+"([^"]+)"/);
      if (match) globs.push(match[1]);
    }
    assert.deepEqual(globs, ["apps/*", "packages/*", "packages/integrations/*"]);
  });

  it("no .npmrc exists at the repo root", () => {
    assert.equal(existsSync(join(repoRoot, ".npmrc")), false);
  });

  it("CI pnpm/action-setup@v4 has no version: key", () => {
    const text = readText(".github/workflows/ci.yml");
    const setupMatch = text.match(/- name:\s*Setup pnpm\s*\n\s*uses:\s*pnpm\/action-setup@v4/i);
    assert.ok(setupMatch, "CI must use pnpm/action-setup@v4");

    const blockStart = text.indexOf(setupMatch[0]);
    const afterSetup = text.slice(blockStart + setupMatch[0].length);
    const nextNamedStepOffset = afterSetup.search(/\n\s*- name:/);
    const blockEnd =
      nextNamedStepOffset >= 0
        ? blockStart + setupMatch[0].length + nextNamedStepOffset
        : text.length;
    const block = text.slice(blockStart, blockEnd);
    assert.equal(
      /\bversion\s*:/i.test(block),
      false,
      "pnpm/action-setup step must not contain a version: key"
    );
  });
});
