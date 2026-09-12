import type { WorkbookSourceIdentity } from "./contracts.js";
import type { WorkbookDraft } from "./edition-contracts.js";

/** Identity subset required to compare a source against existing drafts. */
export type WorkbookSourceDriftIdentity = Pick<
  WorkbookSourceIdentity,
  "sourceApp" | "sourceId" | "contentHash"
>;

/** Result of comparing one source identity against existing drafts. */
export interface WorkbookSourceDriftReport {
  /** Whether any existing draft carries the same identity with a different content hash. */
  driftDetected: boolean;
  /** Draft identifiers already carrying the same sourceApp and sourceId. */
  matchedDraftIds: readonly string[];
  /** Draft identifiers carrying the same sourceApp and sourceId with a different content hash. */
  supersededDraftIds: readonly string[];
}

/**
 * Detects whether importing a source would supersede any existing draft.
 *
 * A draft matches the incoming source when its source record carries the same
 * sourceApp and sourceId. The incoming source drifts from that draft when the
 * content hashes differ; identical hashes are an idempotent re-import. The
 * function is pure and reads only: it never mutates the drafts it inspects.
 * @param existingDrafts Drafts already persisted for the tenant.
 * @param sourceIdentity Source app, source id, and content hash being imported.
 * @returns A drift report listing matched and superseded draft identifiers.
 */
export function detectWorkbookSourceDrift(
  existingDrafts: readonly WorkbookDraft[],
  sourceIdentity: WorkbookSourceDriftIdentity,
): WorkbookSourceDriftReport {
  const matched: string[] = [];
  const superseded: string[] = [];

  for (const draft of existingDrafts) {
    const identity = draft.sourceRecord.identity;
    if (
      identity.sourceApp !== sourceIdentity.sourceApp ||
      identity.sourceId !== sourceIdentity.sourceId
    ) {
      continue;
    }
    matched.push(draft.draftId);
    if (identity.contentHash !== sourceIdentity.contentHash) {
      superseded.push(draft.draftId);
    }
  }

  return {
    driftDetected: superseded.length > 0,
    matchedDraftIds: matched,
    supersededDraftIds: superseded,
  };
}
