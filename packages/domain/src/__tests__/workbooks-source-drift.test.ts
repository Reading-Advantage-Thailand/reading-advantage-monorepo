import { describe, expect, it } from "vitest";
import { importLegacyWorkbook } from "../workbooks/legacy-workbook-importer.js";
import { createWorkbookDraft } from "../workbooks/create-draft.js";
import { detectWorkbookSourceDrift } from "../workbooks/source-drift.js";
import type { WorkbookDraft } from "../workbooks/edition-contracts.js";

/** Minimal legacy lesson whose title can be changed to force a content drift. */
const BASE_LESSON = {
  lesson_title: "Pip the Curious Puppy",
  cefr_level: "CEFR A0",
  article_paragraphs: [{ number: 1, text: "This is Pip. Pip is a puppy." }],
};

const BASE_INPUT = {
  lesson: BASE_LESSON,
  sourceApp: "reading-advantage" as const,
  sourceId: "cmgqx8v6602p3t79btatvfjuw",
  sourceRevision: "sha256:rev-1",
};

/**
 * Builds a persisted draft from a legacy import input.
 * @param overrides Optional partial import input merged over the base payload.
 * @returns A schema-valid draft carrying the imported source record.
 */
function makeDraft(overrides: Partial<typeof BASE_INPUT> = {}): WorkbookDraft {
  const record = importLegacyWorkbook({ ...BASE_INPUT, ...overrides });
  return createWorkbookDraft({
    tenantId: "tenant-1",
    draftId: `draft-${overrides.sourceRevision ?? BASE_INPUT.sourceRevision}`,
    createdBy: "import-cli",
    createdAt: "2026-08-04T00:00:00.000Z",
    sourceRecord: record,
  });
}

describe("detectWorkbookSourceDrift", () => {
  it("reports no drift on a first import with no existing drafts", () => {
    const record = importLegacyWorkbook(BASE_INPUT);
    const report = detectWorkbookSourceDrift([], record.identity);
    expect(report.driftDetected).toBe(false);
    expect(report.matchedDraftIds).toEqual([]);
    expect(report.supersededDraftIds).toEqual([]);
  });

  it("reports no drift when an identical source is re-imported", () => {
    const existing = makeDraft();
    const record = importLegacyWorkbook(BASE_INPUT);
    const report = detectWorkbookSourceDrift([existing], record.identity);
    expect(report.driftDetected).toBe(false);
    expect(report.matchedDraftIds).toEqual([existing.draftId]);
    expect(report.supersededDraftIds).toEqual([]);
  });

  it("flags drift when a changed source is re-imported and lists the superseded draft", () => {
    const existing = makeDraft();
    const changedRecord = importLegacyWorkbook({
      ...BASE_INPUT,
      lesson: { ...BASE_LESSON, lesson_title: "Pip Learns Textures" },
      sourceRevision: "sha256:rev-2",
    });
    const report = detectWorkbookSourceDrift([existing], changedRecord.identity);
    expect(report.driftDetected).toBe(true);
    expect(report.matchedDraftIds).toEqual([existing.draftId]);
    expect(report.supersededDraftIds).toEqual([existing.draftId]);
  });

  it("ignores drafts from a different sourceId or sourceApp", () => {
    const otherApp = makeDraft({ sourceApp: "primary-advantage" });
    const otherId = makeDraft({ sourceId: "other-lesson-id" });
    const record = importLegacyWorkbook(BASE_INPUT);
    const report = detectWorkbookSourceDrift(
      [otherApp, otherId],
      record.identity,
    );
    expect(report.driftDetected).toBe(false);
    expect(report.matchedDraftIds).toEqual([]);
    expect(report.supersededDraftIds).toEqual([]);
  });

  it("never mutates the existing drafts it inspects", () => {
    const existing = makeDraft();
    const frozen = Object.freeze(existing);
    Object.freeze(frozen.sourceRecord.identity);
    const changedRecord = importLegacyWorkbook({
      ...BASE_INPUT,
      lesson: { ...BASE_LESSON, lesson_title: "Changed" },
      sourceRevision: "sha256:rev-3",
    });
    detectWorkbookSourceDrift([frozen], changedRecord.identity);
    expect(existing).toEqual(makeDraft());
  });

  it("leaves a new draft carrying the new sourceRevision as the only draft change", () => {
    const existing = makeDraft();
    const before = existing.sourceRecord.identity.sourceRevision;
    const changedRecord = importLegacyWorkbook({
      ...BASE_INPUT,
      lesson: { ...BASE_LESSON, lesson_title: "Pip Explores" },
      sourceRevision: "sha256:rev-4",
    });
    const report = detectWorkbookSourceDrift([existing], changedRecord.identity);
    const next = createWorkbookDraft({
      tenantId: "tenant-1",
      draftId: "draft-sha256:rev-4",
      createdBy: "import-cli",
      createdAt: "2026-08-04T00:00:00.000Z",
      sourceRecord: changedRecord,
    });

    expect(report.driftDetected).toBe(true);
    expect(existing.sourceRecord.identity.sourceRevision).toBe(before);
    expect(existing.draftId).toBe("draft-sha256:rev-1");
    expect(next.sourceRecord.identity.sourceRevision).toBe("sha256:rev-4");
    expect(next.draftId).not.toBe(existing.draftId);
  });
});
