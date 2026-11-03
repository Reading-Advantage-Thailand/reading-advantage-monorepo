import { describe, expect, it } from "vitest";

import type { WorkbookSourceRecord } from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import type { WorkbookDraft, WorkbookEdition } from "../workbooks/edition-contracts.js";
import { WorkbookPublicationError } from "../workbooks/edition-state.js";
import { createInMemoryEditionRepository } from "../workbooks/in-memory-edition-repository.js";
import { recordWorkbookCoverage, WorkbookCoverageError } from "../workbooks/coverage-record.js";
import { approveWorkbookProposal, WorkbookProposalError, type WorkbookProposal } from "../workbooks/ai-proposal.js";

const FIXED = "2026-08-04T10:00:00.000Z";

/**
 * Builds a valid workbook source record.
 * @returns A source record whose contentHash matches its content.
 */
function createRecord(title = "Original title"): WorkbookSourceRecord {
  const content = {
    title,
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "Original paragraph." }],
    questions: [],
    assets: [],
  };
  return {
    identity: { sourceApp: "reading-advantage", sourceId: "src-1", sourceRevision: "rev-1", contentHash: computeWorkbookDigest(content) },
    content,
  };
}

/**
 * Builds a draft at revision 3.
 * @param o Overrides merged over the default fields.
 * @returns A workbook draft.
 */
function createDraft(o: Partial<WorkbookDraft> = {}): WorkbookDraft {
  return {
    draftId: "d1", tenantId: "t1", status: "draft", sourceRecord: createRecord(), revision: 3,
    createdBy: "editor", createdAt: FIXED, updatedAt: FIXED, ...o,
  };
}

/**
 * Builds a published edition.
 * @param o Overrides merged over the default fields.
 * @returns A workbook edition.
 */
function createEdition(o: Partial<WorkbookEdition> = {}): WorkbookEdition {
  const snapshot = createRecord();
  return {
    editionId: "e1", draftId: "d1", tenantId: "t1", version: 1, snapshot, contentHash: snapshot.identity.contentHash,
    publishedAt: FIXED, publishedBy: "publisher", idempotencyKey: "k1", supersededByEditionId: null, revokedAt: null, ...o,
  };
}

const coverage = {
  coverageId: "cov-1", tenantId: "t1", editionId: "e1", classId: "class-1", recordedBy: "teacher-1",
  recordedAt: FIXED, unitsCovered: ["unit-1"], note: null,
};

/**
 * Asserts that a call throws an error with the given code.
 * @param fn The call under test.
 * @param code The expected error code.
 */
function expectCode(fn: () => unknown, code: string) {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as { code: string }).code).toBe(code);
}

describe("recordWorkbookCoverage", () => {
  it("returns a valid record unchanged", () => {
    expect(recordWorkbookCoverage(coverage, createEdition(), [])).toEqual(coverage);
  });

  it.each([
    ["missing units", { ...coverage, unitsCovered: [] }],
    ["bad timestamp", { ...coverage, recordedAt: "yesterday" }],
    ["extra student field", { ...coverage, studentId: "s1" }],
    ["not an object", null],
  ])("rejects %s with VALIDATION_ERROR", (_label, input) => {
    expectCode(() => recordWorkbookCoverage(input, createEdition(), []), "VALIDATION_ERROR");
  });

  it("rejects a record for a different edition", () => {
    expectCode(() => recordWorkbookCoverage({ ...coverage, editionId: "e2" }, createEdition(), []), "VALIDATION_ERROR");
  });

  it("rejects a record that crosses a tenant boundary", () => {
    let caught: unknown;
    try {
      recordWorkbookCoverage({ ...coverage, tenantId: "t2" }, createEdition(), []);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookCoverageError);
    expect((caught as WorkbookCoverageError).code).toBe("VALIDATION_ERROR");
    expect((caught as Error).message).toContain("tenant boundary");
    expect((caught as Error).name).toBe("WorkbookCoverageError");
  });

  it("rejects a revoked edition", () => {
    expectCode(() => recordWorkbookCoverage(coverage, createEdition({ revokedAt: FIXED }), []), "EDITION_REVOKED");
  });

  it("rejects a duplicate coverage id", () => {
    expectCode(() => recordWorkbookCoverage(coverage, createEdition(), ["cov-0", "cov-1"]), "DUPLICATE_COVERAGE");
  });

  it("keeps the cause on the error", () => {
    const cause = new Error("db");
    expect(new WorkbookCoverageError("INTERNAL_ERROR", "x", { cause }).cause).toBe(cause);
  });
});

describe("approveWorkbookProposal", () => {
  const proposal: WorkbookProposal = {
    proposalId: "p1", tenantId: "t1", draftId: "d1", status: "proposed", rationale: "Adds a glossary.",
    provenance: { model: "model-x", promptHash: "ph", generatedBy: "generator", generatedAt: FIXED, sourceContentHash: "src-hash" },
    reviewedBy: null, reviewedAt: null,
  };

  it("returns a new approved proposal and leaves the input unchanged", () => {
    const input = structuredClone(proposal);
    const approved = approveWorkbookProposal(input, "publisher", "src-hash", FIXED);
    expect(approved).toEqual({ ...proposal, status: "approved", reviewedBy: "publisher", reviewedAt: FIXED });
    expect(input).toEqual(proposal);
  });

  it("rejects an invalid proposal", () => {
    expectCode(() => approveWorkbookProposal({ ...proposal, provenance: undefined }, "publisher", "src-hash", FIXED), "VALIDATION_ERROR");
  });

  it.each(["approved", "rejected"] as const)("rejects a proposal already %s", (status) => {
    expectCode(() => approveWorkbookProposal({ ...proposal, status }, "publisher", "src-hash", FIXED), "ALREADY_REVIEWED");
  });

  it("rejects a blank approver", () => {
    expectCode(() => approveWorkbookProposal(proposal, "   ", "src-hash", FIXED), "VALIDATION_ERROR");
  });

  it("forbids the generator from approving its own proposal", () => {
    let caught: unknown;
    try {
      approveWorkbookProposal(proposal, "generator", "src-hash", FIXED);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookProposalError);
    expect((caught as WorkbookProposalError).code).toBe("SELF_APPROVAL_FORBIDDEN");
  });

  it("rejects a proposal whose source content drifted", () => {
    expectCode(() => approveWorkbookProposal(proposal, "publisher", "new-hash", FIXED), "SOURCE_DRIFTED");
  });
});

describe("createInMemoryEditionRepository drafts and editions", () => {
  it("creates, gets and lists drafts per tenant with a limit", async () => {
    const { repository } = createInMemoryEditionRepository();
    await repository.createDraft(createDraft({ draftId: "d1" }));
    await repository.createDraft(createDraft({ draftId: "d2" }));
    await repository.createDraft(createDraft({ draftId: "d3", tenantId: "t2" }));
    expect((await repository.listDrafts("t1")).map((d) => d.draftId)).toEqual(["d1", "d2"]);
    expect(await repository.listDrafts("t1", 1)).toHaveLength(1);
    expect(await repository.getDraft("t2", "d1")).toBeNull();
    expect((await repository.getDraft("t2", "d3"))?.tenantId).toBe("t2");
  });

  it("rejects a duplicate draft id in the same tenant", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    await expect(repository.createDraft(createDraft())).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("appends frozen editions and numbers versions per draft", async () => {
    const { repository, store } = createInMemoryEditionRepository([createDraft(), createDraft({ draftId: "d2" })]);
    expect(await repository.nextEditionVersion("t1", "d1")).toBe(1);
    const appended = await repository.appendEdition(createEdition());
    expect(Object.isFrozen(appended)).toBe(true);
    expect(store.editions).toHaveLength(1);
    expect(await repository.nextEditionVersion("t1", "d1")).toBe(2);
    expect(await repository.nextEditionVersion("t1", "d2")).toBe(1);
    expect(await repository.findEditionByIdempotencyKey("t1", "k1")).toBe(appended);
    expect(await repository.findEditionByIdempotencyKey("t2", "k1")).toBeNull();
    await repository.appendEdition(createEdition({ editionId: "e2", version: 2, idempotencyKey: "k2" }));
    expect(await repository.listEditions("t1", 1)).toHaveLength(1);
    expect(await repository.listEditions("t1")).toHaveLength(2);
    expect(await repository.listEditions("t2")).toEqual([]);
  });

  it("rejects an edition for a missing draft", async () => {
    const { repository } = createInMemoryEditionRepository();
    await expect(repository.appendEdition(createEdition())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a reused idempotency key", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    await repository.appendEdition(createEdition());
    await expect(repository.appendEdition(createEdition({ editionId: "e2", version: 2 }))).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("rejects a duplicate version for the same draft", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    await repository.appendEdition(createEdition());
    const err = await repository.appendEdition(createEdition({ editionId: "e2", idempotencyKey: "k2" })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkbookPublicationError);
    expect((err as WorkbookPublicationError).code).toBe("REVISION_CONFLICT");
  });

  it("updates draft status with a revision check", async () => {
    const { repository, store } = createInMemoryEditionRepository([createDraft()]);
    const updated = await repository.updateDraftStatus("t1", "d1", "published", 3);
    expect(updated).toMatchObject({ status: "published", revision: 4 });
    expect(store.drafts.get("t1:d1")).toBe(updated);
    await expect(repository.updateDraftStatus("t1", "d1", "published", 3)).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    await expect(repository.updateDraftStatus("t1", "nope", "published", 3)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("updates draft content with a revision check", async () => {
    const { repository } = createInMemoryEditionRepository([createDraft()]);
    const next = createRecord("New title");
    const updated = await repository.updateDraftContent("t1", "d1", next, 3);
    expect(updated).toMatchObject({ sourceRecord: next, revision: 4, status: "draft" });
    await expect(repository.updateDraftContent("t1", "d1", next, 3)).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    await expect(repository.updateDraftContent("t2", "d1", next, 4)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("records publication events in order", async () => {
    const { repository, store } = createInMemoryEditionRepository();
    const event = { type: "published" } as unknown as Parameters<typeof repository.recordEvent>[0];
    await repository.recordEvent(event);
    expect(store.events).toEqual([event]);
  });
});
