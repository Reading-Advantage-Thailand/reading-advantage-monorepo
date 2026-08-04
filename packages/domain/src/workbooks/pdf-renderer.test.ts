import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { WorkbookArtifactStore } from "./artifact-store.js";
import type { WorkbookNormalizedContent, WorkbookSourceRecord } from "./contracts.js";
import { computeWorkbookDigest } from "./digest.js";
import type { WorkbookEdition } from "./edition-contracts.js";
import { renderEditionHtml } from "./html-renderer.js";
import { createPdfWorkbookRenderer } from "./pdf-renderer.js";
import { buildWorkbookArtifactKey, type WorkbookArtifact } from "./render-port.js";
import { WorkbookRenderError } from "./render-port.js";

function makeEdition(
  overrides: Partial<WorkbookEdition> = {},
): WorkbookEdition {
  const content: WorkbookNormalizedContent = {
    title: "Lighthouse",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "One." }],
    questions: [],
    assets: [],
  };
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
    editionId: "edition-1",
    draftId: "draft-1",
    tenantId: "tenant-1",
    version: 1,
    snapshot: record,
    contentHash: record.identity.contentHash,
    publishedAt: "2026-08-03T00:00:00.000Z",
    publishedBy: "actor-1",
    idempotencyKey: "idem-1",
    supersededByEditionId: null,
    revokedAt: null,
    ...overrides,
  };
}

function createHarness() {
  const receivedHtml: string[] = [];
  const htmlToPdf = vi.fn(async (html: string): Promise<Uint8Array> => {
    receivedHtml.push(html);
    return new TextEncoder().encode("PDF-BYTES");
  });
  const stored: Array<Parameters<WorkbookArtifactStore["storeArtifact"]>[0]> = [];
  const store: WorkbookArtifactStore = {
    storeArtifact: async (input) => {
      stored.push(input);
      return {
        artifactId: input.artifactId,
        editionId: input.editionId,
        tenantId: input.tenantId,
        format: input.format,
        storageKey: buildWorkbookArtifactKey(
          input.tenantId,
          input.editionId,
          input.format,
        ),
        byteSize: input.body.byteLength,
        checksum: input.checksum,
        renderedAt: input.renderedAt,
      };
    },
  };
  const clock = { now: () => "2026-08-03T00:00:00.000Z" };
  const newArtifactId = vi.fn(() => "artifact-1");
  const renderer = createPdfWorkbookRenderer({
    store,
    htmlToPdf,
    newArtifactId,
    clock,
  });
  return { receivedHtml, htmlToPdf, stored, store, newArtifactId, renderer };
}

describe("createPdfWorkbookRenderer", () => {
  it("rejects a non-pdf format with RENDER_FAILED without touching the store", async () => {
    const { renderer, store, stored } = createHarness();

    const error = (await renderer
      .renderEdition(makeEdition(), "html")
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("RENDER_FAILED");
    expect(error.message).toBe("This renderer only produces the pdf format.");
    expect(error.retryable).toBe(true);
    expect(stored).toHaveLength(0);
    expect(store).toBeDefined();
  });

  it("rejects a revoked edition with EDITION_NOT_PUBLISHED without touching the store", async () => {
    const { renderer, stored } = createHarness();
    const revoked = makeEdition({ revokedAt: "2026-08-03T01:00:00.000Z" });

    const error = (await renderer
      .renderEdition(revoked, "pdf")
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("EDITION_NOT_PUBLISHED");
    expect(error.message).toBe("Cannot render a revoked edition.");
    expect(error.retryable).toBe(false);
    expect(stored).toHaveLength(0);
  });

  it("passes the rendered edition html to the injected converter", async () => {
    const { receivedHtml, renderer } = createHarness();
    const edition = makeEdition();

    await renderer.renderEdition(edition, "pdf");

    expect(receivedHtml).toHaveLength(1);
    expect(receivedHtml[0]).toBe(renderEditionHtml(edition));
  });

  it("wraps a converter rejection into RENDER_FAILED retaining the cause", async () => {
    const cause = new Error("browser crashed");
    const htmlToPdf = vi.fn(async () => {
      throw cause;
    });
    const renderer = createPdfWorkbookRenderer({
      store: createHarness().store,
      htmlToPdf,
      newArtifactId: () => "artifact-1",
      clock: { now: () => "2026-08-03T00:00:00.000Z" },
    });

    const error = (await renderer
      .renderEdition(makeEdition(), "pdf")
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("RENDER_FAILED");
    expect(error.retryable).toBe(true);
    expect(error.cause).toBe(cause);
  });

  it("rejects an empty converter result with RENDER_FAILED", async () => {
    const htmlToPdf = vi.fn(async () => new Uint8Array(0));
    const { store } = createHarness();
    const renderer = createPdfWorkbookRenderer({
      store,
      htmlToPdf,
      newArtifactId: () => "artifact-1",
      clock: { now: () => "2026-08-03T00:00:00.000Z" },
    });

    const error = (await renderer
      .renderEdition(makeEdition(), "pdf")
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("RENDER_FAILED");
    expect(error.message).toBe(
      "The html-to-pdf converter produced an empty document.",
    );
  });

  it("stores the artifact under the edition tenant and edition id with pdf format", async () => {
    const { stored, renderer } = createHarness();
    const edition = makeEdition({ tenantId: "tenant-9", editionId: "edition-9" });

    await renderer.renderEdition(edition, "pdf");

    expect(stored).toHaveLength(1);
    expect(stored[0].tenantId).toBe("tenant-9");
    expect(stored[0].editionId).toBe("edition-9");
    expect(stored[0].format).toBe("pdf");
    expect(stored[0].body).toEqual(new TextEncoder().encode("PDF-BYTES"));
  });

  it("computes the sha256 checksum over the exact pdf bytes", async () => {
    const { stored, renderer } = createHarness();
    const bytes = new TextEncoder().encode("PDF-BYTES");
    const expected = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

    await renderer.renderEdition(makeEdition(), "pdf");

    expect(stored[0].checksum).toBe(expected);
  });

  it("stamps renderedAt from the injected clock and artifactId from the factory", async () => {
    const { stored, newArtifactId, renderer } = createHarness();

    await renderer.renderEdition(makeEdition(), "pdf");

    expect(newArtifactId).toHaveBeenCalledTimes(1);
    expect(stored[0].renderedAt).toBe("2026-08-03T00:00:00.000Z");
    expect(stored[0].artifactId).toBe("artifact-1");
  });

  it("resolves with the artifact returned by the store", async () => {
    const store: WorkbookArtifactStore = {
      storeArtifact: async () =>
        ({
          artifactId: "artifact-1",
          editionId: "edition-1",
          tenantId: "tenant-1",
          format: "pdf",
          storageKey: "workbooks/tenant-1/editions/edition-1.pdf",
          byteSize: 9,
          checksum: "sha256:abc",
          renderedAt: "2026-08-03T00:00:00.000Z",
        }) satisfies WorkbookArtifact,
    };
    const renderer = createPdfWorkbookRenderer({
      store,
      htmlToPdf: async () => new TextEncoder().encode("PDF-BYTES"),
      newArtifactId: () => "artifact-1",
      clock: { now: () => "2026-08-03T00:00:00.000Z" },
    });

    const artifact = await renderer.renderEdition(makeEdition(), "pdf");

    expect(artifact.storageKey).toBe("workbooks/tenant-1/editions/edition-1.pdf");
    expect(artifact.byteSize).toBe(9);
  });
});
