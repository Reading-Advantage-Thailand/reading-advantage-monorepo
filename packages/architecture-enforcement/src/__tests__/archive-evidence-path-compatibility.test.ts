import { createHash } from "node:crypto";
import { lstat, readFile, readlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  analyzerReconciliationManifestSchema,
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_MANIFEST_PATH,
  RECONCILIATION_REVIEW_EVIDENCE_PATHS,
} from "../reconciliation-manifest.js";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const ACTIVE_TRACK_PATH =
  "measure/tracks/backend_architecture_enforcement_20260713";
const ACTIVE_TRACK_TARGET =
  "../archive/backend_architecture_enforcement_20260713";
const ACCEPTED_MANIFEST_SHA256 =
  "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0";
const ACCEPTED_EVIDENCE = [
  {
    path: "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-denominator-diff-audit.md",
    archivePath:
      "measure/archive/backend_architecture_enforcement_20260713/reconciliation-denominator-diff-audit.md",
    sha256: "1d59d77f5b9d2d82537392be65135f659129a7f82e3b9e93816628c096658341",
  },
  {
    path: "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-adversarial-review.md",
    archivePath:
      "measure/archive/backend_architecture_enforcement_20260713/reconciliation-adversarial-review.md",
    sha256: "20cb5fe217405eadbc3ff74ac674515bb0d8f9c2f9f9b750a5f06e6b515a2a5d",
  },
  {
    path: "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-correctness-review.md",
    archivePath:
      "measure/archive/backend_architecture_enforcement_20260713/reconciliation-correctness-review.md",
    sha256: "8cd66f76482a9ae9ed8fea01e6f41491ec390b057176a246f8d827772c2bef79",
  },
  {
    path: "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-developer-api-review.md",
    archivePath:
      "measure/archive/backend_architecture_enforcement_20260713/reconciliation-developer-api-review.md",
    sha256: "f58d3294dbc8c9cfc70783d45b7f7a8c342fbaa0abb46e07105c34b83aa1fcdc",
  },
  {
    path: "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-security-review.md",
    archivePath:
      "measure/archive/backend_architecture_enforcement_20260713/reconciliation-security-review.md",
    sha256: "a90c4379e84498204d004338482ac271490bc48b8782992b23c5aac8468b1ec5",
  },
] as const;

/**
 * Hashes exact file bytes.
 * @param value Exact bytes to hash.
 * @returns The lowercase SHA-256 digest.
 */
function fileSha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("archived architecture evidence path compatibility", () => {
  it("restores every accepted active path with an immutable archive link", async () => {
    const activeTrackPath = resolve(repositoryRoot, ACTIVE_TRACK_PATH);
    expect((await lstat(activeTrackPath)).isSymbolicLink()).toBe(true);
    expect(await readlink(activeTrackPath)).toBe(ACTIVE_TRACK_TARGET);
    const manifestBytes = await readFile(
      resolve(repositoryRoot, RECONCILIATION_MANIFEST_PATH),
    );
    expect(fileSha256(manifestBytes)).toBe(ACCEPTED_MANIFEST_SHA256);
    const manifest = analyzerReconciliationManifestSchema.parse(
      JSON.parse(manifestBytes.toString("utf8")),
    );
    const manifestEvidence = [
      {
        path: manifest.reproduction.denominatorDiffAudit.path,
        sha256: manifest.reproduction.denominatorDiffAudit.sha256,
      },
      ...manifest.reviews.map((review) => ({
        path: review.evidencePath,
        sha256: review.evidenceSha256,
      })),
    ];
    expect(manifestEvidence).toEqual(
      ACCEPTED_EVIDENCE.map(({ path, sha256 }) => ({ path, sha256 })),
    );
    expect(RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH).toBe(
      ACCEPTED_EVIDENCE[0].path,
    );
    expect(RECONCILIATION_REVIEW_EVIDENCE_PATHS).toEqual({
      "adversarial-testing": ACCEPTED_EVIDENCE[1].path,
      correctness: ACCEPTED_EVIDENCE[2].path,
      "developer-api": ACCEPTED_EVIDENCE[3].path,
      security: ACCEPTED_EVIDENCE[4].path,
    });

    for (const item of ACCEPTED_EVIDENCE) {
      const path = resolve(repositoryRoot, item.path);
      const targetBytes = await readFile(
        resolve(repositoryRoot, item.archivePath),
      );
      expect(await readFile(path)).toEqual(targetBytes);
      expect(fileSha256(targetBytes)).toBe(item.sha256);
    }
  });
});
