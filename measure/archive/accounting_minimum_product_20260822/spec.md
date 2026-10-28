# Accounting Minimum Product

## Objective

Close the gap between the owner-decision track
(`accounting_product_simplification_20260822`) and a real owner workflow.
That track ships the audit-backed approve/reject API routes and the append-only
audit table; this track adds the owner-facing surface that uses them, plus the
S8-lite CSV export that hands records to the external accountant's tool.

This is a feature track. It ships three small stories, no new tables, no new
packages, and no valuation modules. The derived rate is a display-time
expression, never a stored field.

## Scope

### In scope

- A role-aware review section on the main page where an OWNER sees every
  pending submission in the company scope with payee, kind, category, original
  amount + currency, settled THB amount (when present), the display-only derived rate
  (`settledThbAmount ÷ source amount`, 2dp half-up), and the evidence reference.
- Approve and reject actions on the review page for OWNER actors, calling the
  Track A `POST /api/submissions/[id]/approve` and `.../reject` routes. Reject
  requires a reason. STAFF and ACCOUNTANT actors see the list read-only.
- A BOM-free UTF-8 CSV export of approved submissions for OWNER and ACCOUNTANT
  actors, with an optional date-range query parameter.

### Out of scope

- New database tables. The audit table added by Track A is enough.
- New packages, new ports, new provider SDKs.
- Stored rate fields, valuation modules, currency-conversion services. The
  derived rate is computed at display time from the `settledThbAmount`
  column; it is never authoritative.
- S5 ledger, S6 VAT/tax invoices, S7 WHT as build items (verdict: buy).
- PDF export, ZIP export, export-pack machinery, scheduled exports.
- Email, notifications, accountant tool integrations (FlowAccount/PEAK, etc.).
- Accountancy-tool schema work. The CSV is a flat column dump; the
  accountant's import schema is the next conversation.
- Changes outside `apps/accounting/`, `apps/accounting/app/`, and the
  app-local helper files (`app/lib/*`).
- Unrelated working-tree changes (advantage-games deletions, `AGENTS.md`,
  `packages/domain/src/games/*`, sales-mastery test).

## Stories

### Story S-MP1: Owner review & approve/reject

**As an** owner (and as a read-only viewer for STAFF/ACCOUNTANT)
**I want** to see every pending submission on the main page and approve or
reject each one with a reason
**So that** the books only contain reviewed facts and rejected items carry
the owner's explanation

**Acceptance Criteria:**

- Given an OWNER session, When I open the main page, Then I see every
  pending submission in the company scope, rendered with payee, kind,
  category, original amount + currency, settled THB amount (when present),
  the display-only derived rate (settled THB ÷ source amount, 2dp half-up,
  hidden when the submission currency is THB), and the evidence reference.
- Given an OWNER session and a pending submission, When I click Approve,
  Then the page calls `POST /api/submissions/[id]/approve` and, on success,
  removes the submission from the pending list.
- Given an OWNER session and a pending submission, When I click Reject,
  Then a reason field appears; submitting it calls
  `POST /api/submissions/[id]/reject` with `{ reason }`; on success, the
  submission is removed from the pending list. A blank or whitespace-only
  reason is rejected client-side and never sent.
- Given a STAFF session, When I open the main page, Then the pending list
  shows only my own submissions (the existing visibility rule, unchanged)
  with no approve/reject controls.
- Given an ACCOUNTANT session, When I open the main page, Then I see every
  pending submission in the company scope with no approve/reject controls.
- Given any approve/reject failure, When the route returns 400, 403, 404,
  or 500, Then the page surfaces a user-facing message and keeps the
  submission in the list.

**Estimate:** M
**Priority:** Must

### Story S-MP2: CSV export of approved submissions (S8-lite)

**As an** owner or accountant
**I want** to download a CSV of every approved submission, optionally
filtered by date range
**So that** I can hand the records off to FlowAccount/PEAK for statutory
bookkeeping without manual re-keying

**Acceptance Criteria:**

- Given an OWNER or ACCOUNTANT session, When I `GET
  /api/submissions/export`, Then the response is `200` with
  `Content-Type: text/csv; charset=utf-8` and a body containing a header row
  followed by one row per approved submission in the company scope.
- Given the same actor, When I `GET /api/submissions/export?from=YYYY-MM-DD`
  and/or `?to=YYYY-MM-DD`, Then only submissions with `submitted_at` inside
  the inclusive range are included.
- Given a STAFF session, When I `GET /api/submissions/export`, Then the
  response is `403`.
- Given any request (authenticated or not), Then the body is BOM-free UTF-8
  with CRLF line endings, an ISO-8601 date in `submitted_at`, plain decimal
  amounts (no thousand separators, no currency symbols), and an empty body
  (header row only) when no submissions qualify.
- The columns are exactly: `id, submitted_at, payee, category, currency,
  amount_minor, settled_thb_minor, derived_rate, status, evidence_reference`.
  Empty `settled_thb_minor` is rendered as an empty cell; empty `derived_rate`
  is rendered as an empty cell; `status` is always `approved`.

**Estimate:** S
**Priority:** Must

### Story S-MP3: Settlement-derived rate display (S3-lite)

**As an** owner
**I want** to see the settled THB ÷ source-amount rate next to any non-THB
submission on the review page
**So that** I can sanity-check what the bank actually paid before I approve

**Acceptance Criteria:**

- Given a non-THB submission with `amountMinor = "15000"` (i.e. $150.00)
  and `settledThbAmount = "520500"` (i.e. ฿5,205.00), When rendered, Then
  the displayed derived rate is `34.70` (520500 ÷ 15000 = 34.70, 2dp
  half-up).
- Given a non-THB submission whose division yields a repeating decimal
  (e.g. `settledThbAmount = "100000"` and `amountMinor = "30000"` → 3.3333…),
  When rendered, Then the displayed rate rounds half-up to `3.33`.
- Given a THB submission, When rendered, Then the derived rate column is
  hidden.
- The derived rate is computed at display time from
  `settledThbAmount ÷ amountMinor` in bigint arithmetic; it is never stored
  in the database, never persisted to the submission row, and never
  authoritative. A change to `settledThbAmount` updates the displayed rate
  on the next render.

**Estimate:** XS
**Priority:** Should

## Non-Functional Requirements

- Build on the Track A approval API routes (`POST /api/submissions/[id]/
  approve` and `.../reject`). Do not add a parallel approval path.
- Zod validates every external boundary: the CSV query parameters, the
  reject body sent by the client, the rate helper's string inputs.
- Decimal arithmetic only. Use `bigint` for the rate helper; never
  `Number` for money.
- Server components where practical. The submission form and the review
  list (with its approve/reject controls) are the only client components on
  the main page; the page itself, the actor derivation, and the listing
  call happen server-side.
- No new packages, no new database tables, no new ports, no provider SDKs.
- Match the existing app's Tailwind + shadcn/ui conventions
  (`@reading-advantage/ui` components, `Card`/`Button`/`Badge`/`Input`/
  `Label`, the same `controlClassName`/`invalidControlClassName` pattern).
- Every existing test in `apps/accounting/` keeps passing unchanged.
- Money is carried as decimal strings end-to-end. No `Number.parseFloat`,
  no `Intl.NumberFormat`, no `toFixed` anywhere on the path.

## Acceptance Criteria (track-level)

1. An OWNER opens the main page, sees every pending submission in the
   company scope, can approve any of them, and can reject any of them with
   a non-blank reason. Each action invokes the Track A API route and
   updates the list on success.
2. A STAFF actor sees only their own pending submissions with no
   approve/reject controls. An ACCOUNTANT actor sees every pending
   submission with no approve/reject controls.
3. The CSV export returns BOM-free UTF-8 with CRLF line endings, the exact
   column order listed in S-MP2, plain decimal amounts, and ISO-8601 dates.
   It returns 403 to STAFF and is accessible to OWNER and ACCOUNTANT.
4. The derived rate is rendered for every non-THB submission (2dp half-up,
   bigint) and never for a THB submission. It is computed at display time
   only.
5. `pnpm turbo run test check-types lint --filter=accounting` passes with
   no new failures against the pre-existing baseline. `measure/doctor.sh`
   shows no new findings attributable to this track.