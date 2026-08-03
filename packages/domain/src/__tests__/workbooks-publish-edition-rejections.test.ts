import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import {
  publishWorkbookEdition,
  type PublishWorkbookEditionDependencies,
} from "../workbooks/publish-edition.js";
import { WorkbookPublicationError } from "../workbooks/edition-state.js";
import type {
  WorkbookClock,
  WorkbookEditionRepositoryPort,
} from "../workbooks/edition-repository-port.js";
import type {
  WorkbookDraft,
  WorkbookEdition,
  WorkbookPublicationEvent,
} from "../workbooks/edition-contracts.js";

const FIXED = "2026-08-02T10:00:00.000Z";

/**
 * Builds a valid workbook source record for publication tests.
 * @returns A source record whose contentHash matches the digest of its content.
 */
function createRecord(): WorkbookSourceRecord {
  const content = {
    title: "L",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "p" }],
    questions: [],
    assets: [],
  };
  return {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: "a",
      sourceRevision: "r",
      contentHash: computeWorkbookDigest(content),
    },
    content,
  };
}

/**
 * Builds a workbook draft for publication tests.
 * @param o Overrides merged over the default draft fields.
 * @returns A draft in the "in_review" state with revision 2.
 */
function createDraft(o: Partial<WorkbookDraft> = {}): WorkbookDraft {
  return {
    draftId: "d1",
    tenantId: "t1",
    status: "in_review",
    sourceRecord: createRecord(),
    revision: 2,
    createdBy: "u",
    createdAt: FIXED,
    updatedAt: FIXED,
    ...o,
  };
}

/**
 * Builds an in-memory repository recording every call it receives.
 * @param draft Draft returned by getDraft and updateDraftStatus.
 * @param existing Edition returned by findEditionByIdempotencyKey, or null.
 * @param appendError Error thrown by appendEdition, or null to append normally.
 * @returns The recorded call list, appended editions, recorded events and repository.
 */
function createFakeRepository(
  draft: WorkbookDraft,
  existing: WorkbookEdition | null = null,
  appendError: Error | null = null,
): {
  calls: string[];
  appended: WorkbookEdition[];
  events: WorkbookPublicationEvent[];
  repository: WorkbookEditionRepositoryPort;
} {
  const calls: string[] = [];
  const appended: WorkbookEdition[] = [];
  const events: WorkbookPublicationEvent[] = [];
  const repository: WorkbookEditionRepositoryPort = {
    getDraft: async () => {
      calls.push("getDraft");
      return draft;
    },
    findEditionByIdempotencyKey: async () => {
      calls.push("findEditionByIdempotencyKey");
      return existing;
    },
    nextEditionVersion: async () => {
      calls.push("nextEditionVersion");
      return 1;
    },
    appendEdition: async (edition: WorkbookEdition) => {
      calls.push("appendEdition");
      if (appendError !== null) {
        throw appendError;
      }
      appended.push(edition);
      return edition;
    },
    updateDraftStatus: async () => {
      calls.push("updateDraftStatus");
      return draft;
    },
    updateDraftContent: async () => {
      calls.push("updateDraftContent");
      return draft;
    },
    recordEvent: async (event: WorkbookPublicationEvent) => {
      calls.push("recordEvent");
      events.push(event);
    },
  };
  return { calls, appended, events, repository };
}

/**
 * Builds the dependencies required to publish a workbook edition.
 * @param repository Repository used as the persistence boundary.
 * @returns Dependencies with a fixed clock and sequential identifier generator.
 */
function createDeps(repository: WorkbookEditionRepositoryPort): PublishWorkbookEditionDependencies {
  let counter = 0;
  return {
    repository,
    clock: { now: () => FIXED } as WorkbookClock,
    newId: () => `id-${++counter}`,
  };
}

const BASE = {
  draftId: "d1",
  tenantId: "t1",
  expectedRevision: 2,
  idempotencyKey: "k1",
  publishedBy: "pub",
};

describe("publishWorkbookEdition / rejections write nothing", () => {
  it("rejects with VALIDATION_ERROR and writes nothing when getDraft returns null", async () => {
    const fake = createFakeRepository(createDraft());
    fake.repository.getDraft = async () => null;
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("VALIDATION_ERROR");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("rejects with REVISION_CONFLICT and writes nothing when the draft revision changed", async () => {
    const fake = createFakeRepository(createDraft({ revision: 9 }));
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("REVISION_CONFLICT");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("rejects with EDITION_IMMUTABLE and writes nothing when the draft is published", async () => {
    const fake = createFakeRepository(createDraft({ status: "published" }));
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("EDITION_IMMUTABLE");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("rejects with EDITION_IMMUTABLE and writes nothing when the draft is revoked", async () => {
    const fake = createFakeRepository(createDraft({ status: "revoked" }));
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("EDITION_IMMUTABLE");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("rejects with ILLEGAL_STATE_TRANSITION and writes nothing when the draft is still in draft", async () => {
    const fake = createFakeRepository(createDraft({ status: "draft" }));
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("ILLEGAL_STATE_TRANSITION");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("rejects with INCOMPLETE_SNAPSHOT and writes nothing when paragraphs are empty", async () => {
    const content = {
      title: "L",
      cefrLevel: "A2",
      paragraphs: [] as { order: number; text: string }[],
      questions: [],
      assets: [],
    };
    const record: WorkbookSourceRecord = {
      identity: {
        sourceApp: "reading-advantage",
        sourceId: "a",
        sourceRevision: "r",
        contentHash: computeWorkbookDigest(content),
      },
      content,
    };
    const fake = createFakeRepository(createDraft({ sourceRecord: record }));
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("INCOMPLETE_SNAPSHOT");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("rejects with VALIDATION_ERROR and writes nothing when the idempotency key is empty", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition({ ...BASE, idempotencyKey: "" }, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(WorkbookPublicationError);
    expect((error as WorkbookPublicationError).code).toBe("VALIDATION_ERROR");
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });
});

describe("publishWorkbookEdition / repository errors propagate", () => {
  it("propagates the raw Error from appendEdition without wrapping it", async () => {
    const fake = createFakeRepository(createDraft(), null, new Error("db down"));
    const deps = createDeps(fake.repository);
    let error: unknown;
    try {
      await publishWorkbookEdition(BASE, deps);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("db down");
    expect(error).not.toBeInstanceOf(WorkbookPublicationError);
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });
});
