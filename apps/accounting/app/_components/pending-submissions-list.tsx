"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { derivedRate } from "@/app/lib/derived-rate";

/** Props for the pending submissions list. */
export interface PendingSubmissionsListProps {
  /** Submissions visible to the signed-in actor. */
  readonly submissions: readonly AccountingSubmission[];
  /** Role of the signed-in accounting actor. */
  readonly actorRole: "STAFF" | "OWNER" | "ACCOUNTANT";
}

const controlClassName =
  "flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type ActionMessage = {
  readonly kind: "success" | "error";
  readonly text: string;
};

/** Checks whether an unknown value is a record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads a JSON response without exposing a parser exception to the UI. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Returns a safe message from an API error body or a local fallback. */
function messageFromBody(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.message === "string" && body.message) {
    return body.message;
  }
  return fallback;
}

/** Formats a minor-unit amount as a localized currency value. */
function formatMinorAmount(amountMinor: string, currency: string): string {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  });
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const amount = BigInt(amountMinor);
  const isNegative = amount < 0n;
  const absoluteAmount = isNegative ? -amount : amount;
  const scale = 10n ** BigInt(exponent);
  const major = absoluteAmount / scale;
  if (exponent === 0) {
    return `${isNegative ? "-" : ""}${formatter.format(major)}`;
  }
  const fraction = absoluteAmount % scale;
  const fractionText = fraction.toString().padStart(exponent, "0");
  const formatted = formatter
    .formatToParts(major)
    .map((part) => (part.type === "fraction" ? fractionText : part.value))
    .join("");
  return `${isNegative ? "-" : ""}${formatted}`;
}

/**
 * Maps an approve or reject HTTP status to a user-facing message.
 * @param status HTTP status from the review route.
 * @param body Parsed JSON body, when present.
 * @returns Message shown in the list alert.
 */
function actionErrorMessage(status: number, body: unknown): string {
  if (status === 400) {
    return messageFromBody(body, "We could not update this submission.");
  }
  if (status === 403) {
    return "You do not have permission to review this submission.";
  }
  if (status === 404) {
    return messageFromBody(body, "Submission not found");
  }
  return messageFromBody(body, "We could not update this submission.");
}

/** Builds the export link for an optional inclusive date range. */
function buildExportHref(from: string, to: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/api/submissions/export?${query}` : "/api/submissions/export";
}

/**
 * Renders pending submissions for the signed-in accounting actor.
 * @param props Visible submissions and the actor role.
 * @returns The pending-submissions review card.
 */
export function PendingSubmissionsList({
  submissions: submissionsProp,
  actorRole,
}: PendingSubmissionsListProps): JSX.Element {
  const [submissions, setSubmissions] = useState<readonly AccountingSubmission[]>(
    submissionsProp,
  );
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    setSubmissions(submissionsProp);
  }, [submissionsProp]);

  const canExport = actorRole === "OWNER" || actorRole === "ACCOUNTANT";
  const canReview = actorRole === "OWNER";

  /** Approves one pending submission through the existing review route. */
  async function handleApprove(submissionId: string): Promise<void> {
    setActingId(submissionId);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: "POST",
      });
      const body = await readJson(response);
      if (!response.ok) {
        setActionMessage({
          kind: "error",
          text: actionErrorMessage(response.status, body),
        });
        return;
      }
      setSubmissions((current) =>
        current.filter((submission) => submission.id !== submissionId),
      );
      setRejectingId((current) => (current === submissionId ? null : current));
      setActionMessage({ kind: "success", text: "Approved" });
      router.refresh();
    } catch {
      setActionMessage({
        kind: "error",
        text: "We could not update this submission.",
      });
    } finally {
      setActingId(null);
    }
  }

  /** Rejects one pending submission after a non-blank reason is provided. */
  async function handleReject(submissionId: string): Promise<void> {
    if (rejectReason.trim() === "") {
      setActionMessage({ kind: "error", text: "Reason is required" });
      return;
    }
    setActingId(submissionId);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        setActionMessage({
          kind: "error",
          text: actionErrorMessage(response.status, body),
        });
        return;
      }
      setSubmissions((current) =>
        current.filter((submission) => submission.id !== submissionId),
      );
      setRejectingId(null);
      setRejectReason("");
      setActionMessage({ kind: "success", text: "Rejected" });
      router.refresh();
    } catch {
      setActionMessage({
        kind: "error",
        text: "We could not update this submission.",
      });
    } finally {
      setActingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle id="pending-submissions-heading">Pending submissions</CardTitle>
        <CardDescription>
          Your submissions appear here after the server accepts them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canExport ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label htmlFor="export-from" className="text-sm font-medium">
                From
              </label>
              <input
                id="export-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className={controlClassName}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="export-to" className="text-sm font-medium">
                To
              </label>
              <input
                id="export-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className={controlClassName}
              />
            </div>
            <a
              href={buildExportHref(fromDate, toDate)}
              className="inline-block text-sm font-medium text-primary underline"
            >
              Export approved submissions (CSV)
            </a>
          </div>
        ) : null}
        {actionMessage ? (
          <p
            role={actionMessage.kind === "error" ? "alert" : "status"}
            aria-label={actionMessage.text}
            className={
              actionMessage.kind === "error"
                ? "text-sm text-destructive"
                : "text-sm text-green-800"
            }
          >
            {actionMessage.text}
          </p>
        ) : null}
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending submissions yet.
          </p>
        ) : (
          <ul aria-labelledby="pending-submissions-heading" className="space-y-4">
            {submissions.map((submission) => {
              const isActing = actingId === submission.id;
              const showDerivedRate = submission.money.currency !== "THB";
              const derivedRateValue =
                showDerivedRate && submission.settledThbAmount
                  ? derivedRate(
                      submission.money.amountMinor,
                      submission.settledThbAmount,
                      submission.money.currency,
                    )
                  : "";
              return (
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
                        <Badge variant="secondary">Pending</Badge>
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
                              {formatMinorAmount(submission.settledThbAmount, "THB")}
                            </dd>
                          </div>
                        ) : null}
                        {showDerivedRate && derivedRateValue ? (
                          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                            <dt className="font-medium">Derived rate</dt>
                            <dd>{derivedRateValue}</dd>
                          </div>
                        ) : null}
                        <div className="space-y-1">
                          <dt className="font-medium">Evidence reference</dt>
                          <dd className="break-all font-mono text-xs text-muted-foreground">
                            {submission.evidenceReference}
                          </dd>
                        </div>
                      </dl>
                      {canReview ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              disabled={isActing}
                              onClick={() => {
                                void handleApprove(submission.id);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isActing}
                              onClick={() => {
                                setRejectingId(submission.id);
                                setRejectReason("");
                                setActionMessage(null);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                          {rejectingId === submission.id ? (
                            <div className="space-y-2">
                              <label htmlFor="reject-reason" className="text-sm font-medium">
                                Rejection reason
                              </label>
                              <textarea
                                id="reject-reason"
                                rows={3}
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                className={controlClassName}
                              />
                              {rejectReason.trim() === "" ? (
                                <p className="text-sm text-destructive">Reason is required</p>
                              ) : null}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  disabled={isActing || rejectReason.trim() === ""}
                                  onClick={() => {
                                    void handleReject(submission.id);
                                  }}
                                >
                                  Submit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isActing}
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
