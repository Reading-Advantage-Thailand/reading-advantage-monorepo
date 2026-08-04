#!/usr/bin/env node
/**
 * Noninteractive Phase 0 verification script.
 *
 * Verifies the exact T10 accepted manifest, successor hash-set, and
 * owner-acceptance SHA-256 digests on disk, plus the accepted canonical
 * standard-pack release artifact. Exits non-zero when any binding is stale,
 * revoked, mismatched, or missing.
 *
 * Usage: node scripts/check-accepted-inputs.mjs
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

const EXPECTED = {
  acceptedManifest: {
    path: "measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json",
    sha256: "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49",
  },
  successorHashes: {
    path: "measure/archive/apk_independent_acceptance_handoff_20260712/successor-hashes-v1.json",
    sha256: "c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005",
  },
  ownerAcceptance: {
    path: "measure/archive/apk_independent_acceptance_handoff_20260712/product-owner-acceptance-v1.json",
    sha256: "165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753",
  },
  standardPackRelease: {
    path: "packages/advantage-play-kit/assets/standard/accepted-standard-pack-release.json",
    sha256: "619b5ef11ae6010e95fb0399cd556660c09a67e23648d4a81805ea7009a2b3f5",
  },
};

function sha256(relativePath) {
  const absolute = resolve(repoRoot, relativePath);
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

function check(label, entry) {
  const actual = sha256(entry.path);
  const ok = actual === entry.sha256;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  console.log(`       path:   ${entry.path}`);
  console.log(`       expect: ${entry.sha256}`);
  console.log(`       actual: ${actual}`);
  return ok;
}

let allOk = true;
allOk = check("T10 accepted manifest", EXPECTED.acceptedManifest) && allOk;
allOk = check("T10 successor hashes", EXPECTED.successorHashes) && allOk;
allOk = check("T10 owner acceptance", EXPECTED.ownerAcceptance) && allOk;
allOk = check("Accepted standard-pack release", EXPECTED.standardPackRelease) && allOk;

const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, EXPECTED.acceptedManifest.path), "utf8"),
);

console.log("");
console.log(`Accepted capability input files: ${Object.keys(manifest.accepted_capability_inputs).length}`);
console.log(`Accepted runtime contracts: ${manifest.adoption_policy.accepted_runtime_contracts}`);
console.log(`Approved asset mappings: ${manifest.adoption_policy.approved_asset_mappings}`);
console.log(`Blocked asset mappings: ${manifest.adoption_policy.blocked_asset_mappings}`);
console.log(`Browser success claimed: ${manifest.adoption_policy.browser_success_claimed}`);
console.log(`Standard-pack release: ${manifest.standard_pack.version}`);

if (Object.keys(manifest.accepted_capability_inputs).length !== 3) {
  console.error("FAIL  expected exactly three accepted capability input files");
  allOk = false;
}
if (manifest.adoption_policy.accepted_runtime_contracts !== 0) {
  console.error("FAIL  expected zero accepted runtime contracts");
  allOk = false;
}
if (manifest.adoption_policy.approved_asset_mappings !== 0) {
  console.error("FAIL  expected zero approved asset mappings");
  allOk = false;
}

console.log("");
if (allOk) {
  console.log("All accepted-input bindings verified.");
  process.exit(0);
} else {
  console.error("One or more accepted-input bindings failed verification.");
  process.exit(1);
}
