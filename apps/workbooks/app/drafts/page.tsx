import type { ReactNode } from "react";
import { getWorkbookRepository } from "../../lib/repository";

/**
 * Lists workbook drafts and their lifecycle state for the editor workspace.
 * @returns The drafts workspace view.
 */
export default async function DraftsPage(): Promise<ReactNode> {
  const drafts = await getWorkbookRepository().listDrafts("default", 50);

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
                <td>{draft.draftId}</td>
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
