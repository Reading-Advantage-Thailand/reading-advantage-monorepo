import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import {
  publishWorkbookEdition,
  type PublishWorkbookEditionDependencies,
} from "../workbooks/publish-edition.js";
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
 * @returns The recorded call list, appended editions, recorded events and repository.
 */
function createFakeRepository(
  draft: WorkbookDraft,
  existing: WorkbookEdition | null = null,
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
      appended.push(edition);
      return edition;
    },
    updateDraftStatus: async () => {
      calls.push("updateDraftStatus");
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

describe("publishWorkbookEdition / success", () => {
  it("returns an edition with version 1 and tenantId t1", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    const edition = await publishWorkbookEdition(BASE, deps);
    expect(edition.version).toBe(1);
    expect(edition.tenantId).toBe("t1");
  });

  it("sets publishedAt to FIXED and editionId to id-1", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    const edition = await publishWorkbookEdition(BASE, deps);
    expect(edition.publishedAt).toBe(FIXED);
    expect(edition.editionId).toBe("id-1");
  });

  it("leaves supersededByEditionId and revokedAt null", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    const edition = await publishWorkbookEdition(BASE, deps);
    expect(edition.supersededByEditionId).toBeNull();
    expect(edition.revokedAt).toBeNull();
  });

  it("looks up by idempotency key before loading the draft", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    await publishWorkbookEdition(BASE, deps);
    expect(fake.calls[0]).toBe("findEditionByIdempotencyKey");
    expect(fake.calls[1]).toBe("getDraft");
  });

  it("finishes with appendEdition, updateDraftStatus, recordEvent in order", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    await publishWorkbookEdition(BASE, deps);
    expect(fake.calls.slice(-3)).toEqual([
      "appendEdition",
      "updateDraftStatus",
      "recordEvent",
    ]);
  });

  it("records exactly one published event for actor pub", async () => {
    const fake = createFakeRepository(createDraft());
    const deps = createDeps(fake.repository);
    await publishWorkbookEdition(BASE, deps);
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0].eventType).toBe("published");
    expect(fake.events[0].actorId).toBe("pub");
  });
});

describe("publishWorkbookEdition / idempotent replay", () => {
  it("returns the existing edition when the idempotency key already resolved", async () => {
    const existing: WorkbookEdition = {
      editionId: "existing-1",
      draftId: "d1",
      tenantId: "t1",
      version: 1,
      snapshot: createRecord(),
      contentHash: createRecord().identity.contentHash,
      idempotencyKey: "k1",
      publishedBy: "pub",
      publishedAt: FIXED,
      supersededByEditionId: null,
      revokedAt: null,
    };
    const fake = createFakeRepository(createDraft(), existing);
    const deps = createDeps(fake.repository);
    const edition = await publishWorkbookEdition(BASE, deps);
    expect(edition).toBe(existing);
  });

  it("appends no edition and records no event on replay", async () => {
    const existing: WorkbookEdition = {
      editionId: "existing-1",
      draftId: "d1",
      tenantId: "t1",
      version: 1,
      snapshot: createRecord(),
      contentHash: createRecord().identity.contentHash,
      idempotencyKey: "k1",
      publishedBy: "pub",
      publishedAt: FIXED,
      supersededByEditionId: null,
      revokedAt: null,
    };
    const fake = createFakeRepository(createDraft(), existing);
    const deps = createDeps(fake.repository);
    await publishWorkbookEdition(BASE, deps);
    expect(fake.appended).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });
});
