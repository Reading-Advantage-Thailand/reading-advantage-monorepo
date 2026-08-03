import { getWorkbookSession } from "../../lib/session";

/**
 * Lists published workbook editions for the verified session's tenant.
 *
 * Requires an authenticated workbooks session; the tenant always comes from
 * the verified session, never from request parameters.
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

  // TODO(workbooks): WorkbookEditionRepositoryPort exposes no edition-listing
  // method (listDrafts exists, but there is no listEditions). Once the port
  // gains one, fetch this tenant's editions through getWorkbookRepository()
  // from "../../../lib/repository" and map each to
  // { editionId, draftId, version, contentHash, publishedAt, title } with
  // title = edition.snapshot.content.title. Until then, no editions can be
  // read from the durable repository, so the listing is empty.
  const editions: readonly unknown[] = [];

  return Response.json(
    { tenantId: session.tenantId, count: editions.length, editions },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
