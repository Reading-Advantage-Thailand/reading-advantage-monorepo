import type { JSX } from "react";
import type { YearFileFactsGroup, YearFileFactRow } from "@reading-advantage/backend/accounting";
import { getAccountingSessionOrRedirect } from "@/app/lib/auth";
import { actorFromUser } from "@/app/lib/route-helpers";
import { listYearFileFacts } from "@/app/lib/year-files";

/**
 * Renders one read-only year-file row: the period, the filing kind, the fact
 * names, the history marker, and the evidence link. The row holds no edit,
 * approve, reject, or delete control.
 * @param row Year-file row of the group.
 * @returns The row markup.
 */
function YearFileRow({ row }: { readonly row: YearFileFactRow }): JSX.Element {
  const factNames = Object.keys(row.facts);
  return (
    <article className="rounded-md border p-3 text-sm">
      <p className="font-medium">
        {row.formType} · {row.filingKind}
      </p>
      <p className="text-muted-foreground">
        Period: {row.periodStart} to {row.periodEnd}
      </p>
      {row.isHistory ? <p>History</p> : null}
      {factNames.length > 0 ? (
        <p className="text-muted-foreground">
          Facts: {factNames.join(", ")}
        </p>
      ) : null}
      <a
        className="text-primary underline"
        href={row.evidenceReference}
      >
        Evidence
      </a>
    </article>
  );
}

/**
 * Renders one group of the year-end view: one tax year and one form type.
 * @param group Year-file group of the list.
 * @returns The group markup.
 */
function YearFileGroup({
  group,
}: {
  readonly group: YearFileFactsGroup;
}): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">
        Tax year {group.taxYear} · {group.formType}
      </h2>
      <div className="space-y-2">
        {group.rows.map((row) => (
          <YearFileRow key={row.intakeDocumentId} row={row} />
        ))}
      </div>
    </section>
  );
}

/**
 * Renders the read-only filings and year-end view for the signed-in actor.
 * The actor must hold the year-file read permission; the domain function
 * refuses every other role.
 * @returns The server-rendered read-only page.
 */
export default async function FilingsPage(): Promise<JSX.Element> {
  const session = await getAccountingSessionOrRedirect();
  const actor = actorFromUser(session.user);
  const groups = await listYearFileFacts({ actor });
  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Year end
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Filings and year end
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Read-only view of the imported year files. The rows carry the
            period, the filing kind, the fact names, the history marker, and a
            link to the private evidence.
          </p>
        </header>
        <div className="space-y-8">
          {groups.map((group) => (
            <YearFileGroup
              key={`${group.taxYear}-${group.formType}`}
              group={group}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
