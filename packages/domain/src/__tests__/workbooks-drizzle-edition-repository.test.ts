import { eq } from "drizzle-orm";
import { workbookDrafts } from "@reading-advantage/db";
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
    editionId: "edition-1",
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
  }, 60_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  });

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
  }, 60_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  });

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
