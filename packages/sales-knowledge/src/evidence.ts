import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import rawSalesReleaseEvidence from "./data/sales-release-evidence.json" with { type: "json" };
import {
  APPROVAL_CANONICAL_SHA256,
  APPROVED_CURRICULUM_DIGEST,
  APPROVED_SEED_ARTIFACT,
  APPROVED_SOURCE_COMMIT,
  APPROVAL_EVIDENCE_DIGEST,
  RELEASE_CANDIDATE_BYTE_SHA256,
  RELEASE_CANDIDATE_CANONICAL_SHA256,
  SALES_BINDINGS_CANONICAL_SHA256,
  SALES_GRAPH_CANONICAL_SHA256,
  SALES_KNOWLEDGE_RELEASE_ID,
  STATIC_SEED_BYTE_SHA256,
  type SalesKnowledgeIssue,
  type SalesKnowledgeValidationResult,
} from "./contracts.js";
import {
  validateSalesCurriculumBindings,
  validateSalesCurriculumBindingsAgainstApprovedManifest,
} from "./bindings.js";
import { SALES_MODULE_SLUGS } from "./inventory.js";
import { validateSalesKnowledgeRelease } from "./validation.js";

/** Exact packaged manifest binding runtime artifacts to immutable source evidence. */
export const SalesReleaseEvidenceManifestSchema = z
  .object({
    schemaVersion: z.literal("sales-release-evidence.v1"),
    releaseId: z.literal(SALES_KNOWLEDGE_RELEASE_ID),
    graphVersion: z.literal("1.0.0"),
    approved: z
      .object({
        curriculumGraphSha256: z.literal(APPROVED_CURRICULUM_DIGEST),
        sourceRepository: z.literal("advantage-pr"),
        sourceCommit: z.literal(APPROVED_SOURCE_COMMIT),
      })
      .strict(),
    evidence: z
      .object({
        releaseCandidate: z
          .object({
            path: z.literal(
              "apps/sales-advantage/curriculum/release-candidate.json",
            ),
            byteSha256: z.literal(RELEASE_CANDIDATE_BYTE_SHA256),
            canonicalSha256: z.literal(RELEASE_CANDIDATE_CANONICAL_SHA256),
          })
          .strict(),
        approval: z
          .object({
            path: z.literal(
              "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json",
            ),
            byteSha256: z.literal(APPROVAL_EVIDENCE_DIGEST),
            canonicalSha256: z.literal(APPROVAL_CANONICAL_SHA256),
          })
          .strict(),
        staticSeed: z
          .object({
            path: z.literal(APPROVED_SEED_ARTIFACT),
            byteSha256: z.literal(STATIC_SEED_BYTE_SHA256),
          })
          .strict(),
      })
      .strict(),
    artifacts: z
      .object({
        graphCanonicalSha256: z.literal(SALES_GRAPH_CANONICAL_SHA256),
        bindingsCanonicalSha256: z.literal(SALES_BINDINGS_CANONICAL_SHA256),
      })
      .strict(),
    moduleOrder: z.tuple([
      z.literal("foundations-discovery"),
      z.literal("framing-value"),
      z.literal("objections"),
      z.literal("ra-product-applied"),
      z.literal("ra-objections-demo"),
      z.literal("pricing-closing"),
    ]),
  })
  .strict();

/** Validated packaged evidence manifest for the reviewed Sales release. */
export type SalesReleaseEvidenceManifest = z.infer<
  typeof SalesReleaseEvidenceManifestSchema
>;

/** Input for validating packaged Sales graph, binding, and source evidence. */
export interface SalesRuntimeVerificationRequest {
  /** Candidate Sales graph release. */
  graph: unknown;
  /** Candidate Sales curriculum bindings release. */
  bindings: unknown;
  /** Optional packaged manifest; defaults to the immutable package copy. */
  evidenceManifest?: unknown;
  /** Byte-exact release candidate required at every reviewed-release boundary. */
  releaseCandidateBytes?: Uint8Array;
  /** Byte-exact owner approval required at every reviewed-release boundary. */
  approvalBytes?: Uint8Array;
  /** Byte-exact static seed required at every reviewed-release boundary. */
  seedBytes?: Uint8Array;
}

function resolvePackagedEvidencePath(evidenceUrl: URL): string {
  if (evidenceUrl.pathname.includes("/static/media/")) {
    return resolve(
      process.cwd(),
      process.env.NODE_ENV === "development"
        ? ".next/dev/server/assets"
        : ".next/server/assets",
      basename(evidenceUrl.pathname),
    );
  }
  if (evidenceUrl.protocol === "file:") {
    return fileURLToPath(evidenceUrl);
  }
  return resolve(
    __dirname,
    evidenceUrl.pathname.replace(/^\/_next\//, ""),
  );
}

/** Loads exact package-contained source evidence for runtime release validation.
 * @returns All three immutable owner-approved evidence byte streams.
 */
export function loadPackagedSalesEvidenceBytes(): {
  releaseCandidateBytes: Uint8Array;
  approvalBytes: Uint8Array;
  seedBytes: Uint8Array;
} {
  return {
    releaseCandidateBytes: readFileSync(
      resolvePackagedEvidencePath(
        new URL("./data/evidence/release-candidate.json", import.meta.url),
      ),
    ),
    approvalBytes: readFileSync(
      resolvePackagedEvidencePath(
        new URL("./data/evidence/owner-approval.json", import.meta.url),
      ),
    ),
    seedBytes: readFileSync(
      resolvePackagedEvidencePath(
        new URL("./data/evidence/static-seed.ts.txt", import.meta.url),
      ),
    ),
  };
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJsonSha256(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function parseJsonBytes(bytes: Uint8Array): unknown | undefined {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function issue(code: string, message: string): SalesKnowledgeIssue {
  return { code, message };
}

function verifyEvidenceBytes(request: SalesRuntimeVerificationRequest): {
  issues: SalesKnowledgeIssue[];
  releaseCandidate?: unknown;
  approval?: unknown;
} {
  const issues: SalesKnowledgeIssue[] = [];
  const releaseCandidate =
    request.releaseCandidateBytes == null
      ? undefined
      : parseJsonBytes(request.releaseCandidateBytes);
  const approval =
    request.approvalBytes == null
      ? undefined
      : parseJsonBytes(request.approvalBytes);
  if (
    request.releaseCandidateBytes == null ||
    sha256(request.releaseCandidateBytes) !== RELEASE_CANDIDATE_BYTE_SHA256 ||
    releaseCandidate == null ||
    canonicalJsonSha256(releaseCandidate) !== RELEASE_CANDIDATE_CANONICAL_SHA256
  ) {
    issues.push(
      issue(
        "RELEASE_CANDIDATE_EVIDENCE_MISMATCH",
        "Release candidate bytes do not match the approved Sales evidence.",
      ),
    );
  }
  if (
    request.approvalBytes == null ||
    sha256(request.approvalBytes) !== APPROVAL_EVIDENCE_DIGEST ||
    approval == null ||
    canonicalJsonSha256(approval) !== APPROVAL_CANONICAL_SHA256
  ) {
    issues.push(
      issue(
        "APPROVAL_EVIDENCE_MISMATCH",
        "Approval bytes do not match the owner-approved Sales evidence.",
      ),
    );
  }
  if (
    request.seedBytes == null ||
    sha256(request.seedBytes) !== STATIC_SEED_BYTE_SHA256
  ) {
    issues.push(
      issue(
        "STATIC_SEED_EVIDENCE_MISMATCH",
        "Static seed bytes do not match the approved Sales source.",
      ),
    );
  }
  return { issues, releaseCandidate, approval };
}

/** Verifies packaged runtime artifacts and their optional build-time source bytes.
 * @param request Candidate artifacts, manifest, and optional exact source bytes.
 * @returns Fail-closed validation result across graph, bindings, and evidence.
 */
export function verifySalesRuntimeArtifacts(
  request: SalesRuntimeVerificationRequest,
): SalesKnowledgeValidationResult {
  const issues: SalesKnowledgeIssue[] = [];
  const manifest = SalesReleaseEvidenceManifestSchema.safeParse(
    request.evidenceManifest ?? rawSalesReleaseEvidence,
  );
  if (!manifest.success) {
    issues.push(
      issue(
        "RELEASE_EVIDENCE_MANIFEST_MISMATCH",
        "Packaged Sales evidence manifest differs from the reviewed release.",
      ),
    );
  } else if (
    manifest.data.moduleOrder.join(",") !== SALES_MODULE_SLUGS.join(",")
  ) {
    issues.push(
      issue(
        "MODULE_ORDER_DRIFT",
        "Packaged Sales evidence module order differs from the approved inventory.",
      ),
    );
  }

  const graphValidation = validateSalesKnowledgeRelease(request.graph);
  issues.push(...graphValidation.issues);
  const bindingValidation =
    validateSalesCurriculumBindingsAgainstApprovedManifest(
      request.bindings,
      request.graph,
    );
  issues.push(...bindingValidation.issues);

  if (canonicalJsonSha256(request.graph) !== SALES_GRAPH_CANONICAL_SHA256) {
    issues.push(
      issue(
        "GRAPH_ARTIFACT_DIGEST_MISMATCH",
        "Sales graph content differs from the canonical reviewed artifact.",
      ),
    );
  }
  if (
    canonicalJsonSha256(request.bindings) !== SALES_BINDINGS_CANONICAL_SHA256
  ) {
    issues.push(
      issue(
        "BINDINGS_ARTIFACT_DIGEST_MISMATCH",
        "Sales bindings content differs from the canonical reviewed artifact.",
      ),
    );
  }

  const evidence = verifyEvidenceBytes(request);
  issues.push(...evidence.issues);
  if (evidence.releaseCandidate != null && evidence.approval != null) {
    const validation = validateSalesCurriculumBindings(
      request.bindings,
      request.graph,
      {
        releaseCandidate: evidence.releaseCandidate,
        approval: evidence.approval,
      },
    );
    issues.push(...validation.issues);
  }

  const uniqueIssues = new Map(
    issues.map((item) => [
      `${item.code}:${item.entityId ?? item.path ?? ""}`,
      item,
    ]),
  );
  const ordered = [...uniqueIssues.values()].sort((left, right) =>
    `${left.code}:${left.entityId ?? left.path ?? ""}`.localeCompare(
      `${right.code}:${right.entityId ?? right.path ?? ""}`,
    ),
  );
  return { valid: ordered.length === 0, issues: ordered };
}

/** Verifies byte-exact Sales approval evidence before accepting reviewed status.
 * @param request Candidate artifacts and all three immutable source byte streams.
 * @returns Fail-closed validation result for evidence and runtime artifacts.
 */
export function verifySalesReleaseEvidence(
  request: SalesRuntimeVerificationRequest & {
    /** Byte-exact release candidate. */
    releaseCandidateBytes: Uint8Array;
    /** Byte-exact owner approval. */
    approvalBytes: Uint8Array;
    /** Byte-exact static seed source. */
    seedBytes: Uint8Array;
  },
): SalesKnowledgeValidationResult {
  return verifySalesRuntimeArtifacts(request);
}

/** Immutable packaged evidence manifest used by runtime validation. */
export const salesReleaseEvidenceManifest =
  SalesReleaseEvidenceManifestSchema.parse(rawSalesReleaseEvidence);
