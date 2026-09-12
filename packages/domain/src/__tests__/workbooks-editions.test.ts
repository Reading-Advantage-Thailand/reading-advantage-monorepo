import { describe, expect, it } from "vitest";

import type {
  WorkbookNormalizedContent,
  WorkbookSourceRecord,
} from "../workbooks/contracts.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";
import {
  assertWorkbookDraftTransition,
  canTransitionWorkbookDraft,
  WorkbookPublicationError,
} from "../workbooks/edition-state.js";
import {
  assertExpectedRevision,
  assertSnapshotComplete,
  workbookDraftSchema,
  workbookEditionSchema,
  workbookPublicationRequestSchema,
  type WorkbookDraft,
  type WorkbookEdition,
  type WorkbookPublicationRequest,
} from "../workbooks/edition-contracts.js";

const ALL_STATUSES = [
  "draft",
  "in_review",
  "published",
  "superseded",
  "revoked",
] as const;

/**
 * Builds a valid workbook source record for edition lifecycle tests.
 * @param contentOverrides Partial content fields merged over the default content.
 * @returns A source record whose contentHash matches the digest of its content.
 */
function createRecord(
  contentOverrides: Partial<WorkbookNormalizedContent> = {},
): WorkbookSourceRecord {
  const content: WorkbookNormalizedContent = {
    title: "Lighthouse",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "One." }],
    questions: [],
    assets: [],
    ...contentOverrides,
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

const VALID_DRAFT: WorkbookDraft = {
  draftId: "draft-1",
  tenantId: "tenant-1",
  status: "draft",
  sourceRecord: createRecord(),
  revision: 3,
  createdBy: "user-1",
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

const VALID_EDITION: WorkbookEdition = {
  editionId: "edition-1",
  draftId: "draft-1",
  tenantId: "tenant-1",
  version: 1,
  snapshot: createRecord(),
  contentHash: createRecord().identity.contentHash,
  publishedAt: "2026-08-02T00:00:00.000Z",
  publishedBy: "user-1",
  idempotencyKey: "idem-1",
  supersededByEditionId: null,
  revokedAt: null,
};

const VALID_PUBLICATION_REQUEST: WorkbookPublicationRequest = {
  draftId: "draft-1",
  tenantId: "tenant-1",
  expectedRevision: 3,
  idempotencyKey: "idem-1",
  publishedBy: "user-1",
};

describe("workbook draft state machine", () => {
  it("treats draft->in_review as legal", () => {
    expect(canTransitionWorkbookDraft("draft", "in_review")).toBe(true);
  });

  it("treats in_review->draft as legal", () => {
    expect(canTransitionWorkbookDraft("in_review", "draft")).toBe(true);
  });

  it("treats in_review->published as legal", () => {
    expect(canTransitionWorkbookDraft("in_review", "published")).toBe(true);
  });

  it("treats published->superseded as legal", () => {
    expect(canTransitionWorkbookDraft("published", "superseded")).toBe(true);
  });

  it("treats published->revoked as legal", () => {
    expect(canTransitionWorkbookDraft("published", "revoked")).toBe(true);
  });

  it("treats draft->published as illegal", () => {
    expect(canTransitionWorkbookDraft("draft", "published")).toBe(false);
  });

  it("treats published->draft as illegal", () => {
    expect(canTransitionWorkbookDraft("published", "draft")).toBe(false);
  });

  it("treats published->in_review as illegal", () => {
    expect(canTransitionWorkbookDraft("published", "in_review")).toBe(false);
  });

  it("treats superseded and revoked as terminal states", () => {
    for (const to of ALL_STATUSES) {
      expect(canTransitionWorkbookDraft("superseded", to)).toBe(false);
      expect(canTransitionWorkbookDraft("revoked", to)).toBe(false);
    }
  });

  it("throws ILLEGAL_STATE_TRANSITION for draft->published", () => {
    let caught: unknown;
    try {
      assertWorkbookDraftTransition("draft", "published");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("ILLEGAL_STATE_TRANSITION");
  });

  it("throws EDITION_IMMUTABLE for published->draft", () => {
    let caught: unknown;
    try {
      assertWorkbookDraftTransition("published", "draft");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("EDITION_IMMUTABLE");
  });

  it("throws EDITION_IMMUTABLE for revoked->published", () => {
    let caught: unknown;
    try {
      assertWorkbookDraftTransition("revoked", "published");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("EDITION_IMMUTABLE");
  });

  it("does not throw for a legal transition", () => {
    expect(() => assertWorkbookDraftTransition("draft", "in_review")).not.toThrow();
  });

  it("defaults only PERSISTENCE_UNAVAILABLE to retryable true", () => {
    expect(new WorkbookPublicationError("PERSISTENCE_UNAVAILABLE", "down").retryable)
      .toBe(true);
    expect(new WorkbookPublicationError("REVISION_CONFLICT", "conflict").retryable)
      .toBe(false);
    expect(new WorkbookPublicationError("EDITION_IMMUTABLE", "immutable").retryable)
      .toBe(false);
  });
});

describe("edition contracts", () => {
  it("accepts a valid draft", () => {
    expect(workbookDraftSchema.safeParse(VALID_DRAFT).success).toBe(true);
  });

  it("rejects a draft carrying an extra unknown key (strict)", () => {
    expect(workbookDraftSchema.safeParse({ ...VALID_DRAFT, extra: "nope" }).success)
      .toBe(false);
  });

  it("rejects a negative or non-integer revision", () => {
    expect(workbookDraftSchema.safeParse({ ...VALID_DRAFT, revision: -1 }).success)
      .toBe(false);
    expect(workbookDraftSchema.safeParse({ ...VALID_DRAFT, revision: 1.5 }).success)
      .toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(workbookDraftSchema.safeParse({ ...VALID_DRAFT, status: "archived" }).success)
      .toBe(false);
  });

  it("accepts a valid edition", () => {
    expect(workbookEditionSchema.safeParse(VALID_EDITION).success).toBe(true);
  });

  it("rejects version 0 and accepts version 1", () => {
    expect(workbookEditionSchema.safeParse({ ...VALID_EDITION, version: 0 }).success)
      .toBe(false);
    expect(workbookEditionSchema.safeParse(VALID_EDITION).success).toBe(true);
  });

  it("rejects an empty idempotencyKey on the edition and the publication request", () => {
    expect(
      workbookEditionSchema.safeParse({ ...VALID_EDITION, idempotencyKey: "" }).success,
    ).toBe(false);
    expect(
      workbookPublicationRequestSchema.safeParse({
        ...VALID_PUBLICATION_REQUEST,
        idempotencyKey: "",
      }).success,
    ).toBe(false);
  });

  it("accepts null and real values for supersededByEditionId and revokedAt", () => {
    expect(workbookEditionSchema.safeParse(VALID_EDITION).success).toBe(true);
    expect(
      workbookEditionSchema.safeParse({
        ...VALID_EDITION,
        supersededByEditionId: "edition-2",
        revokedAt: "2026-08-02T01:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("accepts a valid publication request", () => {
    expect(workbookPublicationRequestSchema.safeParse(VALID_PUBLICATION_REQUEST).success)
      .toBe(true);
  });
});

describe("snapshot completeness and concurrency", () => {
  it("passes assertSnapshotComplete for a complete snapshot", () => {
    expect(() => assertSnapshotComplete(createRecord())).not.toThrow();
  });

  it("throws INCOMPLETE_SNAPSHOT when paragraphs is empty", () => {
    let caught: unknown;
    try {
      assertSnapshotComplete(createRecord({ paragraphs: [] }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("INCOMPLETE_SNAPSHOT");
    expect((caught as WorkbookPublicationError).detail).toBe("content.paragraphs is empty");
  });

  it("throws INCOMPLETE_SNAPSHOT when the title is only whitespace", () => {
    let caught: unknown;
    try {
      assertSnapshotComplete(createRecord({ title: "   " }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("INCOMPLETE_SNAPSHOT");
    expect((caught as WorkbookPublicationError).detail).toBe("content.title is empty");
  });

  it("throws INCOMPLETE_SNAPSHOT when contentHash does not match content", () => {
    const record = createRecord();
    record.identity.contentHash = "sha256:deadbeef";
    let caught: unknown;
    try {
      assertSnapshotComplete(record);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("INCOMPLETE_SNAPSHOT");
    expect((caught as WorkbookPublicationError).detail).toBe(
      "contentHash does not match content",
    );
  });

  it("proves a published snapshot cannot be silently altered (tamper test)", () => {
    const record = createRecord();
    record.content.title = "Altered Lighthouse";
    let caught: unknown;
    try {
      assertSnapshotComplete(record);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("INCOMPLETE_SNAPSHOT");
    expect((caught as WorkbookPublicationError).detail).toBe(
      "contentHash does not match content",
    );
  });

  it("does not throw when expected revision matches", () => {
    expect(() => assertExpectedRevision(3, 3)).not.toThrow();
  });

  it("throws REVISION_CONFLICT mentioning both revisions when they differ", () => {
    let caught: unknown;
    try {
      assertExpectedRevision(4, 3);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorkbookPublicationError);
    expect((caught as WorkbookPublicationError).code).toBe("REVISION_CONFLICT");
    const message = (caught as Error).message;
    expect(message).toContain("4");
    expect(message).toContain("3");
  });
});
