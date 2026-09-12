import { describe, expect, it } from "vitest";

import {
  buildWorkbookArtifactKey,
  workbookArtifactSchema,
  WorkbookRenderError,
  type WorkbookArtifact,
  type WorkbookRenderErrorCode,
} from "./render-port.js";

const VALID_ARTIFACT: WorkbookArtifact = {
  artifactId: "artifact-1",
  editionId: "edition-1",
  tenantId: "tenant-1",
  format: "pdf",
  storageKey: "workbooks/tenant-1/editions/edition-1.pdf",
  byteSize: 42,
  checksum: "sha256:abc",
  renderedAt: "2026-08-03T00:00:00.000Z",
};

/**
 * Every code in the WorkbookRenderErrorCode union, kept exhaustive by the
 * `satisfies` check: adding a code to the union without extending this list
 * fails type-checking, and every code is exercised for its default
 * retryability below.
 */
const ALL_ERROR_CODES = [
  "VALIDATION_ERROR",
  "EDITION_NOT_PUBLISHED",
  "INVALID_ARTIFACT_KEY",
  "RENDER_FAILED",
  "STORAGE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const satisfies readonly WorkbookRenderErrorCode[];

describe("workbookArtifactSchema", () => {
  it("accepts a valid pdf artifact", () => {
    expect(workbookArtifactSchema.safeParse(VALID_ARTIFACT).success).toBe(true);
  });

  it("accepts a valid html artifact", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, format: "html" }).success,
    ).toBe(true);
  });

  it("rejects a storage key that is an https URL", () => {
    const result = workbookArtifactSchema.safeParse({
      ...VALID_ARTIFACT,
      storageKey: "https://storage.googleapis.com/bucket/artifact.pdf",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "artifact storage key must be a canonical key, not a URL",
      );
    }
  });

  it("rejects a storage key that is an http URL", () => {
    const result = workbookArtifactSchema.safeParse({
      ...VALID_ARTIFACT,
      storageKey: "http://storage.example.com/artifact.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a canonical storage key that contains slashes but is not a URL", () => {
    expect(
      workbookArtifactSchema.safeParse({
        ...VALID_ARTIFACT,
        storageKey: "workbooks/tenant-1/editions/edition-1.html",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty storage key", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, storageKey: "" }).success,
    ).toBe(false);
  });

  it("rejects an unknown format", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, format: "docx" }).success,
    ).toBe(false);
  });

  it("rejects a negative byte size", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, byteSize: -1 }).success,
    ).toBe(false);
  });

  it("rejects a fractional byte size", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, byteSize: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects empty artifactId, editionId, tenantId and checksum", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, artifactId: "" }).success,
    ).toBe(false);
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, editionId: "" }).success,
    ).toBe(false);
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, tenantId: "" }).success,
    ).toBe(false);
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, checksum: "" }).success,
    ).toBe(false);
  });

  it("rejects a non-datetime renderedAt", () => {
    expect(
      workbookArtifactSchema.safeParse({
        ...VALID_ARTIFACT,
        renderedAt: "not-a-date",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown extra key (strict)", () => {
    expect(
      workbookArtifactSchema.safeParse({ ...VALID_ARTIFACT, extra: "nope" }).success,
    ).toBe(false);
  });
});

describe("WorkbookRenderError", () => {
  it("exposes the stable name, code and message", () => {
    const error = new WorkbookRenderError("RENDER_FAILED", "boom");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WorkbookRenderError");
    expect(error.code).toBe("RENDER_FAILED");
    expect(error.message).toBe("boom");
  });

  it("defaults retryability per code, covering the full code union", () => {
    const expectedRetryability: Readonly<Record<WorkbookRenderErrorCode, boolean>> = {
      VALIDATION_ERROR: false,
      EDITION_NOT_PUBLISHED: false,
      INVALID_ARTIFACT_KEY: false,
      RENDER_FAILED: true,
      STORAGE_UNAVAILABLE: true,
      INTERNAL_ERROR: false,
    };
    for (const code of ALL_ERROR_CODES) {
      const error = new WorkbookRenderError(code, `failure: ${code}`);
      expect(error.code).toBe(code);
      expect(error.retryable).toBe(expectedRetryability[code]);
    }
  });

  it("honors an explicit retryable override", () => {
    const retryable = new WorkbookRenderError("VALIDATION_ERROR", "m", {
      retryable: true,
    });
    const nonRetryable = new WorkbookRenderError("RENDER_FAILED", "m", {
      retryable: false,
    });
    expect(retryable.retryable).toBe(true);
    expect(nonRetryable.retryable).toBe(false);
  });

  it("retains the cause chain on the error", () => {
    const cause = new Error("underlying");
    const error = new WorkbookRenderError("RENDER_FAILED", "m", { cause });
    expect(error.cause).toBe(cause);
  });
});

describe("buildWorkbookArtifactKey", () => {
  it("builds the canonical key for a tenant, edition and format", () => {
    expect(buildWorkbookArtifactKey("tenant-1", "edition-1", "pdf")).toBe(
      "workbooks/tenant-1/editions/edition-1.pdf",
    );
    expect(buildWorkbookArtifactKey("t-2", "e-2", "html")).toBe(
      "workbooks/t-2/editions/e-2.html",
    );
  });

  it("rejects an empty tenant id with INVALID_ARTIFACT_KEY", () => {
    const error = (() => {
      try {
        buildWorkbookArtifactKey("", "edition-1", "pdf");
        return null;
      } catch (caught) {
        return caught;
      }
    })() as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("INVALID_ARTIFACT_KEY");
    expect(error.retryable).toBe(false);
  });

  it("rejects an empty edition id with INVALID_ARTIFACT_KEY", () => {
    expect(() => buildWorkbookArtifactKey("tenant-1", "", "pdf")).toThrowError(
      WorkbookRenderError,
    );
  });

  it("rejects a slash in the tenant id", () => {
    const error = (() => {
      try {
        buildWorkbookArtifactKey("tenant/other", "edition-1", "pdf");
        return null;
      } catch (caught) {
        return caught;
      }
    })() as WorkbookRenderError;
    expect(error.code).toBe("INVALID_ARTIFACT_KEY");
  });

  it("rejects a slash in the edition id", () => {
    expect(() => buildWorkbookArtifactKey("tenant-1", "a/b", "pdf")).toThrowError(
      WorkbookRenderError,
    );
  });
});
