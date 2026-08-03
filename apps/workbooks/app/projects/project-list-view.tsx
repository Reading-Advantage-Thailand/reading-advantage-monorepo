import type { ReactNode } from "react";
import { workbooks } from "@reading-advantage/domain";
import type { WorkbookSession } from "../lib/session";

/** Props controlling the workbook project-list view. */
export interface ProjectListViewProps {
  /** Verified session projection, or null when no session is present. */
  session: WorkbookSession | null;
  /** Tenant-scoped drafts to list for the verified session. */
  drafts: readonly workbooks.WorkbookDraft[];
  /** Tenant-scoped immutable editions to list for the verified session. */
  editions: readonly workbooks.WorkbookEdition[];
}

/**
 * Renders the workbook publishing home view: sign-in gate, authorization gate,
 * and the tenant-scoped draft and edition lists.
 *
 * The component is presentational: data is supplied by the caller and no
 * business logic or filesystem access happens here.
 * @param props Session projection and repository results to render.
 * @returns The project-list home view.
 */
export function ProjectListView({
  session,
  drafts,
  editions,
}: ProjectListViewProps): ReactNode {
  if (session === null) {
    return (
      <main>
        <h1>Workbook Publishing</h1>
        <p>Sign-in is required to view projects.</p>
      </main>
    );
  }

  if (session.role !== "WORKBOOK_ADMIN") {
    return (
      <main>
        <h1>Workbook Publishing</h1>
        <p>Access denied. Workbook access requires the WORKBOOK_ADMIN role.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Workbook Publishing</h1>
      <section>
        <h2>Drafts</h2>
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
      </section>
      <section>
        <h2>Editions</h2>
        {editions.length === 0 ? (
          <p>No editions published yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Edition</th>
                <th>Draft</th>
                <th>Version</th>
                <th>Title</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {editions.map((edition) => (
                <tr key={edition.editionId}>
                  <td>{edition.editionId}</td>
                  <td>{edition.draftId}</td>
                  <td>{edition.version}</td>
                  <td>{edition.snapshot.content.title}</td>
                  <td>{edition.publishedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p>
        Editions are immutable once published. Editing a released edition
        requires a new draft revision.
      </p>
    </main>
  );
}
