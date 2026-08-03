import { WorkbookPublicationError } from "./edition-state.js";
import type {
  WorkbookDraft,
  WorkbookEdition,
} from "./edition-contracts.js";
import type {
  WorkbookEditionRepositoryPort,
  WorkbookPublicationEvent,
} from "./edition-repository-port.js";

/**
 * Mutable state backing an in-memory workbook edition repository, exposed so
 * tests can seed fixtures and assert on repository behavior.
 */
export interface InMemoryWorkbookEditionStore {
  /** Drafts keyed by `${tenantId}:${draftId}`. */
  drafts: Map<string, WorkbookDraft>;
  /** Append-only list of immutable published edition snapshots. */
  editions: WorkbookEdition[];
  /** Append-only list of recorded publication audit events. */
  events: WorkbookPublicationEvent[];
}

/** Returns the store key used to index a draft by tenant and draft identifier. */
function draftKey(tenantId: string, draftId: string): string {
  return `${tenantId}:${draftId}`;
}

/**
 * Creates a database-free in-memory implementation of the workbook edition
 * repository, suitable for unit tests and local development.
 *
 * Editions are treated as append-only records that are never mutated in place;
 * draft status updates return a brand-new draft object. All methods are
 * asynchronous to satisfy the repository port's contract.
 * @param seedDrafts Optional drafts to pre-populate the store with.
 * @returns The mutable store (for assertions) and the repository implementation
 * (for injection into publication commands).
 */
export function createInMemoryEditionRepository(
  seedDrafts?: readonly WorkbookDraft[],
): {
  store: InMemoryWorkbookEditionStore;
  repository: WorkbookEditionRepositoryPort;
} {
  const store: InMemoryWorkbookEditionStore = {
    drafts: new Map(),
    editions: [],
    events: [],
  };

  if (seedDrafts) {
    for (const draft of seedDrafts) {
      store.drafts.set(draftKey(draft.tenantId, draft.draftId), draft);
    }
  }

  const repository: WorkbookEditionRepositoryPort = {
    async createDraft(draft) {
      const key = draftKey(draft.tenantId, draft.draftId);
      if (store.drafts.has(key)) {
        throw new WorkbookPublicationError(
          "VALIDATION_ERROR",
          "a draft with this identifier already exists",
        );
      }
      store.drafts.set(key, draft);
      return draft;
    },

    async listDrafts(tenantId, limit) {
      const drafts = [...store.drafts.values()].filter(
        (draft) => draft.tenantId === tenantId,
      );
      return limit === undefined ? drafts : drafts.slice(0, limit);
    },

    async getDraft(tenantId, draftId) {
      return store.drafts.get(draftKey(tenantId, draftId)) ?? null;
    },

    async findEditionByIdempotencyKey(tenantId, idempotencyKey) {
      const edition = store.editions.find(
        (candidate) =>
          candidate.tenantId === tenantId &&
          candidate.idempotencyKey === idempotencyKey,
      );
      return edition ?? null;
    },

    async nextEditionVersion(tenantId, draftId) {
      const existing = store.editions.filter(
        (edition) =>
          edition.tenantId === tenantId && edition.draftId === draftId,
      );
      return existing.length + 1;
    },

    async appendEdition(edition) {
      const idempotencyConflict = store.editions.some(
        (candidate) =>
          candidate.tenantId === edition.tenantId &&
          candidate.idempotencyKey === edition.idempotencyKey,
      );
      if (idempotencyConflict) {
        throw new WorkbookPublicationError(
          "IDEMPOTENCY_CONFLICT",
          `Idempotency key "${edition.idempotencyKey}" has already been used for tenant "${edition.tenantId}".`,
        );
      }
      const revisionConflict = store.editions.some(
        (candidate) =>
          candidate.tenantId === edition.tenantId &&
          candidate.draftId === edition.draftId &&
          candidate.version === edition.version,
      );
      if (revisionConflict) {
        throw new WorkbookPublicationError(
          "REVISION_CONFLICT",
          `Edition version ${edition.version} already exists for draft "${edition.draftId}" of tenant "${edition.tenantId}".`,
        );
      }
      const frozen = Object.freeze({ ...edition });
      store.editions.push(frozen);
      return frozen;
    },

    async updateDraftStatus(
      tenantId,
      draftId,
      status,
      expectedRevision,
    ): Promise<WorkbookDraft> {
      const existing = store.drafts.get(draftKey(tenantId, draftId));
      if (existing === undefined) {
        throw new WorkbookPublicationError(
          "VALIDATION_ERROR",
          "draft not found",
          { detail: "draft not found" },
        );
      }
      if (existing.revision !== expectedRevision) {
        throw new WorkbookPublicationError(
          "REVISION_CONFLICT",
          `Revision conflict: actual revision ${existing.revision} does not match expected revision ${expectedRevision}.`,
        );
      }
      const updated: WorkbookDraft = {
        ...existing,
        status,
        revision: existing.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.drafts.set(draftKey(tenantId, draftId), updated);
      return updated;
    },

    async recordEvent(event) {
      store.events.push(event);
    },
  };

  return { store, repository };
}
