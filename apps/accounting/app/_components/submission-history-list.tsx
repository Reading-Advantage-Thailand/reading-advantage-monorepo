"use client";

import { useState } from "react";
import type { JSX } from "react";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { formatMinorAmount } from "@/app/lib/format-minor-amount";

/** Props for the decision history list. */
export interface SubmissionHistoryListProps {
  /** Approved and rejected submissions visible to the signed-in actor. */
  readonly submissions: readonly AccountingSubmission[];
}

type StatusFilter = "all" | "approved" | "rejected";

const controlClassName =
  "flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const statusFilterOptions: ReadonlyArray<{
  readonly value: StatusFilter;
  readonly label: string;
}> = [
  { value: "all", label: "All decisions" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/**
 * Renders the approved and rejected submissions with a status filter.
 * @param props Decided submissions visible to the signed-in actor.
 * @returns The decision-history card.
 */
export function SubmissionHistoryList({
  submissions,
}: SubmissionHistoryListProps): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const visibleSubmissions = submissions.filter(
    (submission) =>
      statusFilter === "all" || submission.status === statusFilter,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle id="submission-history-heading">Decision history</CardTitle>
        <CardDescription>
          Approved and rejected submissions stay visible here after review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 sm:max-w-xs">
          <label htmlFor="history-status-filter" className="text-sm font-medium">
            Status
          </label>
          <select
            id="history-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
            }}
            className={controlClassName}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {visibleSubmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No decided submissions yet.
          </p>
        ) : (
          <ul
            aria-labelledby="submission-history-heading"
            className="space-y-4"
          >
            {visibleSubmissions.map((submission) => (
              <li key={submission.id}>
                <Card className="shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{submission.payee}</h3>
                        <p className="text-sm text-muted-foreground">
                          {submission.kind === "bill" ? "Bill" : "Expense"} ·{" "}
                          {submission.category}
                        </p>
                      </div>
                      {submission.status === "approved" ? (
                        <Badge>Approved</Badge>
                      ) : (
                        <Badge variant="destructive">Rejected</Badge>
                      )}
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <dt className="font-medium">Original amount</dt>
                        <dd>
                          {formatMinorAmount(
                            submission.money.amountMinor,
                            submission.money.currency,
                          )}
                        </dd>
                      </div>
                      {submission.settledThbAmount ? (
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                          <dt className="font-medium">Settled THB amount</dt>
                          <dd>
                            {formatMinorAmount(
                              submission.settledThbAmount,
                              "THB",
                            )}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
