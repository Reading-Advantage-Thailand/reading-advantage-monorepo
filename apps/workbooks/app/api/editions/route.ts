import { getWorkbookRepository } from "../../../lib/repository";
import { getWorkbookSession } from "../../lib/session";

/**
 * Lists published workbook editions for the verified session's tenant.
 *
 * Requires an authenticated workbooks session; the tenant always comes from
 * the verified session, never from request parameters. Each edition is mapped
 * to a summary carrying the immutable identity fields plus the snapshot title.
 * @returns A JSON response listing the tenant's editions, or 401 when
 * unauthenticated.
 */
export async function GET(): Promise<Response> {
  const session = await getWorkbookSession();
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store, private" } },
    );
  }

  const editions = await getWorkbookRepository().listEditions(session.tenantId);
  const summary = editions.map((edition) => ({
    editionId: edition.editionId,
    draftId: edition.draftId,
    version: edition.version,
    contentHash: edition.contentHash,
    publishedAt: edition.publishedAt,
    title: edition.snapshot.content.title,
  }));

  return Response.json(
    { tenantId: session.tenantId, count: summary.length, editions: summary },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
