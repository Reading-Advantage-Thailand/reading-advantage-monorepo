import { workbooks } from "@reading-advantage/domain";

/**
 * Lists published workbook editions for a tenant.
 *
 * Backed by the in-memory repository until the Drizzle migration lands; the
 * request path and response shape are already the ones the durable adapter will
 * serve, so swapping the adapter is the only change required.
 * @param request Incoming request carrying an optional tenantId search param.
 * @returns A JSON response listing the tenant's editions.
 */
export async function GET(request: Request): Promise<Response> {
  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? "default";
  const { store } = workbooks.createInMemoryEditionRepository();
  const editions = store.editions
    .filter((edition) => edition.tenantId === tenantId)
    .map((edition) => ({
      editionId: edition.editionId,
      draftId: edition.draftId,
      version: edition.version,
      contentHash: edition.contentHash,
      publishedAt: edition.publishedAt,
      title: edition.snapshot.content.title,
    }));

  return Response.json({ tenantId, count: editions.length, editions });
}
