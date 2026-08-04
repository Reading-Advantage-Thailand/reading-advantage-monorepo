import { describe, expect, it } from "vitest";

import {
  workbookAssetKeySchema,
  workbookDraftSettingsSchema,
  workbookIncompatibilityErrorSchema,
  workbookNormalizedContentSchema,
  workbookSourceAppSchema,
  workbookSourceIdentitySchema,
  workbookSourceRecordSchema,
} from "../workbooks/contracts.js";
import { WorkbookCatalogError } from "../workbooks/content-catalog-port.js";
import {
  canonicalizeWorkbookValue,
  computeSourceRecordDigest,
  computeWorkbookDigest,
} from "../workbooks/digest.js";
import type { WorkbookSourceRecord } from "../workbooks/contracts.js";

const FULL_IDENTITY = Object.freeze({
  sourceApp: "reading-advantage",
  sourceId: "lesson-01",
  sourceRevision: "rev-2026-07",
  contentHash: "hash-abc123",
});

/**
 * Creates a shape-valid workbook source record for digest comparisons.
 * @param identity Identity block attached to the record.
 * @returns A normalized source record valid under the workbook contracts.
 */
function createSourceRecord(
  identity: WorkbookSourceRecord["identity"],
): WorkbookSourceRecord {
  return {
    identity,
    content: {
      title: "The Lighthouse",
      cefrLevel: "A2",
      paragraphs: [
        { order: 0, text: "The light turned." },
        { order: 1, text: "The boat came home." },
      ],
      questions: [
        {
          questionId: "q-1",
          prompt: "What turned?",
          questionType: "single",
          choices: ["the light", "the boat"],
          correctChoiceIndex: 0,
        },
      ],
      assets: [
        {
          key: "workbooks/2026/lesson-01/hero.png",
          contentType: "image/png",
          byteSize: 1024,
          checksum: "abc123",
        },
      ],
    },
  };
}

describe("workbook source contracts", () => {
  it("rejects a value starting with https://", () => {
    expect(workbookAssetKeySchema.safeParse("https://cdn.example.com/hero.png").success)
      .toBe(false);
  });

  it("rejects a value starting with http://", () => {
    expect(workbookAssetKeySchema.safeParse("http://cdn.example.com/hero.png").success)
      .toBe(false);
  });

  it("rejects an empty string", () => {
    expect(workbookAssetKeySchema.safeParse("").success).toBe(false);
  });

  it("accepts workbooks/2026/lesson-01/hero.png", () => {
    expect(workbookAssetKeySchema.safeParse("workbooks/2026/lesson-01/hero.png").success)
      .toBe(true);
  });

  it("accepts reading-advantage and primary-advantage", () => {
    expect(workbookSourceAppSchema.safeParse("reading-advantage").success).toBe(true);
    expect(workbookSourceAppSchema.safeParse("primary-advantage").success).toBe(true);
  });

  it("rejects science-advantage", () => {
    expect(workbookSourceAppSchema.safeParse("science-advantage").success).toBe(false);
  });

  it("accepts a fully populated identity", () => {
    expect(workbookSourceIdentitySchema.safeParse(FULL_IDENTITY).success).toBe(true);
  });

  it("rejects an object carrying an extra unknown key", () => {
    expect(
      workbookSourceIdentitySchema.safeParse({ ...FULL_IDENTITY, extra: "nope" }).success,
    ).toBe(false);
  });

  it("rejects an object missing contentHash", () => {
    const { contentHash: _omitted, ...withoutHash } = FULL_IDENTITY;
    expect(workbookSourceIdentitySchema.safeParse(withoutHash).success).toBe(false);
  });

  it("rejects an empty issues array", () => {
    expect(
      workbookIncompatibilityErrorSchema.safeParse({
        sourceApp: "reading-advantage",
        sourceId: "lesson-01",
        issues: [],
      }).success,
    ).toBe(false);
  });

  it("accepts exactly one issue", () => {
    expect(
      workbookIncompatibilityErrorSchema.safeParse({
        sourceApp: "reading-advantage",
        sourceId: "lesson-01",
        issues: [{ path: "content.paragraphs", reason: "no paragraphs" }],
      }).success,
    ).toBe(true);
  });
});

describe("workbook catalog error", () => {
  it("is an instance of Error and has name WorkbookCatalogError", () => {
    const error = new WorkbookCatalogError("SOURCE_NOT_FOUND", "missing");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WorkbookCatalogError");
  });

  it("defaults CATALOG_UNAVAILABLE and CATALOG_TIMEOUT to retryable true", () => {
    expect(new WorkbookCatalogError("CATALOG_UNAVAILABLE", "down").retryable).toBe(true);
    expect(new WorkbookCatalogError("CATALOG_TIMEOUT", "slow").retryable).toBe(true);
  });

  it("defaults TENANT_SCOPE_ERROR and SOURCE_NOT_FOUND to retryable false", () => {
    expect(new WorkbookCatalogError("TENANT_SCOPE_ERROR", "scope").retryable).toBe(false);
    expect(new WorkbookCatalogError("SOURCE_NOT_FOUND", "gone").retryable).toBe(false);
  });

  it("overrides the default retryability when explicitly supplied", () => {
    expect(
      new WorkbookCatalogError("SOURCE_NOT_FOUND", "gone", { retryable: true }).retryable,
    ).toBe(true);
    expect(
      new WorkbookCatalogError("CATALOG_TIMEOUT", "slow", { retryable: false }).retryable,
    ).toBe(false);
  });

  it("defaults issues to an empty array and preserves them when supplied", () => {
    expect(new WorkbookCatalogError("SOURCE_NOT_FOUND", "gone").issues).toEqual([]);
    const issues = [{ path: "content.title", reason: "empty" }];
    expect(new WorkbookCatalogError("INCOMPATIBLE_SOURCE_SHAPE", "shape", { issues }).issues)
      .toEqual(issues);
  });
});

describe("workbook digest", () => {
  it("canonicalizes objects with the same data but different key insertion order identically", () => {
    const left = { a: 1, b: 2, c: 3 };
    const right = { c: 3, a: 1, b: 2 };
    expect(canonicalizeWorkbookValue(left)).toBe(canonicalizeWorkbookValue(right));
    expect(computeWorkbookDigest(left)).toBe(computeWorkbookDigest(right));
  });

  it("sorts nested object keys", () => {
    const nestedLeft = { top: { z: 1, a: 2 }, mid: { y: 3 } };
    const nestedRight = { mid: { y: 3 }, top: { a: 2, z: 1 } };
    expect(canonicalizeWorkbookValue(nestedLeft)).toBe(canonicalizeWorkbookValue(nestedRight));
    expect(canonicalizeWorkbookValue(nestedLeft)).toBe(
      '{"mid":{"y":3},"top":{"a":2,"z":1}}',
    );
  });

  it("digests a property explicitly set to undefined identically to omitting it", () => {
    const withUndefined = { a: 1, b: undefined };
    const omitted = { a: 1 };
    expect(canonicalizeWorkbookValue(withUndefined)).toBe(canonicalizeWorkbookValue(omitted));
    expect(computeWorkbookDigest(withUndefined)).toBe(computeWorkbookDigest(omitted));
  });

  it("treats array element order as significant", () => {
    expect(computeWorkbookDigest([1, 2, 3])).not.toBe(computeWorkbookDigest([3, 2, 1]));
  });

  it("produces a digest matching the sha256 hex prefix format", () => {
    expect(computeWorkbookDigest({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("returns the same digest for records with identical content but different identity blocks", () => {
    const first = createSourceRecord({
      sourceApp: "reading-advantage",
      sourceId: "lesson-01",
      sourceRevision: "rev-2026-07",
      contentHash: "hash-abc123",
    });
    const second = createSourceRecord({
      sourceApp: "primary-advantage",
      sourceId: "totally-different-id",
      sourceRevision: "rev-9999",
      contentHash: "hash-xyz999",
    });
    expect(computeSourceRecordDigest(first)).toBe(computeSourceRecordDigest(second));
  });

  it("changes the digest when the content changes", () => {
    const original = createSourceRecord(FULL_IDENTITY);
    const changed = createSourceRecord(FULL_IDENTITY);
    changed.content.paragraphs = [
      { order: 0, text: "The light turned." },
      { order: 1, text: "The storm grew." },
    ];
    expect(computeSourceRecordDigest(original)).not.toBe(computeSourceRecordDigest(changed));
  });
});

describe("extended normalized content contract / backward compatibility", () => {
  it("still parses a pre-extension record without any new fields", () => {
    const preExtension = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
    };
    expect(workbookNormalizedContentSchema.safeParse(preExtension).success).toBe(true);
  });

  it("keeps the digest of a pre-extension record unchanged", () => {
    const preExtension = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
    };
    expect(computeWorkbookDigest(preExtension)).toBe(
      "sha256:176453a84036d932d27658cf7df53cf52e6a607e17feac0c83a0dbbd1228488f",
    );
  });

  it("changes the digest when an optional carrier is populated", () => {
    const preExtension = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
    };
    const extended = { ...preExtension, lessonNumber: "Lesson 1" };
    expect(computeWorkbookDigest(extended)).not.toBe(computeWorkbookDigest(preExtension));
  });
});

describe("workbook draft settings contract", () => {
  const FULL_SETTINGS = Object.freeze({
    seriesName: "Reading Advantage",
    levelNumber: "Level 3",
    cefrLevel: "B1",
    type: "primary",
  });

  it("round-trips a full settings object through the source record schema", () => {
    const record = createSourceRecord(FULL_IDENTITY);
    const withSettings = { ...record, settings: FULL_SETTINGS };
    const parsed = workbookSourceRecordSchema.safeParse(withSettings);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.settings).toEqual(FULL_SETTINGS);
    }
  });

  it("accepts a source record without settings", () => {
    const record = createSourceRecord(FULL_IDENTITY);
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
    expect(record.settings).toBeUndefined();
  });

  it("accepts a partially populated settings object", () => {
    expect(
      workbookDraftSettingsSchema.safeParse({ seriesName: "Reading Advantage" }).success,
    ).toBe(true);
    expect(workbookDraftSettingsSchema.safeParse({ type: "secondary" }).success).toBe(true);
  });

  it("accepts an empty settings object", () => {
    expect(workbookDraftSettingsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an unknown settings key (strict)", () => {
    expect(
      workbookDraftSettingsSchema.safeParse({ ...FULL_SETTINGS, extra: "nope" }).success,
    ).toBe(false);
  });

  it("rejects an invalid type value", () => {
    expect(workbookDraftSettingsSchema.safeParse({ type: "tertiary" }).success).toBe(false);
  });

  it("rejects an empty string field", () => {
    expect(workbookDraftSettingsSchema.safeParse({ seriesName: "" }).success).toBe(false);
    expect(workbookDraftSettingsSchema.safeParse({ levelNumber: "" }).success).toBe(false);
    expect(workbookDraftSettingsSchema.safeParse({ cefrLevel: "" }).success).toBe(false);
  });

  it("rejects a settings object injected into the source record under a wrong field name", () => {
    const record = createSourceRecord(FULL_IDENTITY);
    const malformed = { ...record, draftSettings: FULL_SETTINGS };
    expect(workbookSourceRecordSchema.safeParse(malformed).success).toBe(false);
  });
});

describe("extended normalized content contract / new carriers", () => {
  it("parses a record carrying every extended carrier", () => {
    const extended = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
      lessonNumber: "Lesson 1",
      levelName: "Level 2",
      articleType: "fiction",
      genre: "adventure",
      vocabulary: [
        { word: "puppy", phonetic: "", definition: "A young dog.", thai_definition: "ลูกสุนัข" },
      ],
      vocabMatch: [
        { number: 1, word: "puppy", letter: "a", definition: "A young dog.", thai_definition: "ลูกสุนัข" },
      ],
      vocabFill: [{ number: 1, sentence: "Pip is a blank." }],
      vocabWordBank: ["puppy"],
      sentenceOrderQuestions: [{ words: ["is", "Pip"] }],
      sentenceCompletionPrompts: [{ number: 1, prompt: "This is Pip" }],
      shortAnswerQuestion: "What is the puppy's name?",
      shortAnswerHint: "Read the first sentence.",
      writingPrompt: "Describe Pip.",
      writingPlanPrompts: ["What does Pip look like?"],
      writingSentenceFrames: ["Pip is ..."],
      sentenceStarters: ["I think..."],
      connectionQuestion: "How does Pip feel?",
      grammarSearchTerm: "adjectives",
      phonicsFocus: "short a",
      discussionQuestion: "What is your favorite texture?",
      reflectionFocus: "What did Pip learn?",
      mcAnswers: [{ number: 1, letter: "b", text: "A puppy" }],
      vocabMatchAnswerString: "1-a",
      vocabFillAnswerString: "1. puppy",
      sentenceOrderAnswers: [{ number: 1, sentence: "This is Pip." }],
      translationParagraphs: [{ label: "Paragraph 1", text: "นี่คือปิ๊ป" }],
      articleCaption: "Pip feels a soft blanket.",
      articleUrl: "https://primary.reading-advantage.com/student/read/cmgqx8v6602p3t79btatvfjuw",
      articleImages: [
        { legacyUrl: "https://example.com/hero.png" },
        {
          key: "workbooks/2026/lesson-01/inline-1.png",
          legacyUrl: "https://example.com/inline-1.png",
          caption: "Pip feels the blanket.",
          position: "inline-para-1",
        },
      ],
    };
    expect(workbookNormalizedContentSchema.safeParse(extended).success).toBe(true);
  });

  it("accepts an article image carrying only a canonical key", () => {
    const record = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
      articleImages: [{ key: "workbooks/2026/lesson-01/hero.png" }],
    };
    expect(workbookNormalizedContentSchema.safeParse(record).success).toBe(true);
  });

  it("rejects an article image with neither a key nor a legacyUrl", () => {
    const record = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
      articleImages: [{ caption: "no reference at all" }],
    };
    expect(workbookNormalizedContentSchema.safeParse(record).success).toBe(false);
  });

  it("rejects an article image whose legacyUrl is not a URL", () => {
    const record = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
      articleImages: [{ legacyUrl: "not-a-url" }],
    };
    expect(workbookNormalizedContentSchema.safeParse(record).success).toBe(false);
  });

  it("rejects an unknown position value on an article image", () => {
    const record = {
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
      articleImages: [
        { legacyUrl: "https://example.com/hero.png", position: "sidebar" },
      ],
    };
    expect(workbookNormalizedContentSchema.safeParse(record).success).toBe(false);
  });
});
