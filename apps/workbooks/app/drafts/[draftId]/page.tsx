import type { ReactNode } from "react";
import type { workbooks } from "@reading-advantage/domain";
import { getWorkbookRepository } from "../../../lib/repository";
import { getWorkbookSession } from "../../lib/session";
import { DraftEditorView } from "./draft-editor-view";

/**
 * Draft lesson editor page: a thin route that resolves the verified session,
 * loads the tenant-scoped draft through the domain repository, and renders the
 * editor view. The tenant always comes from the session, never from the URL.
 * @param params Route params containing the draft identifier.
 * @returns The draft editor view.
 */
export default async function DraftEditorPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}): Promise<ReactNode> {
  const { draftId } = await params;
  const session = await getWorkbookSession();

  let draft: workbooks.WorkbookDraft | null = null;
  if (session?.role === "WORKBOOK_ADMIN") {
    draft = await getWorkbookRepository().getDraft(session.tenantId, draftId);
  }

  return <DraftEditorView session={session} draft={draft} />;
}
