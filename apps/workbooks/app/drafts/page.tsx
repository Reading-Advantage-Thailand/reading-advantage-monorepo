import type { ReactNode } from "react";
import Link from "next/link";
import { getWorkbookRepository } from "../../lib/repository";
import { getWorkbookSession } from "../lib/session";

/**
 * Lists workbook drafts and their lifecycle state for the editor workspace.
 * Drafts are scoped to the signed-in session's tenant.
 * @returns The drafts workspace view.
 */
export default async function DraftsPage(): Promise<ReactNode> {
  const session = await getWorkbookSession();
  if (!session) {
    return (
      <main>
        <h1>Drafts</h1>
        <p>Sign-in is required to view drafts.</p>
      </main>
    );
  }

  const drafts = await getWorkbookRepository().listDrafts(session.tenantId, 50);

  return (
    <main>
      <h1>Drafts</h1>
      {drafts.length === 0 ? (
        <p>No drafts yet. Create one to begin.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Draft</th>
              <th>Status</th>
              <th>Revision</th>
              <th>Title</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.draftId}>
                <td>
                  <Link href={`/drafts/${draft.draftId}`}>{draft.draftId}</Link>
                </td>
                <td>{draft.status}</td>
                <td>{draft.revision}</td>
                <td>{draft.sourceRecord.content.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>
        Editions are immutable once published. Editing a released edition requires a
        new draft revision.
      </p>
    </main>
  );
}
