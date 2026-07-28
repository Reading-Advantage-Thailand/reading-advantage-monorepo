import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { glob } from "glob";

import { describe, expect, it } from "vitest";

import { ACCEPTED_INPUTS_GUARD, EDITIONS_POLICY } from "../index.js";

function sha256(relativePath: string): string {
  const absolute = resolve(__dirname, "../../../../../", relativePath);
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

async function editionFreeSourceFiles(sourceRoot: string, modulePaths: readonly string[]): Promise<string[]> {
  const files = new Set<string>();
  for (const modulePath of modulePaths) {
    const relativePath = modulePath.replace(/^\.\//u, "").replace(/\.js$/u, ".ts");
    const absolutePath = resolve(sourceRoot, relativePath);
    let entry;
    try {
      entry = statSync(absolutePath);
    } catch {
      continue;
    }
    if (entry.isFile()) {
      files.add(absolutePath);
      continue;
    }
    const nestedFiles = await glob("**/*.{ts,tsx}", { cwd: absolutePath, nodir: true, absolute: true });
    nestedFiles.forEach((file) => files.add(file));
  }
  return [...files];
}

async function editionImportViolations(sourceRoot: string, modulePaths: readonly string[]): Promise<string[]> {
  const violations: string[] = [];
  for (const file of await editionFreeSourceFiles(sourceRoot, modulePaths)) {
    if (/from\s+["']\.\.?\/editions/u.test(readFileSync(file, "utf8"))) violations.push(file);
  }
  return violations;
}

describe("Phase 0 architecture guards", () => {
  it("verifies the exact T10 accepted manifest SHA-256 on disk", () => {
    expect(sha256("measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json"))
      .toBe(ACCEPTED_INPUTS_GUARD.t10Inputs.acceptedManifestSha256);
  });

  it("verifies the exact T10 successor hashes SHA-256 on disk", () => {
    expect(sha256("measure/archive/apk_independent_acceptance_handoff_20260712/successor-hashes-v1.json"))
      .toBe(ACCEPTED_INPUTS_GUARD.t10Inputs.successorHashesSha256);
  });

  it("verifies the exact T10 owner acceptance SHA-256 on disk", () => {
    expect(sha256("measure/archive/apk_independent_acceptance_handoff_20260712/product-owner-acceptance-v1.json"))
      .toBe(ACCEPTED_INPUTS_GUARD.t10Inputs.ownerAcceptanceSha256);
  });

  it("verifies the accepted standard-pack release artifact SHA-256 on disk", () => {
    expect(sha256("packages/advantage-play-kit/assets/standard/accepted-standard-pack-release.json"))
      .toBe(ACCEPTED_INPUTS_GUARD.t10Inputs.standardPackReleaseArtifactSha256);
  });

  it("verifies the accepted canonical-pack catalog digest is pinned", () => {
    expect(ACCEPTED_INPUTS_GUARD.standardPackRelease.catalogDigest)
      .toBe(ACCEPTED_INPUTS_GUARD.t10Inputs.standardPackCatalogDigest);
  });

  it("verifies the accepted canonical-pack source-receipt digest is pinned", () => {
    expect(ACCEPTED_INPUTS_GUARD.standardPackRelease.sourceReceiptDigest)
      .toBe(ACCEPTED_INPUTS_GUARD.t10Inputs.standardPackSourceReceiptDigest);
  });

  it("preserves T10's historical zero-runtime and zero-adoption evidence disposition", () => {
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.acceptedRuntimeContracts).toBe(0);
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.approvedAssetMappings).toBe(0);
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.blockedAssetMappings).toBe(85);
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.blockedResponsiveCells).toBe(5664);
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.browserSuccessClaimed).toBe(false);
  });

  it("verifies every new shared-kit module stays edition-free", async () => {
    const sourceRoot = resolve(__dirname, "../../");
    expect(await editionImportViolations(sourceRoot, EDITIONS_POLICY.editionFreeModules)).toEqual([]);
  });

  it("detects a prohibited edition import in a declared non-guards directory", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "apk-edition-policy-"));
    try {
      mkdirSync(join(fixtureRoot, "systems"), { recursive: true });
      writeFileSync(join(fixtureRoot, "systems", "fixture.ts"), 'import { legacy } from "../editions/index.js";\n');
      await expect(editionImportViolations(fixtureRoot, ["./systems"])).resolves.toEqual([
        join(fixtureRoot, "systems", "fixture.ts"),
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("verifies the editions module is marked deprecated, not a production surface", () => {
    expect(EDITIONS_POLICY.productionSurfaceForNewCartridges).toBe(false);
    expect(EDITIONS_POLICY.status).toBe("deprecated-legacy-compatibility-surface");
  });

  it("verifies all seven accepted capabilities map to owning package and shared-core module", () => {
    for (const capability of ACCEPTED_INPUTS_GUARD.manifest.capabilities) {
      expect(capability.owningPackage).toBe("@reading-advantage/advantage-play-kit");
      expect(capability.sharedCoreModule).toMatch(/^\.\/systems\//u);
    }
  });
});
