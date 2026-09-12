import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import type { WorkbookDraft, WorkbookEdition } from "../workbooks/edition-contracts.js";
import { WorkbookPublicationError } from "../workbooks/edition-state.js";
import { createInMemoryEditionRepository } from "../workbooks/in-memory-edition-repository.js";

const FIXED = "2026-08-04T10:00:00.000Z";

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
    draftId: "d1",
    tenantId: "t1",
    status: "draft",
    sourceRecord: createRecord(),
    revision: 3,
    createdBy: "editor",
    createdAt: FIXED,
    updatedAt: FIXED,
    ...o,
  };
}

const SETTINGS = {
  seriesName: "Reading Advantage",
  levelNumber: "Level 3",
  cefrLevel: "B1",
  type: "primary",
} as const;

describe("createInMemoryEditionRepository.updateDraftSettings / success", () => {
  it("replaces settings, bumps the revision, and stamps updatedAt", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    const updated = await repository.updateDraftSettings(
      "t1",
      "d1",
      3,
      SETTINGS,
      FIXED,
    );
    expect(updated.sourceRecord.settings).toEqual(SETTINGS);
    expect(updated.revision).toBe(4);
    expect(updated.updatedAt).toBe(FIXED);
  });

  it("replaces previously persisted settings", async () => {
    const { repository } = createInMemoryEditionRepository([
      createDraft({ sourceRecord: createRecord({ seriesName: "Old Series" }) }),
    ]);
    const updated = await repository.updateDraftSettings(
      "t1",
      "d1",
      3,
      SETTINGS,
      FIXED,
    );
    expect(updated.sourceRecord.settings).toEqual(SETTINGS);
  });

  it("leaves content, identity, and the content hash untouched", async () => {
    const original = createDraft();
    const { repository } = createInMemoryEditionRepository([original]);
    const updated = await repository.updateDraftSettings(
      "t1",
      "d1",
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

  it("persists the updated draft back into the store", async () => {
    const { store, repository } = createInMemoryEditionRepository([createDraft()]);
    await repository.updateDraftSettings("t1", "d1", 3, SETTINGS, FIXED);
    expect(store.drafts.get("t1:d1")?.sourceRecord.settings).toEqual(SETTINGS);
    expect(store.drafts.get("t1:d1")?.revision).toBe(4);
  });
});

describe("createInMemoryEditionRepository.updateDraftSettings / failures", () => {
  it("throws VALIDATION_ERROR for an unknown draft", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    const error = (await repository
      .updateDraftSettings("t1", "missing", 3, SETTINGS, FIXED)
      .catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("VALIDATION_ERROR");
  });

  it("scopes by tenant and never crosses a tenant boundary", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    const error = (await repository
      .updateDraftSettings("other-tenant", "d1", 3, SETTINGS, FIXED)
      .catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toContain("draft not found");
  });

  it("throws REVISION_CONFLICT for a stale expected revision", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    const error = (await repository
      .updateDraftSettings("t1", "d1", 2, SETTINGS, FIXED)
      .catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("REVISION_CONFLICT");
  });
});

describe("createInMemoryEditionRepository.appendEdition / drizzle parity", () => {
  /**
   * Builds an append-only workbook edition for parity tests.
   * @param o Overrides merged over the default edition fields.
   * @returns An edition at version 1 with a fixed idempotency key.
   */
  function createEdition(o: Partial<WorkbookEdition> = {}): WorkbookEdition {
    const record = createRecord();
    return {
      editionId: "22222222-2222-4222-8222-000000000001",
      draftId: "d1",
      tenantId: "t1",
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

  it("fails closed with NOT_FOUND when the edition's tenant does not own the draft", async () => {
    const { store, repository } = createInMemoryEditionRepository([
      createDraft(),
    ]);
    const foreignEdition = createEdition({
      editionId: "22222222-2222-4222-8222-333333333333",
      tenantId: "other-tenant",
      idempotencyKey: "idem-foreign",
    });

    const error = (await repository
      .appendEdition(foreignEdition)
      .catch((e: unknown) => e)) as WorkbookPublicationError;

    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect(error.code).toBe("NOT_FOUND");
    expect(store.editions).toHaveLength(0);
    expect(await repository.listEditions("other-tenant")).toHaveLength(0);
  });

  it("stores the caller-supplied editionId and resolves supersededByEditionId through listEditions", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    const v1 = createEdition({
      editionId: "22222222-2222-4222-8222-111111111111",
    });
    const v2 = createEdition({
      editionId: "22222222-2222-4222-8222-222222222222",
      version: 2,
      idempotencyKey: "idem-2",
      supersededByEditionId: v1.editionId,
    });

    await repository.appendEdition(v1);
    await repository.appendEdition(v2);

    const editions = await repository.listEditions("t1");
    expect(editions.find((e) => e.editionId === v1.editionId)).toBeDefined();
    const superseding = editions.find((e) => e.editionId === v2.editionId);
    expect(superseding?.supersededByEditionId).toBe(v1.editionId);
  });
});
