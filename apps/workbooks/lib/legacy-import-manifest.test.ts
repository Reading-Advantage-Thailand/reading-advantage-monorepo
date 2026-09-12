import { describe, expect, it } from "vitest";
import { workbooks } from "@reading-advantage/domain";
import {
  buildLegacyImportManifest,
  computeLegacyImportFileHash,
  legacyImportManifestSchema,
} from "./legacy-import-manifest";

const validLesson = {
  lesson_number: "Lesson 1",
  lesson_title: "Pip the Curious Puppy Feels",
  level_name: "Level 2",
  cefr_level: "CEFR A0",
  article_type: "fiction",
  genre: "Materials & Science",
  vocabulary: [
    { word: "puppy", phonetic: "", definition: "A young dog.", thai_definition: "ลูกสุนัข" },
  ],
  article_image_url: ["https://storage.googleapis.com/primary-app-storage/images/demo_1.png"],
  article_url: "https://primary.reading-advantage.com/student/read/cmgqx8v6602p3t79btatvfjuw",
  article_paragraphs: [
    { number: 1, text: "Pip is a curious puppy." },
    { number: 2, text: "Pip feels a soft blanket." },
    { number: 3, text: "Pip feels a rough rug." },
  ],
  comprehension_questions: [
    { number: 1, question: "What is the puppy's name?", options: ["Pip", "Max", "Rex"] },
  ],
};

const invalidLesson = {
  lesson_number: "Lesson X",
  lesson_title: "Broken Lesson",
};

describe("legacy import manifest", () => {
  it("records hash, object key, and parse status for a valid lesson", () => {
    const manifest = buildLegacyImportManifest({
      project: { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" },
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw: JSON.stringify(validLesson, null, 2),
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });

    expect(manifest.counts).toEqual({
      lessons: 1,
      parseOk: 1,
      parseError: 0,
      exceptions: 0,
      provenance: 1,
    });
    const entry = manifest.entries[0];
    expect(entry.parseStatus).toBe("ok");
    expect(entry.fileHash).toBe(
      "sha256:6ca928311caf3f50911c2fc384f584523a7c0f8944150714838a18ca01a22c50",
    );
    expect(entry.objectKey).toBe(
      "workbooks/imports/origins-2-a0/01-Pip the Curious Puppy Feels _workbook.json/6ca928311caf3f50911c2fc384f584523a7c0f8944150714838a18ca01a22c50/01-Pip the Curious Puppy Feels _workbook.json",
    );
    expect(entry.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("derives the source id from the article URL when present", () => {
    const manifest = buildLegacyImportManifest({
      project: { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" },
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw: JSON.stringify(validLesson, null, 2),
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });

    expect(manifest.entries[0].sourceId).toBe("cmgqx8v6602p3t79btatvfjuw");
  });

  it("records a structured exception and error status for an invalid lesson", () => {
    const manifest = buildLegacyImportManifest({
      project: { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" },
      files: [
        {
          sourcePath: "99-Broken Lesson _workbook.json",
          raw: JSON.stringify(invalidLesson, null, 2),
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });

    const entry = manifest.entries[0];
    expect(entry.parseStatus).toBe("error");
    expect(entry.contentHash).toBeNull();
    expect(entry.fileHash).toBe(
      "sha256:f93b2eae8676366b861424e1e0461488f3b47a996273a3657017f6e76f604480",
    );
    const exception = entry.exceptions.find(
      (candidate) => candidate.code === "INCOMPATIBLE_SOURCE_SHAPE",
    );
    expect(exception).toBeDefined();
    expect(exception?.issues?.length ?? 0).toBeGreaterThan(0);
  });

  it("records structured provenance entries for mapped asset URLs", () => {
    const manifest = buildLegacyImportManifest({
      project: { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" },
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw: JSON.stringify(validLesson, null, 2),
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });

    const entry = manifest.entries[0];
    expect(entry.parseStatus).toBe("ok");
    expect(
      entry.exceptions.some(
        (candidate) => candidate.code === "ASSET_REFERENCE_NOT_PORTABLE",
      ),
    ).toBe(false);
    expect(entry.provenance).toEqual([
      {
        sourcePath: "article_image_url",
        legacyUrl: "https://storage.googleapis.com/primary-app-storage/images/demo_1.png",
      },
    ]);
  });

  it("counts parse results and exceptions across all files", () => {
    const manifest = buildLegacyImportManifest({
      project: { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" },
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw: JSON.stringify(validLesson, null, 2),
        },
        {
          sourcePath: "99-Broken Lesson _workbook.json",
          raw: JSON.stringify(invalidLesson, null, 2),
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });

    expect(manifest.counts).toEqual({
      lessons: 2,
      parseOk: 1,
      parseError: 1,
      exceptions: 1,
      provenance: 1,
    });
  });

  it("produces a manifest that satisfies the manifest schema", () => {
    const manifest = buildLegacyImportManifest({
      project: { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" },
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw: JSON.stringify(validLesson, null, 2),
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });

    const parsed = legacyImportManifestSchema.safeParse(manifest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.manifestVersion).toBe(3);
    }
  });

  it("computes deterministic prefixed file hashes", () => {
    const raw = JSON.stringify(validLesson, null, 2);
    expect(computeLegacyImportFileHash(raw)).toBe(computeLegacyImportFileHash(raw));
    expect(computeLegacyImportFileHash(raw)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe("legacy import manifest / source drift", () => {
  const project = { projectId: "origins-2-a0", sourceRoot: "/read-only/origins-2-a0" };

  /** Builds the manifest entry content hash for the lesson raw text. */
  function contentHashFor(raw: string): string {
    const record = workbooks.importLegacyWorkbook({
      lesson: JSON.parse(raw) as unknown,
      sourceApp: "reading-advantage",
      sourceId: "cmgqx8v6602p3t79btatvfjuw",
      sourceRevision: computeLegacyImportFileHash(raw),
    });
    return record.identity.contentHash;
  }

  /** Builds a persisted draft whose source record carries the given content hash. */
  function makeExistingDraft(
    draftId: string,
    contentHash: string,
  ): workbooks.WorkbookDraft {
    const content = {
      title: "Pip the Curious Puppy Feels",
      cefrLevel: "CEFR A0",
      paragraphs: [{ order: 0, text: "Pip is a curious puppy." }],
      questions: [],
      assets: [],
    };
    return {
      draftId,
      tenantId: "tenant-1",
      status: "draft",
      sourceRecord: {
        identity: {
          sourceApp: "reading-advantage",
          sourceId: "cmgqx8v6602p3t79btatvfjuw",
          sourceRevision: "sha256:rev-1",
          contentHash,
        },
        content,
      },
      revision: 0,
      createdBy: "import-cli",
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
    };
  }

  it("records no drift when no existing drafts are supplied", () => {
    const raw = JSON.stringify(validLesson, null, 2);
    const manifest = buildLegacyImportManifest({
      project,
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw,
        },
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });
    const entry = manifest.entries[0];
    expect(entry.driftDetected).toBe(false);
    expect(entry.supersededDraftIds).toEqual([]);
  });

  it("records no drift when an identical content hash is re-imported", () => {
    const raw = JSON.stringify(validLesson, null, 2);
    const manifest = buildLegacyImportManifest({
      project,
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw,
        },
      ],
      existingDrafts: [
        makeExistingDraft("draft-1", contentHashFor(raw)),
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });
    const entry = manifest.entries[0];
    expect(entry.driftDetected).toBe(false);
    expect(entry.supersededDraftIds).toEqual([]);
  });

  it("records drift and the superseded draft id when the content hash changes", () => {
    const raw = JSON.stringify(validLesson, null, 2);
    const manifest = buildLegacyImportManifest({
      project,
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw,
        },
      ],
      existingDrafts: [
        makeExistingDraft(
          "draft-1",
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        ),
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });
    const entry = manifest.entries[0];
    expect(entry.driftDetected).toBe(true);
    expect(entry.supersededDraftIds).toEqual(["draft-1"]);
  });

  it("satisfies the manifest schema with drift fields populated", () => {
    const raw = JSON.stringify(validLesson, null, 2);
    const manifest = buildLegacyImportManifest({
      project,
      files: [
        {
          sourcePath: "01-Pip the Curious Puppy Feels _workbook.json",
          raw,
        },
      ],
      existingDrafts: [
        makeExistingDraft(
          "draft-1",
          "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        ),
      ],
      generatedAt: "2026-08-03T12:00:00.000Z",
    });
    const parsed = legacyImportManifestSchema.safeParse(manifest);
    expect(parsed.success).toBe(true);
  });
});
