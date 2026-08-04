import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import type { WorkbookDraft } from "../workbooks/edition-contracts.js";
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
