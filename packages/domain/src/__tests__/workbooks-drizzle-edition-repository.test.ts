import { eq } from "drizzle-orm";
import {
  workbookDrafts,
  workbookEditions,
  workbookPublicationEvents,
} from "@reading-advantage/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import {
  createDrizzleEditionRepository,
  type WorkbookDrizzleDatabase,
} from "../workbooks/drizzle-edition-repository.js";
import type { WorkbookDraft, WorkbookEdition } from "../workbooks/edition-contracts.js";
import { WorkbookPublicationError } from "../workbooks/edition-state.js";
import { createTestDb, type TestDb } from "./helpers/testDb.js";

const FIXED = "2026-08-04T10:00:00.000Z";
const TENANT = "t1";
const DRAFT_ID = "11111111-1111-4111-8111-111111111111";

const SETTINGS = {
  seriesName: "Reading Advantage",
  levelNumber: "Level 3",
  cefrLevel: "B1",
  type: "primary",
} as const;

/**
 * Builds a valid workbook source record for repository tests.
 * @param settings Optional project settings carried on the record.
 * @returns A source record whose contentHash matches the digest of its content.
 */
function createRecord(settings?: WorkbookSourceRecord["settings"]): WorkbookSourceRecord {
  const content = {
    title: "Original title",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "Original paragraph." }],
    questions: [],
    assets: [],
  };
  return {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: "src-1",
      sourceRevision: "rev-1",
      contentHash: computeWorkbookDigest(content),
    },
    content,
    ...(settings === undefined ? {} : { settings }),
  };
}

/**
 * Builds a draft with a known source record for repository tests.
 * @param o Overrides merged over the default draft fields.
 * @returns A draft in the "draft" state at revision 3.
 */
function createDraft(o: Partial<WorkbookDraft> = {}): WorkbookDraft {
  return {
    draftId: DRAFT_ID,
    tenantId: TENANT,
    status: "draft",
    sourceRecord: createRecord(),
    revision: 3,
    createdBy: "editor",
    createdAt: FIXED,
    updatedAt: FIXED,
    ...o,
  };
}

/**
 * Builds an append-only workbook edition for repository tests.
 * @param o Overrides merged over the default edition fields.
 * @returns An edition at version 1 with a fixed idempotency key.
 */
function createEdition(o: Partial<WorkbookEdition> = {}): WorkbookEdition {
  const record = createRecord();
  return {
    editionId: "22222222-2222-4222-8222-000000000001",
    draftId: DRAFT_ID,
    tenantId: TENANT,
    version: 1,
    snapshot: record,
    contentHash: record.identity.contentHash,
    publishedAt: FIXED,
    publishedBy: "editor",
    idempotencyKey: "idem-1",
    supersededByEditionId: null,
    revokedAt: null,
    ...o,
  };
}

async function readStoredRow(
  harness: TestDb,
  draftId: string,
): Promise<{
  snapshotJson: WorkbookSourceRecord;
  revision: number;
  sourceApp: string;
  sourceId: string;
  sourceRevision: string;
  contentHash: string;
}> {
  const rows = await harness.db
    .select({
      snapshotJson: workbookDrafts.snapshotJson,
      revision: workbookDrafts.revision,
      sourceApp: workbookDrafts.sourceApp,
      sourceId: workbookDrafts.sourceId,
      sourceRevision: workbookDrafts.sourceRevision,
      contentHash: workbookDrafts.contentHash,
    })
    .from(workbookDrafts)
    .where(eq(workbookDrafts.id, draftId));
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`no workbook_drafts row for "${draftId}"`);
  }
  return row as unknown as {
    snapshotJson: WorkbookSourceRecord;
    revision: number;
    sourceApp: string;
    sourceId: string;
    sourceRevision: string;
    contentHash: string;
  };
}

describe("createDrizzleEditionRepository.updateDraftSettings / live DB", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  }, 60_000);

  it("replaces settings, bumps the revision, and stamps updatedAt", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const updated = await repository.updateDraftSettings(
      TENANT,
      DRAFT_ID,
      3,
      SETTINGS,
      FIXED,
    );

    expect(updated.sourceRecord.settings).toEqual(SETTINGS);
    expect(updated.revision).toBe(4);
    expect(updated.updatedAt).toBe(FIXED);
  });

  it("replaces previously persisted settings", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(
      createDraft({ sourceRecord: createRecord({ seriesName: "Old Series" }) }),
    );

    const updated = await repository.updateDraftSettings(
      TENANT,
      DRAFT_ID,
      3,
      SETTINGS,
      FIXED,
    );

    expect(updated.sourceRecord.settings).toEqual(SETTINGS);
  });

  it("leaves content, identity, and the content hash untouched", async () => {
    const original = createDraft();
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(original);

    const updated = await repository.updateDraftSettings(
      TENANT,
      DRAFT_ID,
      3,
      SETTINGS,
      FIXED,
    );

    expect(updated.sourceRecord.content).toEqual(original.sourceRecord.content);
    expect(updated.sourceRecord.identity).toEqual(original.sourceRecord.identity);
    expect(updated.sourceRecord.identity.contentHash).toBe(
      original.sourceRecord.identity.contentHash,
    );
  });

  it("persists the updated snapshot and revision into the database row", async () => {
    const original = createDraft();
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(original);

    await repository.updateDraftSettings(TENANT, DRAFT_ID, 3, SETTINGS, FIXED);

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.snapshotJson.settings).toEqual(SETTINGS);
    expect(stored.snapshotJson.content).toEqual(original.sourceRecord.content);
    expect(stored.snapshotJson.identity).toEqual(original.sourceRecord.identity);
    expect(stored.revision).toBe(4);
    expect(stored.sourceApp).toBe(original.sourceRecord.identity.sourceApp);
    expect(stored.sourceId).toBe(original.sourceRecord.identity.sourceId);
    expect(stored.sourceRevision).toBe(
      original.sourceRecord.identity.sourceRevision,
    );
    expect(stored.contentHash).toBe(original.sourceRecord.identity.contentHash);
  });

  it("throws REVISION_CONFLICT for a stale expected revision and leaves the row unchanged", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const error = (await repository
      .updateDraftSettings(TENANT, DRAFT_ID, 2, SETTINGS, FIXED)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error.code).toBe("REVISION_CONFLICT");

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(3);
    expect(stored.snapshotJson.settings).toBeUndefined();
  });

  it("throws REVISION_CONFLICT for an unknown draft", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const error = (await repository
      .updateDraftSettings(
        TENANT,
        "22222222-2222-4222-8222-222222222222",
        3,
        SETTINGS,
        FIXED,
      )
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error.code).toBe("REVISION_CONFLICT");
  });

  it("scopes by tenant and never crosses a tenant boundary", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const error = (await repository
      .updateDraftSettings("other-tenant", DRAFT_ID, 3, SETTINGS, FIXED)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error.code).toBe("REVISION_CONFLICT");

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(3);
    expect(stored.snapshotJson.settings).toBeUndefined();
  });

  it("uses the caller-supplied updatedAt rather than the wall clock", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const updated = await repository.updateDraftSettings(
      TENANT,
      DRAFT_ID,
      3,
      SETTINGS,
      "2025-01-02T03:04:05.000Z",
    );

    expect(updated.updatedAt).toBe("2025-01-02T03:04:05.000Z");
  });

  it("releases school-tenant auto-scoping before updating", async () => {
    const handle = harness.db as unknown as WorkbookDrizzleDatabase;
    const reasons: string[] = [];
    const tenantScoped: WorkbookDrizzleDatabase = {
      ...handle,
      unscoped: (reason: string) => {
        reasons.push(reason);
        return handle;
      },
    };
    const repository = createDrizzleEditionRepository(tenantScoped);
    await repository.createDraft(createDraft());

    await repository.updateDraftSettings(TENANT, DRAFT_ID, 3, SETTINGS, FIXED);

    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/tenant_id/);
  });

  it("keeps tenant and draft identifiers out of conflict messages but retains them in detail", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const error = (await repository
      .updateDraftSettings("secret-tenant", DRAFT_ID, 3, SETTINGS, FIXED)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error.code).toBe("REVISION_CONFLICT");
    expect(error.message).not.toContain("secret-tenant");
    expect(error.message).not.toContain(DRAFT_ID);
    expect(error.detail).toContain("secret-tenant");
    expect(error.detail).toContain(DRAFT_ID);
  });

  it("keeps identifiers out of status and content update conflict messages", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const statusError = (await repository
      .updateDraftStatus("secret-tenant", DRAFT_ID, "in_review", 3)
      .catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(statusError.code).toBe("REVISION_CONFLICT");
    expect(statusError.message).not.toContain("secret-tenant");
    expect(statusError.message).not.toContain(DRAFT_ID);
    expect(statusError.detail).toContain("secret-tenant");
    expect(statusError.detail).toContain(DRAFT_ID);

    const contentError = (await repository
      .updateDraftContent("secret-tenant", DRAFT_ID, createRecord(), 3)
      .catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(contentError.code).toBe("REVISION_CONFLICT");
    expect(contentError.message).not.toContain("secret-tenant");
    expect(contentError.message).not.toContain(DRAFT_ID);
    expect(contentError.detail).toContain("secret-tenant");
    expect(contentError.detail).toContain(DRAFT_ID);
  });
});

describe("createDrizzleEditionRepository.appendEdition / live DB", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  }, 60_000);

  it("maps a concurrent double-append on the same draft and version to IDEMPOTENCY_CONFLICT", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const edition = createEdition();

    const results = await Promise.allSettled([
      repository.appendEdition({ ...edition }),
      repository.appendEdition({ ...edition }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(rejected).toHaveLength(1);
    const error = rejected[0].reason;
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("IDEMPOTENCY_CONFLICT");
    expect((error as Error).message).not.toContain("23505");
  });
});

describe("createDrizzleEditionRepository / rollback, append-only history, write tenant isolation / live DB", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  }, 60_000);

  it("rolls back append + status + event when a later transaction step throws", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const edition = createEdition({
      editionId: "22222222-2222-4222-8222-555555555555",
    });

    const outcome = await harness.db
      .transaction(async (tx) => {
        const txRepository = createDrizzleEditionRepository(
          tx as unknown as WorkbookDrizzleDatabase,
        );
        await txRepository.appendEdition(edition);
        await txRepository.updateDraftStatus(TENANT, DRAFT_ID, "published", 3);
        await txRepository.recordEvent({
          eventId: "evt-1",
          tenantId: TENANT,
          draftId: DRAFT_ID,
          editionId: edition.editionId,
          eventType: "published",
          actorId: "editor",
          occurredAt: FIXED,
        });
        throw new Error("sentinel");
      })
      .then(
        () => "committed",
        (error: unknown) => error,
      );

    expect(outcome).toBeInstanceOf(Error);
    expect((outcome as Error).message).toBe("sentinel");

    const editions = await harness.db.select().from(workbookEditions);
    const events = await harness.db.select().from(workbookPublicationEvents);
    expect(editions).toHaveLength(0);
    expect(events).toHaveLength(0);

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(3);
  });

  it("leaves nothing committed when the second write inside the documented transaction fails", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const edition = createEdition({
      editionId: "22222222-2222-4222-8222-666666666666",
    });

    const outcome = await harness.db
      .transaction(async (tx) => {
        const txRepository = createDrizzleEditionRepository(
          tx as unknown as WorkbookDrizzleDatabase,
        );
        await txRepository.appendEdition(edition);
        await txRepository.updateDraftStatus(TENANT, DRAFT_ID, "published", 999);
      })
      .then(
        () => "committed",
        (error: unknown) => error,
      );

    expect(outcome).toBeInstanceOf(WorkbookPublicationError);
    expect((outcome as WorkbookPublicationError).code).toBe("REVISION_CONFLICT");

    const editions = await harness.db.select().from(workbookEditions);
    const events = await harness.db.select().from(workbookPublicationEvents);
    expect(editions).toHaveLength(0);
    expect(events).toHaveLength(0);

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(3);
    expect(stored.snapshotJson.content.title).toBe("Original title");
  });

  it("exposes no update or delete method for editions on the repository port", () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );

    expect(Object.keys(repository).sort()).toEqual([
      "appendEdition",
      "createDraft",
      "findEditionByIdempotencyKey",
      "getDraft",
      "listDrafts",
      "listEditions",
      "nextEditionVersion",
      "recordEvent",
      "updateDraftContent",
      "updateDraftSettings",
      "updateDraftStatus",
    ]);
  });

  it("preserves the full v1 edition row and its snapshot when superseded", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const v1 = createEdition({
      editionId: "22222222-2222-4222-8222-111111111111",
    });
    const v2 = createEdition({
      editionId: "22222222-2222-4222-8222-222222222222",
      version: 2,
      idempotencyKey: "idem-2",
      supersededByEditionId: v1.editionId,
    });

    await harness.db.transaction(async (tx) => {
      const txRepository = createDrizzleEditionRepository(
        tx as unknown as WorkbookDrizzleDatabase,
      );
      await txRepository.appendEdition(v1);
      await txRepository.updateDraftStatus(TENANT, DRAFT_ID, "published", 3);
      await txRepository.appendEdition(v2);
      await txRepository.updateDraftStatus(TENANT, DRAFT_ID, "superseded", 4);
    });

    const rows = await harness.db
      .select()
      .from(workbookEditions)
      .orderBy(workbookEditions.version);
    expect(rows).toHaveLength(2);
    // Postgres JSONB normalizes object key order, so the snapshot is compared
    // structurally rather than as raw bytes.
    expect(rows[0].snapshotJson).toEqual(v1.snapshot);
    expect(rows[0].contentHash).toBe(v1.contentHash);
    expect(rows[0].version).toBe(1);
    expect(rows[0].supersededByEditionId).toBeNull();

    expect(rows[1].version).toBe(2);

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(5);
  });

  it("persists the caller-supplied editionId as the row id so supersededByEditionId resolves", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const v1 = createEdition({
      editionId: "22222222-2222-4222-8222-111111111111",
    });
    const v2 = createEdition({
      editionId: "22222222-2222-4222-8222-222222222222",
      version: 2,
      idempotencyKey: "idem-2",
      supersededByEditionId: v1.editionId,
    });

    await harness.db.transaction(async (tx) => {
      const txRepository = createDrizzleEditionRepository(
        tx as unknown as WorkbookDrizzleDatabase,
      );
      await txRepository.appendEdition(v1);
      await txRepository.appendEdition(v2);
    });

    const rows = await harness.db
      .select()
      .from(workbookEditions)
      .orderBy(workbookEditions.version);
    expect(rows).toHaveLength(2);
    // The row id is the caller-supplied editionId, so the supersededByEditionId
    // link resolves to the superseded row instead of dangling.
    expect(rows[0].id).toBe(v1.editionId);
    expect(rows[1].supersededByEditionId).toBe(rows[0].id);

    // listEditions maps the row id back into the domain editionId, so the link
    // also resolves through the repository read path.
    const editions = await repository.listEditions(TENANT);
    const superseding = editions.find((e) => e.editionId === v2.editionId);
    expect(superseding).toBeDefined();
    expect(superseding?.supersededByEditionId).toBe(v1.editionId);
    expect(editions.find((e) => e.editionId === v1.editionId)).toBeDefined();
  });

  it("preserves the full edition row and its snapshot when revoked", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const edition = createEdition({
      editionId: "22222222-2222-4222-8222-444444444444",
      revokedAt: FIXED,
    });

    await harness.db.transaction(async (tx) => {
      const txRepository = createDrizzleEditionRepository(
        tx as unknown as WorkbookDrizzleDatabase,
      );
      await txRepository.appendEdition(edition);
      await txRepository.updateDraftStatus(TENANT, DRAFT_ID, "revoked", 3);
    });

    const rows = await harness.db
      .select()
      .from(workbookEditions)
      .orderBy(workbookEditions.version);
    expect(rows).toHaveLength(1);
    expect(rows[0].snapshotJson).toEqual(edition.snapshot);
    expect(rows[0].contentHash).toBe(edition.contentHash);
    expect(rows[0].revokedAt).not.toBeNull();

    const editions = await repository.listEditions(TENANT);
    expect(editions).toHaveLength(1);
    expect(editions[0].revokedAt).toBe(FIXED);
    expect(editions[0].snapshot).toEqual(edition.snapshot);

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(4);
  });

  it("fails closed for a cross-tenant updateDraftStatus and leaves the row untouched", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const error = (await repository
      .updateDraftStatus("other-tenant", DRAFT_ID, "in_review", 3)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error.code).toBe("REVISION_CONFLICT");

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(3);
    expect(stored.snapshotJson.content.title).toBe("Original title");
  });

  it("fails closed for a cross-tenant updateDraftContent and leaves the row untouched", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());

    const error = (await repository
      .updateDraftContent("other-tenant", DRAFT_ID, createRecord(), 3)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error.code).toBe("REVISION_CONFLICT");

    const stored = await readStoredRow(harness, DRAFT_ID);
    expect(stored.revision).toBe(3);
    expect(stored.snapshotJson.content.title).toBe("Original title");
  });

  it("fails closed when an edition's tenant does not own the draft and persists nothing", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const foreignEdition = createEdition({
      editionId: "22222222-2222-4222-8222-333333333333",
      tenantId: "other-tenant",
      idempotencyKey: "idem-foreign",
    });

    const error = (await repository
      .appendEdition(foreignEdition)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    // A foreign draft is indistinguishable from a missing one: the guard
    // raises NOT_FOUND and keeps identifiers out of the message.
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).not.toContain("other-tenant");
    expect(error.message).not.toContain(DRAFT_ID);

    const rows = await harness.db.select().from(workbookEditions);
    expect(rows).toHaveLength(0);

    const ownerEditions = await repository.listEditions(TENANT);
    expect(ownerEditions).toHaveLength(0);
    const foreignEditions = await repository.listEditions("other-tenant");
    expect(foreignEditions).toHaveLength(0);
  });

  it("fails closed with NOT_FOUND when the draft does not exist at all", async () => {
    const repository = createDrizzleEditionRepository(
      harness.db as unknown as WorkbookDrizzleDatabase,
    );
    await repository.createDraft(createDraft());
    const edition = createEdition({
      editionId: "22222222-2222-4222-8222-777777777777",
      draftId: "22222222-2222-4222-8222-888888888888",
      idempotencyKey: "idem-unknown",
    });

    const error = (await repository
      .appendEdition(edition)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect(error.code).toBe("NOT_FOUND");

    const rows = await harness.db.select().from(workbookEditions);
    expect(rows).toHaveLength(0);
  });
});
