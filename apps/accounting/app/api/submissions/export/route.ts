/**
 * CSV export of approved accounting submissions.
 *
 * Filters `listAccountingSubmissions` to `status === "approved"` and an
 * optional inclusive local-date range (`from`/`to` via the business time zone),
 * then emits a BOM-free UTF-8 CSV with CRLF line endings. OWNER and ACCOUNTANT
 * may export; STAFF is denied with 403.
 */
import { requireAccountingSession } from "@/app/lib/auth";
import type { accountingSessionUser } from "@/app/lib/company-oidc";
import { derivedRate } from "@/app/lib/derived-rate";
import { listAccountingSubmissions } from "@/app/lib/submissions";
import type { AccountingActor } from "@reading-advantage/backend/accounting";
import { z } from "zod";

/** Session user projection produced by the accounting guard. */
type AccountingSessionUser = NonNullable<ReturnType<typeof accountingSessionUser>>;

/**
 * Maps the guard's session user to a domain actor.
 * @param user Verified accounting session user.
 * @returns Domain actor carrying account, company, and role.
 */
function actorFromUser(user: AccountingSessionUser): AccountingActor {
  return {
    accountId: user.id,
    companyId: user.organizationId,
    role: user.role,
  };
}

/**
 * Serializes a JSON response body.
 * @param body Response payload.
 * @param status HTTP status code.
 * @returns JSON response.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Converts an ISO submission timestamp to the configured business date. */
function businessDate(submittedAt: string): string {
  const timeZone = process.env.ACCOUNTING_TIME_ZONE ?? "Asia/Bangkok";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(submittedAt));
}

/**
 * Handles GET /api/submissions/export: CSV export of approved submissions.
 * @param request Request carrying optional from/to query params.
 * @returns 200 with CSV, 400 for invalid range, 403 for STAFF, or guard's 401/403.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const actor = actorFromUser(guard.session.user);
  if (actor.role !== "OWNER" && actor.role !== "ACCOUNTANT") {
    return jsonResponse(
      { message: "Only owners and accountants can export submissions" },
      403,
    );
  }

  const querySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
  });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return jsonResponse({ message: "Invalid date range" }, 400);
  }

  const submissions = await listAccountingSubmissions({ actor });

  const filtered = submissions.filter((submission) => {
    if (submission.status !== "approved") return false;
    const localDate = businessDate(submission.submittedAt);
    if (parsed.data.from && localDate < parsed.data.from) return false;
    if (parsed.data.to && localDate > parsed.data.to) return false;
    return true;
  });

  const HEADERS = [
    "id",
    "submitted_at",
    "payee",
    "category",
    "currency",
    "amount_minor",
    "settled_thb_minor",
    "derived_rate",
    "status",
    "evidence_reference",
  ];
  const escape = (cell: string): string =>
    /[",\r\n]/u.test(cell) ? `"${cell.replace(/"/gu, '""')}"` : cell;
  const escapeText = (cell: string): string =>
    escape(/^\s*[=+@-]/u.test(cell) ? `'${cell}` : cell);
  const lines: string[] = [];
  lines.push(HEADERS.join(","));
  for (const submission of filtered) {
    const rate =
      submission.money.currency === "THB" || !submission.settledThbAmount
        ? ""
        : derivedRate(
            submission.money.amountMinor,
            submission.settledThbAmount,
            submission.money.currency,
          );
    const submittedDate = businessDate(submission.submittedAt);
    lines.push(
      [
        escapeText(submission.id),
        escapeText(submittedDate),
        escapeText(submission.payee),
        escapeText(submission.category),
        escapeText(submission.money.currency),
        escape(submission.money.amountMinor),
        escape(submission.settledThbAmount ?? ""),
        escape(rate),
        escapeText(submission.status),
        escapeText(submission.evidenceReference),
      ].join(","),
    );
  }
  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="accounting-submissions.csv"',
      "cache-control": "no-store",
    },
  });
}
