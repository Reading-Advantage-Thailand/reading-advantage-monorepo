import { createHash } from "node:crypto";
import type { WorkbookNormalizedContent } from "./contracts.js";
import type { WorkbookEdition } from "./edition-contracts.js";
import type { WorkbookRenderPort } from "./render-port.js";
import { WorkbookRenderError } from "./render-port.js";
import type { WorkbookArtifactStore } from "./artifact-store.js";
import { PRINT_BRIDGE_SHIM } from "./print-bridge.js";

/**
 * Escapes a raw string for safe interpolation into an HTML document.
 * @param value The string to escape.
 * @returns The escaped string with &, <, >, " and ' replaced by &amp;, &lt;,
 * &gt;, &quot; and &#39;, in that order so the ampersand replacement does not
 * double-escape the other entities.
 */
export function escapeWorkbookHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Renders normalized workbook content into a self-contained HTML document
 * string. Every interpolated value is HTML-escaped. Draft previews have no
 * edition version, so the CEFR line carries no version suffix.
 * @param content Normalized workbook content to render.
 * @returns A complete HTML document string describing the content.
 */
export function renderWorkbookContentHtml(
  content: WorkbookNormalizedContent,
): string {
  return renderContentHtml(content, null);
}

/**
 * Renders a published workbook edition's snapshot into a self-contained HTML
 * document string. Every interpolated snapshot value is HTML-escaped.
 * @param edition Immutable published edition whose snapshot is rendered.
 * @returns A complete HTML document string describing the edition's content.
 */
export function renderEditionHtml(edition: WorkbookEdition): string {
  return renderContentHtml(edition.snapshot.content, edition.version);
}

/**
 * Renders normalized content into a complete HTML document, appending the
 * edition-version suffix to the CEFR line when an edition version is given.
 * The document carries the print bridge listener so a sandboxed preview iframe
 * can be told to print via the "workbook:print" postMessage.
 * @param content Normalized workbook content to render.
 * @param version Edition version to show on the CEFR line, or null for drafts.
 * @returns A complete HTML document string describing the content.
 */
function renderContentHtml(
  content: WorkbookNormalizedContent,
  version: number | null,
): string {
  const { title, cefrLevel, paragraphs, questions } = content;

  const orderedParagraphs = [...paragraphs]
    .sort((a, b) => a.order - b.order)
    .map(
      (paragraph) =>
        `<section><p>${escapeWorkbookHtml(paragraph.text)}</p></section>`,
    )
    .join("");

  const questionsHtml =
    questions.length > 0
      ? `<ol>${questions
          .map((question) => {
            const choicesHtml =
              question.choices && question.choices.length > 0
                ? `<ul>${question.choices
                    .map((choice) => `<li>${escapeWorkbookHtml(choice)}</li>`)
                    .join("")}</ul>`
                : "";
            return `<li>${escapeWorkbookHtml(question.prompt)}${choicesHtml}</li>`;
          })
          .join("")}</ol>`
      : "";

  const versionSuffix =
    version === null ? "" : ` · Edition v${escapeWorkbookHtml(String(version))}`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escapeWorkbookHtml(title)}</title></head><body>
<h1>${escapeWorkbookHtml(title)}</h1>
<p>CEFR: ${escapeWorkbookHtml(cefrLevel)}${versionSuffix}</p>
${orderedParagraphs}
${questionsHtml}
${PRINT_BRIDGE_SHIM}
</body></html>`;
}

/**
 * Creates an HTML workbook renderer that renders published editions to
 * self-contained HTML documents and persists them through the artifact store.
 * @param deps Dependencies including the artifact store, an artifact id factory,
 * and a clock for render timestamps.
 * @returns A render port that only supports the "html" format.
 */
export function createHtmlWorkbookRenderer(deps: {
  store: WorkbookArtifactStore;
  newArtifactId: () => string;
  clock: { now: () => string };
}): WorkbookRenderPort {
  return {
    async renderEdition(edition, format) {
      if (format !== "html") {
        throw new WorkbookRenderError(
          "RENDER_FAILED",
          "This renderer only supports the html format.",
        );
      }

      if (edition.revokedAt !== null) {
        throw new WorkbookRenderError(
          "EDITION_NOT_PUBLISHED",
          "Cannot render a revoked edition.",
        );
      }

      const html = renderEditionHtml(edition);
      const body = new TextEncoder().encode(html);

      const hash = createHash("sha256").update(html).digest("hex");
      const checksum = `sha256:${hash}`;

      return deps.store.storeArtifact({
        tenantId: edition.tenantId,
        editionId: edition.editionId,
        format: "html",
        body,
        checksum,
        renderedAt: deps.clock.now(),
        artifactId: deps.newArtifactId(),
      });
    },
  };
}
