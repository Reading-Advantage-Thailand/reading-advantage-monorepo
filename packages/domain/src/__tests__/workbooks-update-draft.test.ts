import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import {
  updateWorkbookDraft,
  type UpdateWorkbookDraftDependencies,
  type WorkbookDraftUpdateRequest,
} from "../workbooks/update-draft.js";
import { WorkbookPublicationError } from "../workbooks/edition-state.js";
import type {
  WorkbookClock,
  WorkbookEditionRepositoryPort,
} from "../workbooks/edition-repository-port.js";
import type { WorkbookDraft } from "../workbooks/edition-contracts.js";

const FIXED = "2026-08-03T10:00:00.000Z";

/**
 * Builds valid normalized workbook content for update tests.
 * @returns Content whose paragraphs and questions satisfy the normalized schema.
 */
function createContent() {
  return {
    title: "Updated title",
    cefrLevel: "B1",
    paragraphs: [{ order: 0, text: "First paragraph." }],
    questions: [
      {
        questionId: "q-1",
        prompt: "What happened first?",
        questionType: "multiple-choice",
        choices: ["A", "B"],
      },
    ],
    assets: [],
  };
}

/**
 * Builds a draft with a known source record for update tests.
 * @param o Overrides merged over the default draft fields.
 * @returns A draft in the "draft" state at revision 3.
 */
function createDraft(o: Partial<WorkbookDraft> = {}): WorkbookDraft {
  const content = {
    title: "Original title",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "Original paragraph." }],
    questions: [],
    assets: [],
  };
  const record: WorkbookSourceRecord = {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: "src-1",
      sourceRevision: "rev-1",
      contentHash: computeWorkbookDigest(content),
    },
    content,
  };
  return {
    draftId: "d1",
    tenantId: "t1",
    status: "draft",
    sourceRecord: record,
    revision: 3,
    createdBy: "editor",
    createdAt: FIXED,
    updatedAt: FIXED,
    ...o,
  };
}

/**
 * Builds an in-memory repository recording every call it receives.
 * @param draft Draft returned by getDraft and updateDraftContent.
 * @returns The recorded calls and the repository implementation.
 */
function createFakeRepository(draft: WorkbookDraft): {
  calls: string[];
  saved: WorkbookDraft | null;
  repository: WorkbookEditionRepositoryPort;
} {
  const calls: string[] = [];
  const saved: { draft: WorkbookDraft | null } = { draft: null };
  const repository: WorkbookEditionRepositoryPort = {
    getDraft: async (tenantId, draftId) => {
      calls.push("getDraft");
      if (tenantId === draft.tenantId && draftId === draft.draftId) {
        return draft;
      }
      return null;
    },
    updateDraftContent: async (tenantId, draftId, sourceRecord, expectedRevision) => {
      calls.push("updateDraftContent");
      const updated: WorkbookDraft = {
        ...draft,
        sourceRecord,
        revision: expectedRevision + 1,
        updatedAt: FIXED,
      };
      saved.draft = updated;
      return updated;
    },
  };
  return {
    calls,
    get saved(): WorkbookDraft | null {
      return saved.draft;
    },
    repository,
  };
}

/**
 * Builds the dependencies required to update a workbook draft.
 * @param repository Repository used as the persistence boundary.
 * @returns Dependencies with a fixed clock.
 */
function createDeps(repository: WorkbookEditionRepositoryPort): UpdateWorkbookDraftDependencies {
  return { repository, clock: { now: () => FIXED } as WorkbookClock };
}

const BASE: WorkbookDraftUpdateRequest = {
  draftId: "d1",
  tenantId: "t1",
  expectedRevision: 3,
  content: createContent(),
};

describe("updateWorkbookDraft / success", () => {
  it("returns the draft with revision bumped by one", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraft(BASE, createDeps(fake.repository));
    expect(updated.revision).toBe(4);
    expect(updated.draftId).toBe("d1");
  });

  it("replaces the content and recomputes the content digest", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraft(BASE, createDeps(fake.repository));
    expect(updated.sourceRecord.content.title).toBe("Updated title");
    expect(updated.sourceRecord.identity.contentHash).toBe(
      computeWorkbookDigest(createContent()),
    );
  });

  it("preserves the source identity from the existing draft", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraft(BASE, createDeps(fake.repository));
    expect(updated.sourceRecord.identity.sourceApp).toBe("reading-advantage");
    expect(updated.sourceRecord.identity.sourceId).toBe("src-1");
    expect(updated.sourceRecord.identity.sourceRevision).toBe("rev-1");
  });

  it("updates updatedAt to the clock time", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraft(BASE, createDeps(fake.repository));
    expect(updated.updatedAt).toBe(FIXED);
  });

  it("persists through repository.updateDraftContent with the expected revision", async () => {
    const fake = createFakeRepository(createDraft());
    await updateWorkbookDraft(BASE, createDeps(fake.repository));
    expect(fake.calls).toEqual(["getDraft", "updateDraftContent"]);
    expect(fake.saved?.sourceRecord.content.title).toBe("Updated title");
    expect(fake.saved?.revision).toBe(4);
  });

  it("preserves existing settings on the source record", async () => {
    const settings = {
      seriesName: "Reading Advantage",
      levelNumber: "Level 3",
      cefrLevel: "B1",
      type: "primary",
    } as const;
    const existing = createDraft({
      sourceRecord: {
        ...createDraft().sourceRecord,
        settings: { ...settings },
      },
    });
    const fake = createFakeRepository(existing);
    const updated = await updateWorkbookDraft(BASE, createDeps(fake.repository));
    expect(updated.sourceRecord.settings).toEqual(settings);
    expect(fake.saved?.sourceRecord.settings).toEqual(settings);
    expect(updated.sourceRecord.content.title).toBe("Updated title");
    expect(updated.sourceRecord.identity.contentHash).toBe(
      computeWorkbookDigest(createContent()),
    );
  });
});

describe("updateWorkbookDraft / failures", () => {
  it("rejects a request that fails validation", async () => {
    const fake = createFakeRepository(createDraft());
    await expect(
      updateWorkbookDraft(
        { ...BASE, expectedRevision: -1 },
        createDeps(fake.repository),
      ),
    ).rejects.toThrowError(expect.objectContaining({ code: "VALIDATION_ERROR" }));
  });

  it("rejects an update to an unknown draft", async () => {
    const fake = createFakeRepository(createDraft());
    await expect(
      updateWorkbookDraft(
        { ...BASE, draftId: "missing" },
        createDeps(fake.repository),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a stale revision with REVISION_CONFLICT", async () => {
    const fake = createFakeRepository(createDraft());
    const error = (await updateWorkbookDraft(
      { ...BASE, expectedRevision: 2 },
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("REVISION_CONFLICT");
  });

  it("rejects editing a released draft with EDITION_IMMUTABLE", async () => {
    const fake = createFakeRepository(
      createDraft({ status: "published", sourceRecord: createDraft().sourceRecord }),
    );
    const error = (await updateWorkbookDraft(
      { ...BASE, expectedRevision: 3 },
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("EDITION_IMMUTABLE");
  });

  it("rejects editing a superseded draft with EDITION_IMMUTABLE", async () => {
    const fake = createFakeRepository(
      createDraft({ status: "superseded", sourceRecord: createDraft().sourceRecord }),
    );
    const error = (await updateWorkbookDraft(
      BASE,
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("EDITION_IMMUTABLE");
  });

  it("rejects editing a draft under review with ILLEGAL_STATE_TRANSITION", async () => {
    const fake = createFakeRepository(
      createDraft({ status: "in_review", sourceRecord: createDraft().sourceRecord }),
    );
    const error = (await updateWorkbookDraft(
      BASE,
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("ILLEGAL_STATE_TRANSITION");
  });

  it("rejects content that fails the normalized contract", async () => {
    const fake = createFakeRepository(createDraft());
    const error = (await updateWorkbookDraft(
      { ...BASE, content: { ...createContent(), title: "" } },
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});
