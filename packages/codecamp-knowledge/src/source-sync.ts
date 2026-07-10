import { createHash } from "node:crypto";

import { z } from "zod";

/** Strict provenance for one immutable graph source snapshot. */
export const CodeGraphSourceProvenanceSchema = z
  .object({
    schemaVersion: z.literal("code-graph-source.v1"),
    sourceRepository: z.literal("mastery-advantage"),
    sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
    sourceDigest: z.string().regex(/^[0-9a-f]{64}$/),
    authorityPath: z.literal("code/code-knowledge-space.json"),
    graphVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  })
  .strict();

/** Immutable source revision and digest recorded for a packaged graph snapshot. */
export type CodeGraphSourceProvenance = z.infer<typeof CodeGraphSourceProvenanceSchema>;

/** Result of comparing an authoritative graph with its packaged snapshot. */
export interface SourceSyncResult {
  /** Whether source bytes, snapshot bytes, and the recorded digest are identical. */
  valid: boolean;
  /** Stable human-readable mismatches. */
  issues: string[];
  /** SHA-256 digest computed from the authoritative source bytes. */
  sourceDigest: string;
  /** SHA-256 digest computed from the packaged snapshot bytes. */
  snapshotDigest: string;
}

/** Computes a lowercase SHA-256 digest for immutable graph bytes.
 * @param bytes Exact file bytes to hash.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Verifies byte identity and provenance without mutating either source.
 * @param sourceBytes Normative Mastery Advantage graph bytes.
 * @param snapshotBytes Packaged consumer snapshot bytes.
 * @param provenance Strict source commit and digest manifest.
 * @returns A fail-closed comparison with both computed digests.
 */
export function verifySourceSnapshot(
  sourceBytes: Uint8Array,
  snapshotBytes: Uint8Array,
  provenance: CodeGraphSourceProvenance,
): SourceSyncResult {
  const sourceDigest = sha256(sourceBytes);
  const snapshotDigest = sha256(snapshotBytes);
  const issues: string[] = [];
  if (sourceDigest !== snapshotDigest) issues.push("Normative source and packaged snapshot bytes differ.");
  if (sourceDigest !== provenance.sourceDigest) issues.push("Normative source digest differs from provenance.");
  if (snapshotDigest !== provenance.sourceDigest) issues.push("Packaged snapshot digest differs from provenance.");
  return { valid: issues.length === 0, issues, sourceDigest, snapshotDigest };
}
