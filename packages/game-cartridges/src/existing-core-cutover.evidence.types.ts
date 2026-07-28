/**
 * Compile-time types for the existing-core-cutover evidence fixture.
 *
 * The fixture JSON is the only source of truth for the accepted T3/T4/T5/T6
 * claim ledgers; the types below mirror its exact shape so the candidate
 * module can derive per-title role/state requirements from evidence-backed
 * mechanic facts.
 */

import evidenceFixture from "./existing-core-cutover.evidence.json";

/** One accepted mechanic fact pinned to a specific evidence claim id. */
export interface MechanicFactFixture {
  readonly claimId: string;
  readonly locator: string;
  readonly temporalScope: "current-source" | "historical-source-only";
  readonly fact: string;
}

/** One acceptance-chain entry that promotes a candidate to accepted status. */
export interface AcceptanceChainEntry {
  readonly kind: string;
  readonly path: string;
  readonly sha256: string;
  readonly acceptedBy?: string;
}

/** Accepted evidence pointer with a stable collection. */
export interface AcceptedEvidencePointer {
  readonly path: string;
  readonly sha256: string;
  readonly collection?: "$" | "$.claims";
}

/** One per-title evidence fixture exactly as it appears in the evidence JSON. */
export interface CoreCutoverFixture {
  readonly publicId: string;
  readonly canonicalId: string;
  readonly title: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly evidencePhase: "T3" | "T4" | "T5" | "T6" | "T7";
  readonly acceptedEvidence: AcceptedEvidencePointer;
  readonly claimArtifact?: {
    readonly path: string;
    readonly sha256: string;
    readonly collection: "$" | "$.claims";
  };
  readonly acceptanceChain: readonly AcceptanceChainEntry[];
  readonly mechanicFacts: readonly MechanicFactFixture[];
}

/** Top-level shape of the evidence fixture, narrowed to a typed const. */
export const EXISTING_CORE_FIXTURES_TYPED = evidenceFixture as unknown as {
  readonly titles: readonly CoreCutoverFixture[];
};
