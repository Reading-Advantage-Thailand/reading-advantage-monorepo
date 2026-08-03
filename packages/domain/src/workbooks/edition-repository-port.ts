import { z } from "zod";
import type { WorkbookSourceRecord } from "./contracts.js";
import type {
  WorkbookDraft,
  WorkbookEdition,
  WorkbookPublicationRequest,
} from "./edition-contracts.js";
import type { WorkbookDraftStatus } from "./edition-state.js";

/** Legal audit event types recorded against workbook drafts and editions. */
export const workbookPublicationEventTypeSchema = z.enum([
  "draft_created",
  "submitted_for_review",
  "returned_to_draft",
  "published",
  "superseded",
  "revoked",
]);

/** Concrete audit event type recorded against a workbook draft or edition. */
export type WorkbookPublicationEventType = z.infer<
  typeof workbookPublicationEventTypeSchema
>;

/** Persisted shape of an immutable publication audit event. */
export const workbookPublicationEventSchema = z
  .object({
    eventId: z.string().min(1),
    tenantId: z.string().min(1),
    draftId: z.string().min(1),
    editionId: z.string().min(1).nullable(),
    eventType: workbookPublicationEventTypeSchema,
    actorId: z.string().min(1),
    occurredAt: z.string().datetime(),
  })
  .strict();

/** Concrete persisted shape of a publication audit event. */
export type WorkbookPublicationEvent = z.infer<
  typeof workbookPublicationEventSchema
>;

/**
 * Transport- and database-independent persistence boundary for workbook drafts
 * and immutable editions.
 *
 * Implementations MUST run appendEdition, updateDraftStatus and recordEvent
 * inside ONE transaction so a publication is applied atomically, and MUST treat
 * editions as append-only records that are never updated in place.
 */
export interface WorkbookEditionRepositoryPort {
  /**
   * Persists a newly created draft.
   * @param draft Draft to insert.
   * @returns The persisted draft.
   * @throws When a draft with the same tenant and identifier already exists.
   */
  createDraft(draft: WorkbookDraft): Promise<WorkbookDraft>;

  /**
   * Lists drafts for a tenant.
   * @param tenantId Tenant the drafts belong to.
   * @param limit Optional maximum number of drafts to return.
   * @returns The tenant's drafts; results are tenant-scoped and never cross a
   * tenant boundary.
   */
  listDrafts(
    tenantId: string,
    limit?: number,
  ): Promise<readonly WorkbookDraft[]>;

  /**
   * Reads one draft by tenant and draft identifier.
   * @param tenantId Tenant the draft belongs to.
   * @param draftId Identifier of the draft to read.
   * @returns The matching draft, or null when none exists.
   */
  getDraft(
    tenantId: string,
    draftId: string,
  ): Promise<WorkbookDraft | null>;

  /**
   * Lists immutable editions published for a tenant.
   * @param tenantId Tenant the editions belong to.
   * @param limit Optional maximum number of editions to return.
   * @returns The tenant's editions; results are tenant-scoped and never cross a
   * tenant boundary.
   */
  listEditions(
    tenantId: string,
    limit?: number,
  ): Promise<readonly WorkbookEdition[]>;

  /**
   * Finds an edition previously appended for the given idempotency key.
   * @param tenantId Tenant the edition belongs to.
   * @param idempotencyKey Key identifying the original publication request.
   * @returns The matching edition, or null when none exists.
   */
  findEditionByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<WorkbookEdition | null>;

  /**
   * Computes the next edition version for a draft, based on prior editions.
   * @param tenantId Tenant the draft belongs to.
   * @param draftId Identifier of the draft being versioned.
   * @returns The next sequential version number (1 for the first edition).
   */
  nextEditionVersion(tenantId: string, draftId: string): Promise<number>;

  /**
   * Appends a new immutable edition snapshot.
   * @param edition Edition to append.
   * @returns The persisted edition.
   */
  appendEdition(edition: WorkbookEdition): Promise<WorkbookEdition>;

  /**
   * Updates a draft's lifecycle status with optimistic revision control.
   * @param tenantId Tenant the draft belongs to.
   * @param draftId Identifier of the draft to update.
   * @param status New lifecycle status for the draft.
   * @param expectedRevision Revision the caller expected at request time.
   * @returns The persisted draft after the update.
   */
  updateDraftStatus(
    tenantId: string,
    draftId: string,
    status: WorkbookDraftStatus,
    expectedRevision: number,
  ): Promise<WorkbookDraft>;

  /**
   * Replaces a draft's source record content with optimistic revision control.
   * @param tenantId Tenant the draft belongs to.
   * @param draftId Identifier of the draft to update.
   * @param sourceRecord New source record replacing the draft's current one.
   * @param expectedRevision Revision the caller expected at request time.
   * @returns The persisted draft with the replaced content and a bumped revision.
   * @throws WorkbookPublicationError with code "REVISION_CONFLICT" when no draft
   * matches the tenant, draft, and expected revision combination.
   */
  updateDraftContent(
    tenantId: string,
    draftId: string,
    sourceRecord: WorkbookSourceRecord,
    expectedRevision: number,
  ): Promise<WorkbookDraft>;

  /**
   * Appends an immutable publication audit event.
   * @param event Audit event to record.
   * @returns Nothing once the event is durably stored.
   */
  recordEvent(event: WorkbookPublicationEvent): Promise<void>;
}

/**
 * Supplies the current time as an ISO-8601 timestamp.
 * It exists so publication timing is deterministic under test.
 */
export interface WorkbookClock {
  /**
   * Returns the current time as an ISO-8601 timestamp.
   * @returns ISO-8601 timestamp representing the current moment.
   */
  now(): string;
}
