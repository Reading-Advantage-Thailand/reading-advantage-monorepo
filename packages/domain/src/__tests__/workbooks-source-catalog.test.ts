import { describe, expect, it } from "vitest";

import {
  workbookAssetKeySchema,
  workbookIncompatibilityErrorSchema,
  workbookSourceAppSchema,
  workbookSourceIdentitySchema,
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
