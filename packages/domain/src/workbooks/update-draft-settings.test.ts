import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "./contracts.js";
import { computeWorkbookDigest } from "./digest.js";
import type { WorkbookDraft } from "./edition-contracts.js";
import type {
  WorkbookClock,
  WorkbookEditionRepositoryPort,
} from "./edition-repository-port.js";
import { WorkbookPublicationError } from "./edition-state.js";
import { createInMemoryEditionRepository } from "./in-memory-edition-repository.js";
import {
  updateWorkbookDraftSettings,
  type UpdateWorkbookDraftSettingsDependencies,
  type WorkbookDraftSettingsUpdateRequest,
} from "./update-draft-settings.js";

const FIXED = "2026-08-04T10:00:00.000Z";

/**
 * Builds valid normalized workbook content for settings update tests.
 * @returns Content whose paragraphs and questions satisfy the normalized schema.
 */
function createContent() {
  return {
    title: "Original title",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "Original paragraph." }],
    questions: [],
    assets: [],
  };
}

/**
 * Builds a draft with a known source record for settings update tests.
 * @param o Overrides merged over the default draft fields.
 * @returns A draft in the "draft" state at revision 3.
 */
function createDraft(o: Partial<WorkbookDraft> = {}): WorkbookDraft {
  const content = createContent();
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
 * @param draft Draft returned by getDraft and updated by updateDraftSettings.
 * @returns The recorded calls and the repository implementation.
 */
function createFakeRepository(draft: WorkbookDraft): {
  calls: string[];
  saved: WorkbookDraft | null;
  repository: WorkbookEditionRepositoryPort;
} {
  const inner = createInMemoryEditionRepository([draft]).repository;
  const calls: string[] = [];
  const saved: { draft: WorkbookDraft | null } = { draft: null };
  const repository: WorkbookEditionRepositoryPort = {
    ...inner,
    getDraft: async (tenantId, draftId) => {
      calls.push("getDraft");
      return inner.getDraft(tenantId, draftId);
    },
    updateDraftSettings: async (
      tenantId,
      draftId,
      expectedRevision,
      settings,
      updatedAt,
    ) => {
      calls.push("updateDraftSettings");
      const updated = await inner.updateDraftSettings(
        tenantId,
        draftId,
        expectedRevision,
        settings,
        updatedAt,
      );
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
 * Builds the dependencies required to update a workbook draft's settings.
 * @param repository Repository used as the persistence boundary.
 * @returns Dependencies with a fixed clock.
 */
function createDeps(
  repository: WorkbookEditionRepositoryPort,
): UpdateWorkbookDraftSettingsDependencies {
  return { repository, clock: { now: () => FIXED } as WorkbookClock };
}

const SETTINGS = {
  seriesName: "Reading Advantage",
  levelNumber: "Level 3",
  cefrLevel: "B1",
  type: "primary",
} as const;

const BASE: WorkbookDraftSettingsUpdateRequest = {
  draftId: "d1",
  tenantId: "t1",
  expectedRevision: 3,
  settings: SETTINGS,
};

describe("updateWorkbookDraftSettings / success", () => {
  it("returns the draft with revision bumped by one", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraftSettings(BASE, createDeps(fake.repository));
    expect(updated.revision).toBe(4);
    expect(updated.draftId).toBe("d1");
  });

  it("replaces the settings on the source record", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraftSettings(BASE, createDeps(fake.repository));
    expect(updated.sourceRecord.settings).toEqual(SETTINGS);
  });

  it("preserves content, source identity, and the content hash", async () => {
    const original = createDraft();
    const fake = createFakeRepository(original);
    const updated = await updateWorkbookDraftSettings(BASE, createDeps(fake.repository));
    expect(updated.sourceRecord.content).toEqual(original.sourceRecord.content);
    expect(updated.sourceRecord.identity).toEqual(original.sourceRecord.identity);
    expect(updated.sourceRecord.identity.contentHash).toBe(
      original.sourceRecord.identity.contentHash,
    );
  });

  it("updates updatedAt to the clock time", async () => {
    const fake = createFakeRepository(createDraft());
    const updated = await updateWorkbookDraftSettings(BASE, createDeps(fake.repository));
    expect(updated.updatedAt).toBe(FIXED);
  });

  it("persists through repository.updateDraftSettings with the expected revision", async () => {
    const fake = createFakeRepository(createDraft());
    await updateWorkbookDraftSettings(BASE, createDeps(fake.repository));
    expect(fake.calls).toEqual(["getDraft", "updateDraftSettings"]);
    expect(fake.saved?.sourceRecord.settings).toEqual(SETTINGS);
    expect(fake.saved?.revision).toBe(4);
  });

  it("reads the clock exactly once and persists the validated timestamp", async () => {
    const fake = createFakeRepository(createDraft());
    let clockCalls = 0;
    const deps: UpdateWorkbookDraftSettingsDependencies = {
      repository: fake.repository,
      clock: {
        now: () => {
          clockCalls += 1;
          return FIXED;
        },
      },
    };
    const updated = await updateWorkbookDraftSettings(BASE, deps);
    expect(clockCalls).toBe(1);
    expect(updated.updatedAt).toBe(FIXED);
    expect(fake.saved?.updatedAt).toBe(FIXED);
  });
});

describe("updateWorkbookDraftSettings / failures", () => {
  it("rejects a request that fails validation", async () => {
    const fake = createFakeRepository(createDraft());
    await expect(
      updateWorkbookDraftSettings(
        { ...BASE, expectedRevision: -1 },
        createDeps(fake.repository),
      ),
    ).rejects.toThrowError(expect.objectContaining({ code: "VALIDATION_ERROR" }));
  });

  it("rejects an update to an unknown draft", async () => {
    const fake = createFakeRepository(createDraft());
    await expect(
      updateWorkbookDraftSettings(
        { ...BASE, draftId: "missing" },
        createDeps(fake.repository),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a stale revision with REVISION_CONFLICT", async () => {
    const fake = createFakeRepository(createDraft());
    const error = (await updateWorkbookDraftSettings(
      { ...BASE, expectedRevision: 2 },
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("REVISION_CONFLICT");
  });

  it("rejects editing a released draft with EDITION_IMMUTABLE", async () => {
    const fake = createFakeRepository(
      createDraft({ status: "published", sourceRecord: createDraft().sourceRecord }),
    );
    const error = (await updateWorkbookDraftSettings(
      BASE,
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("EDITION_IMMUTABLE");
  });

  it("rejects editing a superseded draft with EDITION_IMMUTABLE", async () => {
    const fake = createFakeRepository(
      createDraft({ status: "superseded", sourceRecord: createDraft().sourceRecord }),
    );
    const error = (await updateWorkbookDraftSettings(
      BASE,
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("EDITION_IMMUTABLE");
  });

  it("rejects editing a draft under review with ILLEGAL_STATE_TRANSITION", async () => {
    const fake = createFakeRepository(
      createDraft({ status: "in_review", sourceRecord: createDraft().sourceRecord }),
    );
    const error = (await updateWorkbookDraftSettings(
      BASE,
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("ILLEGAL_STATE_TRANSITION");
  });

  it("rejects settings that fail the settings contract", async () => {
    const fake = createFakeRepository(createDraft());
    const invalidRequest = {
      ...BASE,
      settings: { type: "tertiary" },
    } as unknown as WorkbookDraftSettingsUpdateRequest;
    const error = (await updateWorkbookDraftSettings(
      invalidRequest,
      createDeps(fake.repository),
    ).catch((e: unknown) => e)) as WorkbookPublicationError;
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});
