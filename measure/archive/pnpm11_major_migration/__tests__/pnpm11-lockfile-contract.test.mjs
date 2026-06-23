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

function getFirstPackageKey(lockfileText) {
  const lines = lockfileText.split("\n");
  let inPackages = false;
  for (const line of lines) {
    if (line.match(/^packages:\s*$/)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (line.trim() === "") continue;
      const match = line.match(/^\s+(.+):\s*$/);
      if (match) return match[1];
      break;
    }
  }
  return undefined;
}

describe("Phase 2 pnpm 11 lockfile contract", () => {
  it("package.json#packageManager matches /^pnpm@11\\./", () => {
    const pkg = readJson("package.json");
    assert.match(pkg.packageManager, /^pnpm@11\./);
  });

  it("pnpm-lock.yaml lockfileVersion is >= '9.0'", () => {
    const head = readLockfileHead("pnpm-lock.yaml");
    const raw = parseLockfileSetting(head, "lockfileVersion");
    assert.ok(raw, "lockfileVersion must be present");
    const version = raw.replace(/['"]/g, "");
    assert.ok(
      version >= "9.0",
      `lockfileVersion ${raw} must be >= '9.0'`
    );
  });

  it("pnpm-lock.yaml lockfileVersion is not the pre-migration '6.0'", () => {
    const head = readLockfileHead("pnpm-lock.yaml");
    const raw = parseLockfileSetting(head, "lockfileVersion");
    assert.notEqual(raw, "'6.0'");
  });

  it("pnpm-lock.yaml packages: section uses pnpm 9 format (no leading slash)", () => {
    const text = readText("pnpm-lock.yaml");
    const firstKey = getFirstPackageKey(text);
    assert.ok(firstKey, "packages: section must contain at least one package key");
    assert.equal(
      firstKey.startsWith("/"),
      false,
      `first package key ${JSON.stringify(firstKey)} must not start with '/' (pnpm 8 format)`
    );
  });
});
