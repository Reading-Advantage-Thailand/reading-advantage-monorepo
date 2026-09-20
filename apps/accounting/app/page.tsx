import type { JSX } from "react";
import { getAccountingSessionOrRedirect } from "@/app/lib/auth";
import { actorFromUser } from "@/app/lib/route-helpers";
import { listAccountingSubmissions } from "@/app/lib/submissions";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";
import { NewSubmissionForm } from "./_components/new-submission-form";
import { PendingSubmissionsList } from "./_components/pending-submissions-list";
import { SubmissionHistoryList } from "./_components/submission-history-list";

/** Returns only pending submissions for the client review list. */
function pendingOnly(
  submissions: readonly AccountingSubmission[],
): readonly AccountingSubmission[] {
  return submissions.filter((submission) => submission.status === "pending");
}

/** Returns only decided submissions for the client history view. */
function decidedOnly(
  submissions: readonly AccountingSubmission[],
): readonly AccountingSubmission[] {
  return submissions.filter((submission) => submission.status !== "pending");
}

/**
 * Renders the accounting workspace for the signed-in actor.
 * @returns The server-rendered review page.
 */
export default async function HomePage(): Promise<JSX.Element> {
  const session = await getAccountingSessionOrRedirect();
  const actor = actorFromUser(session.user);
  const submissions = await listAccountingSubmissions({ actor });
  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Finance workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Accounting workspace</h1>
          <p className="max-w-2xl text-muted-foreground">
            Submit expenses and bills with private evidence. Records remain pending
            until the owner reviews them.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <NewSubmissionForm />
          <PendingSubmissionsList submissions={pendingOnly(submissions)} actorRole={actor.role} />
        </div>

        <SubmissionHistoryList submissions={decidedOnly(submissions)} />
      </div>
    </main>
  );
}
