import {
  and,
  eq,
  workbookDrafts,
  workbookEditions,
  workbookPublicationEvents,
} from "@reading-advantage/db";
import type { WorkbookSourceRecord } from "./contracts.js";
import type { WorkbookDraft, WorkbookEdition } from "./edition-contracts.js";
import { WorkbookPublicationError, type WorkbookDraftStatus } from "./edition-state.js";
import type {
  WorkbookEditionRepositoryPort,
  WorkbookPublicationEvent,
} from "./edition-repository-port.js";

/**
 * Minimal structural type for the injected database handle.
 *
 * Kept structural so the domain layer never imports a concrete driver: only the
 * query-builder entry points used by this repository are exposed, and every
 * result is narrowed with casts because the concrete row types are unavailable
 * here.
 */
export interface WorkbookDrizzleDatabase {
  select: (...args: readonly unknown[]) => unknown;
  insert: (...args: readonly unknown[]) => unknown;
  update: (...args: readonly unknown[]) => unknown;
  transaction: <T>(fn: (tx: WorkbookDrizzleDatabase) => Promise<T>) => Promise<T>;
}

interface WorkbookDraftRow {
  id: string;
  tenantId: string;
  status: string;
  snapshotJson: unknown;
  revision: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkbookDraftInsertRow {
  id: string;
  tenantId: string;
  status: WorkbookDraftStatus;
  sourceApp: string;
  sourceId: string;
  sourceRevision: string;
  contentHash: string;
  snapshotJson: unknown;
  revision: number;
  createdBy: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

interface WorkbookEditionRow {
  id: string;
  draftId: string;
  tenantId: string;
  version: number;
  snapshotJson: unknown;
  contentHash: string;
  idempotencyKey: string;
  publishedBy: string;
  publishedAt: Date;
  supersededByEditionId: string | null;
  revokedAt: Date | null;
}

interface WorkbookPublicationEventRow {
  id: string;
  tenantId: string;
  draftId: string;
  editionId: string | null;
  eventType: string;
  actorId: string;
  occurredAt: Date;
}

interface WorkbookEditionInsertRow {
  draftId: string;
  tenantId: string;
  version: number;
  snapshotJson: unknown;
  contentHash: string;
  idempotencyKey: string;
  publishedBy: string;
  publishedAt: Date | string | null;
  supersededByEditionId: string | null;
  revokedAt: Date | string | null;
}

interface WorkbookPublicationEventInsertRow {
  tenantId: string;
  draftId: string;
  editionId: string | null;
  eventType: string;
  actorId: string;
  occurredAt: Date | string | null;
}

interface WorkbookDraftUpdateRow {
  status: WorkbookDraftStatus;
  revision: number;
  updatedAt: Date | string | null;
}

interface SelectBuilder<TRow> {
  from: (table: unknown) => {
    where: (condition: unknown) => Promise<TRow[]> & {
      limit: (max: number) => Promise<TRow[]>;
    };
  };
}

interface InsertBuilder<TInsert, TRow> {
  values: (values: TInsert) => {
    returning: () => Promise<TRow[]>;
  };
}

interface WorkbookDraftUpdateBuilder {
  set: (values: WorkbookDraftUpdateRow) => {
    where: (condition: unknown) => {
      returning: () => Promise<WorkbookDraftRow[]>;
    };
  };
}

/**
 * Converts an ISO-8601 timestamp from a domain contract into the Date the
 * Drizzle driver requires for timestamp columns.
 * @param value ISO-8601 timestamp string, or null for nullable columns.
 * @returns A Date for the driver, or null when the input was null.
 */
function toDbTimestamp(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

/**
 * Converts a timestamp value returned by the Drizzle driver back into the
 * ISO-8601 string carried by the domain contracts.
 * @param value Date returned by the driver, an already-ISO string, or null.
 * @returns ISO-8601 timestamp string, or null when the input was null.
 */
function fromDbTimestamp(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return typeof value === "string" ? value : value.toISOString();
}

function mapDraftRow(row: WorkbookDraftRow): WorkbookDraft {
  return {
    draftId: row.id,
    tenantId: row.tenantId,
    status: row.status as WorkbookDraftStatus,
    sourceRecord: row.snapshotJson as WorkbookSourceRecord,
    revision: row.revision,
    createdBy: row.createdBy,
    createdAt: fromDbTimestamp(row.createdAt) as string,
    updatedAt: fromDbTimestamp(row.updatedAt) as string,
  };
}

function mapEditionRow(row: WorkbookEditionRow): WorkbookEdition {
  return {
    editionId: row.id,
    draftId: row.draftId,
    tenantId: row.tenantId,
    version: row.version,
    snapshot: row.snapshotJson as WorkbookSourceRecord,
    contentHash: row.contentHash,
    publishedAt: fromDbTimestamp(row.publishedAt) as string,
    publishedBy: row.publishedBy,
    idempotencyKey: row.idempotencyKey,
    supersededByEditionId: row.supersededByEditionId ?? null,
    revokedAt: fromDbTimestamp(row.revokedAt),
  };
}

/**
 * Creates a Drizzle-backed implementation of the workbook edition repository.
 *
 * Every query is issued against the injected handle, which may be either a
 * top-level connection or a transaction handle supplied by a caller-supplied
 * `db.transaction(...)` callback. To publish a workbook atomically, wrap
 * appendEdition, updateDraftStatus and recordEvent inside ONE transaction by
 * building a repository bound to the transaction handle:
 *
 * await db.transaction(async (tx) => {
 *   const txRepository = createDrizzleEditionRepository(tx);
 *   await txRepository.appendEdition(edition);
 *   await txRepository.updateDraftStatus(tenantId, draftId, "published", expectedRevision);
 *   await txRepository.recordEvent(event);
 * });
 *
 * Editions are append-only rows that are never updated in place; stale-revision
 * status updates match no rows and raise "REVISION_CONFLICT".
 * @param db Structural database handle (or transaction handle) used for queries.
 * @returns A workbook edition repository bound to the supplied database handle.
 */
export function createDrizzleEditionRepository(
  db: WorkbookDrizzleDatabase,
): WorkbookEditionRepositoryPort {
  return {
    async createDraft(draft) {
      await (
        db.insert(workbookDrafts) as unknown as InsertBuilder<
          WorkbookDraftInsertRow,
          WorkbookDraftRow
        >
      )
        .values({
          id: draft.draftId,
          tenantId: draft.tenantId,
          status: draft.status,
          sourceApp: draft.sourceRecord.identity.sourceApp,
          sourceId: draft.sourceRecord.identity.sourceId,
          sourceRevision: draft.sourceRecord.identity.sourceRevision,
          contentHash: draft.sourceRecord.identity.contentHash,
          snapshotJson: draft.sourceRecord,
          revision: draft.revision,
          createdBy: draft.createdBy,
          createdAt: toDbTimestamp(draft.createdAt),
          updatedAt: toDbTimestamp(draft.updatedAt),
        })
        .returning();
      return draft;
    },

    async listDrafts(tenantId, limit) {
      const query = (
        db.select() as unknown as SelectBuilder<WorkbookDraftRow>
      )
        .from(workbookDrafts)
        .where(eq(workbookDrafts.tenantId, tenantId));
      const rows =
        limit === undefined ? await query : await query.limit(limit);
      return rows.map(mapDraftRow);
    },

    async getDraft(tenantId, draftId) {
      const rows = await (
        db.select() as unknown as SelectBuilder<WorkbookDraftRow>
      )
        .from(workbookDrafts)
        .where(
          and(
            eq(workbookDrafts.tenantId, tenantId),
            eq(workbookDrafts.id, draftId),
          ),
        );
      const row = rows[0];
      if (row === undefined) {
        return null;
      }
      return mapDraftRow(row);
    },

    async findEditionByIdempotencyKey(tenantId, idempotencyKey) {
      const rows = await (
        db.select() as unknown as SelectBuilder<WorkbookEditionRow>
      )
        .from(workbookEditions)
        .where(
          and(
            eq(workbookEditions.tenantId, tenantId),
            eq(workbookEditions.idempotencyKey, idempotencyKey),
          ),
        );
      const row = rows[0];
      if (row === undefined) {
        return null;
      }
      return mapEditionRow(row);
    },

    async nextEditionVersion(tenantId, draftId) {
      const rows = await (
        db.select() as unknown as SelectBuilder<WorkbookEditionRow>
      )
        .from(workbookEditions)
        .where(
          and(
            eq(workbookEditions.tenantId, tenantId),
            eq(workbookEditions.draftId, draftId),
          ),
        );
      return rows.length + 1;
    },

    async appendEdition(edition) {
      const inserted = await (
        db.insert(workbookEditions) as unknown as InsertBuilder<
          WorkbookEditionInsertRow,
          WorkbookEditionRow
        >
      )
        .values({
          draftId: edition.draftId,
          tenantId: edition.tenantId,
          version: edition.version,
          snapshotJson: edition.snapshot,
          contentHash: edition.contentHash,
          idempotencyKey: edition.idempotencyKey,
          publishedBy: edition.publishedBy,
          publishedAt: toDbTimestamp(edition.publishedAt),
          supersededByEditionId: edition.supersededByEditionId,
          revokedAt: toDbTimestamp(edition.revokedAt),
        })
        .returning();
      return mapEditionRow(inserted[0]);
    },

    async updateDraftStatus(
      tenantId,
      draftId,
      status,
      expectedRevision,
    ): Promise<WorkbookDraft> {
      const updated = await (
        db.update(workbookDrafts) as unknown as WorkbookDraftUpdateBuilder
      )
        .set({
          status,
          revision: expectedRevision + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workbookDrafts.id, draftId),
            eq(workbookDrafts.tenantId, tenantId),
            eq(workbookDrafts.revision, expectedRevision),
          ),
        )
        .returning();
      if (updated.length === 0) {
        throw new WorkbookPublicationError(
          "REVISION_CONFLICT",
          `Revision conflict: no draft matched for tenant "${tenantId}" and draft "${draftId}" at revision ${expectedRevision}.`,
        );
      }
      return mapDraftRow(updated[0]);
    },

    async recordEvent(event) {
      await (
        db.insert(workbookPublicationEvents) as unknown as InsertBuilder<
          WorkbookPublicationEventInsertRow,
          WorkbookPublicationEventRow
        >
      )
        .values({
          tenantId: event.tenantId,
          draftId: event.draftId,
          editionId: event.editionId,
          eventType: event.eventType,
          actorId: event.actorId,
          occurredAt: toDbTimestamp(event.occurredAt),
        })
        .returning();
    },
  };
}
