import { describe, expect, it, vi } from "vitest";

import type { WorkbookArtifactStore } from "./artifact-store.js";
import type { WorkbookNormalizedContent, WorkbookSourceRecord } from "./contracts.js";
import type { WorkbookEdition } from "./edition-contracts.js";
import { workbookPublicationEventSchema, workbookPublicationEventTypeSchema } from "./edition-repository-port.js";
import { createHtmlWorkbookRenderer, renderEditionHtml } from "./html-renderer.js";
import { buildWorkbookArtifactKey, WorkbookRenderError } from "./render-port.js";

function makeEdition(overrides: Partial<WorkbookEdition> = {}): WorkbookEdition {
  const content: WorkbookNormalizedContent = {
    title: "Tom & <Jerry>",
    cefrLevel: "B1",
    paragraphs: [{ order: 2, text: "Second" }, { order: 1, text: "First" }],
    questions: [
      { questionId: "q1", questionType: "multiple_choice", prompt: "Who's first?", choices: ["Tom", "\"Jerry\""] },
      { questionId: "q2", questionType: "open", prompt: "Open question" },
    ],
    assets: [],
  };
  const record: WorkbookSourceRecord = {
    identity: { sourceApp: "reading-advantage", sourceId: "src-1", sourceRevision: "rev-1", contentHash: "content-hash" },
    content,
  };
  return {
    editionId: "edition-9", draftId: "draft-1", tenantId: "tenant-1", version: 3, snapshot: record, contentHash: "content-hash",
    publishedAt: "2026-08-03T00:00:00.000Z", publishedBy: "actor-1", idempotencyKey: "idem-1", supersededByEditionId: null, revokedAt: null,
    ...overrides,
  };
}

function harness() {
  const stored: Array<Parameters<WorkbookArtifactStore["storeArtifact"]>[0]> = [];
  const store: WorkbookArtifactStore = {
    storeArtifact: vi.fn(async (input) => {
      stored.push(input);
      return { artifactId: input.artifactId, editionId: input.editionId, tenantId: input.tenantId, format: input.format, storageKey: buildWorkbookArtifactKey(input.tenantId, input.editionId, input.format), byteSize: input.body.byteLength, checksum: input.checksum, renderedAt: input.renderedAt };
    }),
  };
  const renderer = createHtmlWorkbookRenderer({ store, newArtifactId: () => "artifact-7", clock: { now: () => "2026-08-04T00:00:00.000Z" } });
  return { store, stored, renderer };
}

describe("renderEditionHtml", () => {
  it("escapes values, orders paragraphs, lists choices, and shows the edition version", () => {
    const html = renderEditionHtml(makeEdition());
    expect(html).toContain("<title>Tom &amp; &lt;Jerry&gt;</title>");
    expect(html).toContain("<p>CEFR: B1 · Edition v3</p>");
    expect(html.indexOf("<p>First</p>")).toBeLessThan(html.indexOf("<p>Second</p>"));
    expect(html).toContain("<li>Who&#39;s first?<ul><li>Tom</li><li>&quot;Jerry&quot;</li></ul></li><li>Open question</li>");
  });
});

describe("createHtmlWorkbookRenderer", () => {
  it("rejects a non-html format before it stores anything", async () => {
    const { renderer, store } = harness();
    await expect(renderer.renderEdition(makeEdition(), "pdf")).rejects.toMatchObject({ code: "RENDER_FAILED" });
    expect(store.storeArtifact).not.toHaveBeenCalled();
  });

  it("rejects a revoked edition", async () => {
    const { renderer, store } = harness();
    const promise = renderer.renderEdition(makeEdition({ revokedAt: "2026-08-04T00:00:00.000Z" }), "html");
    await expect(promise).rejects.toBeInstanceOf(WorkbookRenderError);
    await expect(promise).rejects.toMatchObject({ code: "EDITION_NOT_PUBLISHED" });
    expect(store.storeArtifact).not.toHaveBeenCalled();
  });

  it("stores the rendered document bytes with tenant, edition, clock time, and artifact id", async () => {
    const { renderer, stored } = harness();
    const edition = makeEdition();
    const artifact = await renderer.renderEdition(edition, "html");
    expect(stored).toHaveLength(1);
    const input = stored[0]!;
    expect(new TextDecoder().decode(input.body)).toBe(renderEditionHtml(edition));
    expect(input).toMatchObject({ tenantId: "tenant-1", editionId: "edition-9", format: "html", renderedAt: "2026-08-04T00:00:00.000Z", artifactId: "artifact-7" });
    expect(input.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(artifact).toMatchObject({ artifactId: "artifact-7", format: "html", byteSize: input.body.byteLength, storageKey: buildWorkbookArtifactKey("tenant-1", "edition-9", "html") });
  });

  it("stores the same checksum for the same edition", async () => {
    const first = harness();
    const second = harness();
    await first.renderer.renderEdition(makeEdition(), "html");
    await second.renderer.renderEdition(makeEdition(), "html");
    expect(first.stored[0]!.checksum).toBe(second.stored[0]!.checksum);
  });
});

describe("workbook publication event contract", () => {
  const event = { eventId: "e1", tenantId: "t1", draftId: "d1", editionId: null, eventType: "draft_created", actorId: "a1", occurredAt: "2026-08-03T00:00:00.000Z" };

  it("accepts every lifecycle event type and a null edition id", () => {
    expect(workbookPublicationEventTypeSchema.options).toEqual(["draft_created", "submitted_for_review", "returned_to_draft", "published", "superseded", "revoked"]);
    expect(workbookPublicationEventSchema.parse(event)).toEqual(event);
  });

  it("rejects unknown keys, unknown types, empty ids, and non-ISO times", () => {
    expect(() => workbookPublicationEventSchema.parse({ ...event, extra: 1 })).toThrow();
    expect(() => workbookPublicationEventSchema.parse({ ...event, eventType: "deleted" })).toThrow();
    expect(() => workbookPublicationEventSchema.parse({ ...event, actorId: "" })).toThrow();
    expect(() => workbookPublicationEventSchema.parse({ ...event, occurredAt: "yesterday" })).toThrow();
  });
});
