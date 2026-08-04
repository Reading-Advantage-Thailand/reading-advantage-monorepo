import {
  assertExpectedRevision,
  assertSnapshotComplete,
  workbookEditionSchema,
  workbookPublicationRequestSchema,
  type WorkbookDraft,
  type WorkbookEdition,
  type WorkbookPublicationRequest,
} from "./edition-contracts.js";
import {
  assertWorkbookDraftTransition,
  WorkbookPublicationError,
} from "./edition-state.js";
import type {
  WorkbookClock,
  WorkbookEditionRepositoryPort,
} from "./edition-repository-port.js";

/** Dependencies required to publish a workbook draft as an immutable edition. */
export interface PublishWorkbookEditionDependencies {
  /** Persistence boundary used to read drafts and append editions atomically. */
  repository: WorkbookEditionRepositoryPort;
  /** Clock supplying ISO-8601 timestamps for the publication and its audit event. */
  clock: WorkbookClock;
  /** Generates deterministic identifiers for the edition and its audit event. */
  newId: () => string;
}

/**
 * Publishes an in-review workbook draft as an immutable edition, idempotently.
 *
 * The command validates the request, short-circuits on an existing idempotency
 * key, loads the draft, then applies optimistic concurrency, lifecycle and
 * snapshot-completeness guards before appending the edition, updating the draft
 * status and recording a publication audit event. The repository is expected to
 * apply the writes atomically inside a single transaction.
 * @param request The validated publication request describing the draft to publish.
 * @param deps Repository, clock and identifier generator used for the publication.
 * @returns The persisted edition, or the previously published edition when the
 * request's idempotency key was already used.
 * @throws WorkbookPublicationError with code "VALIDATION_ERROR" for an invalid
 * request, "NOT_FOUND" for a missing draft, "REVISION_CONFLICT" when the draft
 * revision changed, "EDITION_IMMUTABLE" or "ILLEGAL_STATE_TRANSITION" when the
 * draft is not in review, and "INCOMPLETE_SNAPSHOT" when the snapshot or
 * constructed edition is incomplete.
 */
export async function publishWorkbookEdition(
  request: WorkbookPublicationRequest,
  deps: PublishWorkbookEditionDependencies,
): Promise<WorkbookEdition> {
  const parsedRequest = workbookPublicationRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new WorkbookPublicationError("VALIDATION_ERROR", "invalid publication request", {
      detail: "invalid publication request",
    });
  }
  const { tenantId, draftId, expectedRevision, idempotencyKey, publishedBy } =
    parsedRequest.data;

  const existing = await deps.repository.findEditionByIdempotencyKey(
    tenantId,
    idempotencyKey,
  );
  if (existing !== null) {
    return existing;
  }

  const draft: WorkbookDraft | null = await deps.repository.getDraft(tenantId, draftId);
  if (draft === null) {
    throw new WorkbookPublicationError("NOT_FOUND", "draft not found", {
      detail: "draft not found",
    });
  }

  assertExpectedRevision(draft.revision, expectedRevision);

  assertWorkbookDraftTransition(draft.status, "published");

  assertSnapshotComplete(draft.sourceRecord);

  const version = await deps.repository.nextEditionVersion(tenantId, draftId);

  const edition: WorkbookEdition = {
    editionId: deps.newId(),
    draftId,
    tenantId,
    version,
    snapshot: draft.sourceRecord,
    contentHash: draft.sourceRecord.identity.contentHash,
    idempotencyKey,
    publishedBy,
    publishedAt: deps.clock.now(),
    supersededByEditionId: null,
    revokedAt: null,
  };
  const parsedEdition = workbookEditionSchema.safeParse(edition);
  if (!parsedEdition.success) {
    throw new WorkbookPublicationError(
      "INCOMPLETE_SNAPSHOT",
      "constructed edition failed validation",
      { detail: "constructed edition failed validation" },
    );
  }

  const saved = await deps.repository.appendEdition(edition);

  await deps.repository.updateDraftStatus(tenantId, draftId, "published", expectedRevision);

  await deps.repository.recordEvent({
    eventId: deps.newId(),
    tenantId,
    draftId,
    editionId: saved.editionId,
    eventType: "published",
    actorId: publishedBy,
    occurredAt: deps.clock.now(),
  });

  return saved;
}
