import { createHash } from "node:crypto";
import type { WorkbookEdition } from "./edition-contracts.js";
import type { WorkbookRenderPort } from "./render-port.js";
import { WorkbookRenderError } from "./render-port.js";
import type { WorkbookArtifactStore } from "./artifact-store.js";
import { renderEditionHtml } from "./html-renderer.js";

/**
 * Injected converter from rendered workbook HTML into PDF bytes. The domain
 * never imports playwright, puppeteer, or any other browser; the caller
 * supplies the conversion so the domain stays provider-neutral.
 */
export type WorkbookHtmlToPdf = (html: string) => Promise<Uint8Array>;

/**
 * Creates a PDF workbook renderer that renders published editions to PDF bytes
 * through an injected HTML-to-PDF converter and persists them through the
 * artifact store.
 * @param deps Dependencies including the artifact store, the injected HTML-to-PDF
 * converter, an artifact id factory, and a clock for render timestamps.
 * @returns A render port that only supports the "pdf" format.
 */
export function createPdfWorkbookRenderer(deps: {
  store: WorkbookArtifactStore;
  htmlToPdf: WorkbookHtmlToPdf;
  newArtifactId: () => string;
  clock: { now: () => string };
}): WorkbookRenderPort {
  return {
    async renderEdition(edition, format) {
      if (format !== "pdf") {
        throw new WorkbookRenderError(
          "RENDER_FAILED",
          "This renderer only produces the pdf format.",
        );
      }

      if (edition.revokedAt !== null) {
        throw new WorkbookRenderError(
          "EDITION_NOT_PUBLISHED",
          "Cannot render a revoked edition.",
        );
      }

      const html = renderEditionHtml(edition);

      let body: Uint8Array;
      try {
        body = await deps.htmlToPdf(html);
      } catch (cause) {
        throw new WorkbookRenderError(
          "RENDER_FAILED",
          "failed to convert workbook html to pdf",
          { cause },
        );
      }

      if (body.byteLength === 0) {
        throw new WorkbookRenderError(
          "RENDER_FAILED",
          "The html-to-pdf converter produced an empty document.",
        );
      }

      const hash = createHash("sha256").update(body).digest("hex");
      const checksum = `sha256:${hash}`;

      return deps.store.storeArtifact({
        tenantId: edition.tenantId,
        editionId: edition.editionId,
        format: "pdf",
        body,
        checksum,
        renderedAt: deps.clock.now(),
        artifactId: deps.newArtifactId(),
      });
    },
  };
}
