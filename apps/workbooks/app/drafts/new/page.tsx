import type { ReactNode } from "react";

/**
 * Explains how workbook drafts are created and fails closed on arbitrary
 * pasted or URL-supplied source content. Drafts are created exclusively
 * through the legacy import CLI today, and through the source catalog once it
 * lands; this route intentionally carries no form, textarea, or input so the
 * pasted-remote ingestion vector stays closed for old bookmarks.
 * @returns The new-draft guidance page.
 */
export default async function NewDraftPage(): Promise<ReactNode> {
  return (
    <main>
      <h1>New draft</h1>
      <p>
        Drafts are not created by pasting source content. Source stays owned by
        the app that authored it, and workbook drafts are created exclusively
        through two trusted paths:
      </p>
      <ul>
        <li>The legacy import CLI, which ingests lesson files from disk.</li>
        <li>
          The source catalog, which will list eligible, rights-cleared sources
          for selection once it lands.
        </li>
      </ul>
      <p>
        Pasting article JSON or supplying a URL here is not accepted and no
        draft is created. If you reached this page from an old bookmark, use
        the import CLI or revisit the catalog from the workspace.
      </p>
    </main>
  );
}
