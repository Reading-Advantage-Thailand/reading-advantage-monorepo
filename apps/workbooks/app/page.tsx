import type { ReactNode } from "react";
import { getWorkbookRepository } from "../lib/repository";
import { getWorkbookSession } from "./lib/session";
import { ProjectListView } from "./projects/project-list-view";

/**
 * Home page of the workbook publishing platform: a thin route that resolves
 * the verified session, lists the tenant's drafts and editions through the
 * domain repository, and renders the project-list view. No business logic or
 * filesystem access lives in this page.
 * @returns The project-list home view.
 */
export default async function HomePage(): Promise<ReactNode> {
  const session = await getWorkbookSession();
  if (session === null) {
    return <ProjectListView session={null} drafts={[]} editions={[]} />;
  }
  if (session.role !== "WORKBOOK_ADMIN") {
    return <ProjectListView session={session} drafts={[]} editions={[]} />;
  }

  const repository = getWorkbookRepository();
  const [drafts, editions] = await Promise.all([
    repository.listDrafts(session.tenantId, 50),
    repository.listEditions(session.tenantId, 50),
  ]);

  return (
    <ProjectListView
      session={session}
      drafts={drafts}
      editions={editions}
    />
  );
}
