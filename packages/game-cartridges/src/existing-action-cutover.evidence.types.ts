/** Compile-time shape for the five-title Existing Action evidence fixture. */
import evidenceFixture from "./existing-action-cutover.evidence.json";

/** One exact claim reference that must not be promoted beyond its temporal evidence scope. */
export interface ExistingActionClaimEvidence {
  /** Evidence action that the historical or unknown claim describes. */
  readonly action: string;
  /** Stable source claim identifier. */
  readonly claimId: string;
  /** Exact JSON locator inside the digest-pinned claim artifact. */
  readonly locator: string;
  /** Whether source evidence is current, historical, or explicitly unresolved. */
  readonly temporalScope: "current-source" | "historical-source-only" | "unknown";
  /** The runtime policy imposed by the evidence scope. */
  readonly disposition: "supported" | "blocked-historical" | "blocked-unknown";
}

/** One title-specific presentation role mapped to an owner-approved semantic role/state. */
export interface ExistingActionTitleRoleEvidence {
  /** Stable title-scoped role identity. */
  readonly titleRole: string;
  /** Owner-approved semantic role. */
  readonly role: string;
  /** Owner-approved semantic state. */
  readonly state: string;
  /** Exact source claim motivating this role in QC only. */
  readonly claimId: string;
  /** Exact source locator for the motivating claim. */
  readonly locator: string;
}

/** One evidence-bounded action title. */
export interface ExistingActionTitleEvidenceFixture {
  /** Stable QC title identifier. */
  readonly publicId: string;
  /** Stable action-cohort canonical identity. */
  readonly canonicalId: string;
  /** Title shown in the isolated QC surface. */
  readonly title: string;
  /** Frozen educational input contract. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Digest-pinned artifact containing every cited claim. */
  readonly claimArtifact: Readonly<{ path: string; sha256: string }>;
  /** Exact mechanic claim references, including explicit blockers. */
  readonly mechanicEvidence: readonly ExistingActionClaimEvidence[];
  /** Title-specific role evidence that may select only owner-approved semantics. */
  readonly roles: readonly ExistingActionTitleRoleEvidence[];
}

/** Typed immutable fixture retained as non-authorizing evidence metadata. */
export const EXISTING_ACTION_EVIDENCE_FIXTURE = evidenceFixture as unknown as Readonly<{
  readonly schemaVersion: "apk-existing-action-cutover-evidence.v2";
  readonly scope: string;
  readonly titles: readonly ExistingActionTitleEvidenceFixture[];
}>;
