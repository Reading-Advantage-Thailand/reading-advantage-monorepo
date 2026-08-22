# Implementation plan

Track: `accounting_minimum_product_20260822` (feature). Spec: `./spec.md`.
Estimated tasks: 7. Commit-SHA discipline: append the short SHA to each task
line after committing, per `measure/workflow.md`.

## Working-tree discipline (read first)

The tree carries unrelated WIP (advantage-games deletions, `AGENTS.md`,
`packages/domain/src/games/*`, sales-mastery test). Never run `git add -A`
or `git commit -a` in this track. Stage only the files each task names.

Commitlint: non-chore subjects must carry
`(track_id: accounting_minimum_product_20260822)`.

## Phase ordering rationale

Phase 1 restructures the main page from a single client component into a
server page with two client islands, so the OWNER-only approve/reject
controls and the read-only STAFF/ACCOUNTANT list render without shipping
the whole form's JavaScript to STAFF actors. Phase 2 adds the tiny derived
rate helper as its own task so it can ship behind a unit test before the
list component depends on it. Phase 3 ships the CSV export route and the
download link; the route is contract-tested before the implementation so
the column shape, encoding, and date filter are pinned down first. Phase 4
runs the full gates and closes the track.

---

## Phase 1: Role-aware review page (S-MP1)

### Task 1: Red tests for the restructured review page [x] [checkpoint: 4609232]

Files:

- New file `apps/accounting/app/_components/pending-submissions-list.tsx`:
  a minimal stub exporting `PendingSubmissionsList` with the expected props so
  the test file below compiles. It can render nothing or a placeholder; the
  tests will fail on missing assertions (red).
- New file `apps/accounting/app/_components/pending-submissions-list.test.tsx`.
  Mirror the mocking style of `apps/accounting/app/page.test.tsx` exactly:
  `vi.stubGlobal("fetch", fetchMock)`, `fireEvent` + `waitFor`, the same
  `jsonResponse` helper. The component receives submissions as props and calls
  `fetch` directly for approve/reject, so no `@/app/lib/submissions` module mock
  is needed. Cover:
    - OWNER actor: list renders payee, kind, category, original amount +
      currency, settled THB amount, derived rate for non-THB submissions,
      and the evidence reference.
    - OWNER actor: clicking Approve posts to
      `/api/submissions/{id}/approve` (no body), removes the submission
      from the list on success, and surfaces a status message.
    - OWNER actor: clicking Reject reveals a reason textarea; submitting a
      blank reason keeps the submission in place and shows a "Reason is
      required" status; submitting a non-blank reason posts
      `/api/submissions/{id}/reject` with `{ reason }`, removes the
      submission on success.
    - OWNER actor: a non-2xx response (e.g. 404) keeps the submission in
      the list and shows a user-facing error message.
    - STAFF actor: list renders their own submissions only and exposes no
      approve/reject buttons.
    - ACCOUNTANT actor: list renders every pending submission with no
      approve/reject buttons.
    - Approved and rejected submissions are not rendered in the pending list.
    - THB submission: derived rate cell is not in the DOM.

Run red:

```
CI=true pnpm --filter accounting exec vitest run \
  app/_components/pending-submissions-list.test.tsx
```

Commit (still red, per the contract-first discipline):
`test(accounting): red tests for the role-aware review page (track_id: accounting_minimum_product_20260822)`

### Task 2: Convert page.tsx to a server component and extract the form [x] [checkpoint: d063cbd]

Files:

- Create `apps/accounting/app/_components/new-submission-form.tsx`. Extract
  only the submission-form card and its supporting helpers from the existing
  client `apps/accounting/app/page.tsx` into this new client component, renamed
  to `NewSubmissionForm`. Keep the `"use client"` directive. Keep every
  form-related state hook (`currency`, `isSubmitting`, `fieldErrors`,
  `formMessage`), every `fireEvent`-friendly `aria-*` attribute, every existing
  `id`/`name` binding, and the `FieldError` helper. Keep `isSubmission` so the
  submit success response can still be validated; drop `isSubmissionList`, the
  submissions-list state (`submissions`, `isLoading`, `loadError`), and the
  `useEffect` that fetched `/api/submissions`. The export becomes
  `export function NewSubmissionForm()`. Add `const router = useRouter()`
  at the top of the component (imported from `next/navigation`). After a
  successful submit, replace the old
  `setSubmissions((current) => [body, ...current])` update with
  `router.refresh()` so the server page refetches the pending list.
  Do not move the "Pending submissions" card here; that becomes
  `PendingSubmissionsList` in Task 3.
- Add a server-component session helper in `apps/accounting/app/lib/auth.ts`:
  `getAccountingSessionOrRedirect(): Promise<{ user: AccountingSessionUser }>`.
  It reads the Accounting session cookie via `await cookies()` from `next/headers`,
  reuses the existing OIDC introspection path, and calls `redirect("/login")`
  from `next/navigation` on any missing, revoked, non-accounting, or
  introspection-failing session.
  Extract a shared token-to-user helper from `requireAccountingSession` if
  needed so the route guard and the server-component guard do not duplicate
  introspection logic.
- Create a minimal `apps/accounting/app/_components/pending-submissions-list.tsx`
  stub (accept the props and render a placeholder) so the new server page
  compiles before Task 3 fills in the full implementation.
- Create `apps/accounting/app/page.tsx` as an async server component
  (no `"use client"` directive). Body:

  ```tsx
  import { accountingSessionUser } from "@/app/lib/company-oidc";
  import { getAccountingSessionOrRedirect } from "@/app/lib/auth";
  import { listAccountingSubmissions } from "@/app/lib/submissions";
  import type { AccountingActor } from "@reading-advantage/backend/accounting";
  import { NewSubmissionForm } from "./_components/new-submission-form";
  import { PendingSubmissionsList } from "./_components/pending-submissions-list";

  type AccountingSessionUser = NonNullable<
    ReturnType<typeof accountingSessionUser>
  >;

  function actorFromUser(user: AccountingSessionUser): AccountingActor {
    return { accountId: user.id, companyId: user.organizationId, role: user.role };
  }

  export default async function HomePage(): Promise<JSX.Element> {
    const session = await getAccountingSessionOrRedirect();
    const actor = actorFromUser(session.user);
    const submissions = await listAccountingSubmissions({ actor });
    return (
      <main className="min-h-screen bg-muted/30 p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header>... (copy header markup verbatim from the current page)</header>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <NewSubmissionForm />
            <PendingSubmissionsList submissions={submissions} actorRole={actor.role} />
          </div>
        </div>
      </main>
    );
  }
  ```

  The session projection stays the one in `company-oidc.ts`
  (`accountingSessionUser`).
- Move the form-only tests from the old `apps/accounting/app/page.test.tsx`
  into a new file
  `apps/accounting/app/_components/new-submission-form.test.tsx`. The test
  that checks the page heading and the test that checks pending-submission
  rendering stay in `page.test.tsx` (rewritten for the server component in
  this task). Change the new-submission-form import to
  `import { NewSubmissionForm } from "./new-submission-form";`.
  Add a `vi.mock("next/navigation", ...)` block that returns a `useRouter`
  mock whose `refresh()` is a `vi.fn()`, so the moved tests still pass after
  the form calls `router.refresh()` on success.
- Create `apps/accounting/app/page.test.tsx` for the new server-component page.
  Port the page-heading assertion and the pending-list rendering assertion from
  the old `page.test.tsx`. Mock `next/headers`, `next/navigation`,
  `@/app/lib/auth` (`getAccountingSessionOrRedirect`), and
  `@/app/lib/submissions` (`listAccountingSubmissions`). Render the async
  component with `render(await HomePage())`. Cover:
    - The page calls `listAccountingSubmissions` once with the
      session-derived actor.
    - An unauthenticated or non-accounting session triggers `redirect("/login")`
      (assert the thrown redirect error).
    - The page renders the form and the list.

Verification:

```
CI=true pnpm --filter accounting exec vitest run \
  app/_components/new-submission-form.test.tsx \
  app/_components/pending-submissions-list.test.tsx \
  app/page.test.tsx
CI=true pnpm --filter accounting check-types
```

Commit: `feat(accounting): restructure the main page as a server component (track_id: accounting_minimum_product_20260822)`

### Task 3: Implement PendingSubmissionsList with role-aware controls [x] [checkpoint: eedd023]

Files:

- Replace the Task 1 stub in
  `apps/accounting/app/_components/pending-submissions-list.tsx`. `"use client"`. Props: `{ submissions: readonly AccountingSubmission[];
  actorRole: "STAFF" | "OWNER" | "ACCOUNTANT" }`, importing
  `AccountingSubmission` from `@reading-advantage/backend/accounting`.
  Internal state: `submissions` seeded from props and filtered to
  `status === "pending"`, mutating on action; plus `actionMessage`,
  `actingId`, `rejectingId`, `rejectReason`. Renders the
  existing pending-submissions `<Card>` shell exactly as today (the
  "Pending submissions" header, the "Loading"/error/empty branches, the
  `<ul>` of submission cards). Place one export link at the top of the card
  body, above the list, visible only when `actorRole === "OWNER"` or
  `actorRole === "ACCOUNTANT"`:
  `<a href="/api/submissions/export" className="...">Export approved submissions (CSV)</a>`.
  STAFF does not see the link. Inside each card:
    - Always: payee `<h3>`, kind + category, original amount + currency,
      settled THB amount (when present), evidence reference with the
      existing monospace styling.
    - For non-THB submissions only: a derived-rate row that calls
      `derivedRate(submission.money.amountMinor, submission.settledThbAmount)`
      from `@/app/lib/derived-rate` (added in Task 4). Hide the row when
      `submission.money.currency === "THB"`.
    - When `actorRole === "OWNER"`: an Approve `<Button>` and a Reject
      `<Button variant="outline">`. Clicking Reject sets `rejectingId` to
      the submission id and renders a textarea + Submit/Cancel pair
      inline beneath the buttons. Submit is disabled when
      `rejectReason.trim() === ""`. Submit and Approve post to
      `/api/submissions/${id}/approve` or `/api/submissions/${id}/reject`
      with `fetch`, parse the JSON response, on success remove the
      submission from the local `submissions` state and set
      `actionMessage` to "Approved" or "Rejected"; on non-2xx set an
      error message. While in flight, set `actingId` to disable both
      buttons on that card.
    - When `actorRole !== "OWNER"`: no buttons.

Verification:

```
CI=true pnpm --filter accounting exec vitest run \
  app/_components/pending-submissions-list.test.tsx \
  app/page.test.tsx
CI=true pnpm --filter accounting check-types
```

Commit: `feat(accounting): owner review and approve/reject on the main page (track_id: accounting_minimum_product_20260822)`

---

## Phase 2: Derived rate helper (S-MP3)

### Task 4: Derived rate helper with unit test [x] [checkpoint: 5c64210]

Files:

- New file `apps/accounting/app/lib/derived-rate.ts`:

  ```ts
  /**
   * Returns settled THB ÷ source-amount as a 2dp half-up decimal string.
   * Pure display-time helper; never authoritative, never persisted.
   * @param sourceAmountMinor Positive integer source amount in minor units.
   * @param settledThbMinor Positive integer settled THB amount in minor units.
   * @returns The derived rate as a fixed 2dp decimal string (e.g. "34.70").
   * @throws When either input is not a positive integer string.
   */
  export function derivedRate(
    sourceAmountMinor: string,
    settledThbMinor: string,
  ): string {
    if (!/^[1-9][0-9]*$/u.test(sourceAmountMinor)) {
      throw new Error("sourceAmountMinor must be a positive integer string");
    }
    if (!/^[1-9][0-9]*$/u.test(settledThbMinor)) {
      throw new Error("settledThbMinor must be a positive integer string");
    }
    const source = BigInt(sourceAmountMinor);
    const settled = BigInt(settledThbMinor);
    // Round settled/source to 2dp half-up, integer arithmetic only.
    const hundredths = (settled * 100n + source / 2n) / source;
    const integerPart = hundredths / 100n;
    const fractionPart = hundredths % 100n;
    return `${integerPart}.${fractionPart.toString().padStart(2, "0")}`;
  }
  ```

- New file `apps/accounting/app/lib/derived-rate.test.ts`:

  ```ts
  import { describe, expect, it } from "vitest";
  import { derivedRate } from "./derived-rate";

  describe("derivedRate", () => {
    it("computes 2dp half-up for $150.00 / ฿5,205.00", () => {
      expect(derivedRate("15000", "520500")).toBe("34.70");
    });
    it("computes 2dp half-up for $20.00 / ฿692.00 (the original spec example)", () => {
      expect(derivedRate("2000", "69200")).toBe("34.60");
    });
    it("rounds a repeating decimal half-up at 2dp", () => {
      expect(derivedRate("30000", "100000")).toBe("3.33");
    });
    it("rounds .005 up at 2dp", () => {
      // source 2000, settled 1010 → 0.505 → half-up to 0.51
      expect(derivedRate("2000", "1010")).toBe("0.51");
    });
    it("rejects a non-positive-integer string", () => {
      expect(() => derivedRate("0", "100")).toThrow();
      expect(() => derivedRate("100", "abc")).toThrow();
      expect(() => derivedRate("-1", "100")).toThrow();
    });
    it("preserves trailing zeros in the fraction", () => {
      expect(derivedRate("100", "20000")).toBe("200.00");
    });
  });
  ```

Verification:

```
CI=true pnpm --filter accounting exec vitest run \
  app/lib/derived-rate.test.ts \
  app/_components/pending-submissions-list.test.tsx \
  app/page.test.tsx
```

Commit: `feat(accounting): display-time derived-rate helper (S3-lite) (track_id: accounting_minimum_product_20260822)`

---

## Phase 3: CSV export route (S-MP2)

### Task 5: Red tests for the CSV export route [x] [checkpoint: 1a14d03]

New file `apps/accounting/app/api/submissions/export/route.ts`: a minimal
stub exporting `GET` so the test file below compiles. The body can return a
placeholder 200 CSV string; the tests will fail on exact assertions (red).

New file `apps/accounting/app/api/submissions/export/route.test.ts`.
Mirror `apps/accounting/app/api/submissions/route.test.ts` exactly:
`vi.hoisted` mocks at module boundaries, `@vitest-environment node`,
`expect(response.status).toBe(...)`, `await response.text()` reads. Mock
boundaries:

- `@/app/lib/auth` → `requireAccountingSession`
- `@/app/lib/submissions` → `listAccountingSubmissions`
- `@/app/lib/derived-rate` → `derivedRate` (optional; keep the math real)

The route under test is `GET` from
`@/app/api/submissions/export/route`. The role guard comes from the mock
return of `requireAccountingSession`. Cover:

- OWNER session, no query params → `200`, `Content-Type: text/csv;
  charset=utf-8`, body starts with the exact header row
  `id,submitted_at,payee,category,currency,amount_minor,settled_thb_minor,derived_rate,status,evidence_reference\r\n`.
- OWNER session, response body uses CRLF between every row, no BOM
  (`expect(body.startsWith("\uFEFF")).toBe(false)` or equivalent).
- OWNER session, one approved non-THB row → body contains
  `520500` (settled THB) and `34.70` (derived rate).
- OWNER session, one approved THB row → body contains an empty
  `settled_thb_minor` cell and an empty `derived_rate` cell.
- OWNER session, a pending row is excluded; a rejected row is excluded.
- OWNER session, `?from=2026-08-01&to=2026-08-31` → only submissions whose
  local `submittedAt` date falls inside the inclusive range are included. Include
  one row whose `submittedAt` carries a non-UTC offset (e.g.
  `2026-08-15T02:00:00+07:00`) so an instant-comparison implementation fails.
- OWNER session, invalid `?from=not-a-date` → `400`.
- ACCOUNTANT session → `200`.
- STAFF session → `403`.
- Empty scope → `200` with header row only.

Run red:

```
CI=true pnpm --filter accounting exec vitest run \
  app/api/submissions/export/route.test.ts
```

Commit: `test(accounting): red tests for the CSV export route (track_id: accounting_minimum_product_20260822)`

### Task 6: Implement the CSV export route [x] [checkpoint: b61771c]

Replace the Task 5 stub in
`apps/accounting/app/api/submissions/export/route.ts`. Follow
`app/api/submissions/route.ts` line-for-line for the `requireAccountingSession`
guard, the `actorFromUser` helper (copy the one from
`app/api/submissions/route.ts:33-39`), and the `jsonResponse` helper.
Import `z` from `zod` and `derivedRate` from `@/app/lib/derived-rate`.

The route is `GET`. Steps:

1. `const guard = await requireAccountingSession(request); if (!guard.ok) return guard.response;`
2. `const actor = actorFromUser(guard.session.user); if (actor.role !== "OWNER" && actor.role !== "ACCOUNTANT") return jsonResponse({ message: "Only owners and accountants can export submissions" }, 403);`
3. Parse query params with Zod:

   ```ts
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
   ```

4. `const submissions = await listAccountingSubmissions({ actor });`
5. Filter `submissions` by `status === "approved"`. Apply the inclusive
   `from`/`to` range by comparing the local date prefix of `submittedAt`
   (`submittedAt.slice(0, 10)`) against the `YYYY-MM-DD` query values. This
   avoids timezone-shifting a datetime with offset into the wrong calendar
   date.
6. Build the CSV with a `lines: string[]` array, joined with `"\r\n"`:

   ```ts
   const HEADERS = ["id", "submitted_at", "payee", "category", "currency", "amount_minor", "settled_thb_minor", "derived_rate", "status", "evidence_reference"];
   const escape = (cell: string): string =>
     /[",\r\n]/u.test(cell) ? `"${cell.replace(/"/gu, '""')}"` : cell;
   const lines: string[] = [];
   lines.push(HEADERS.join(","));
   for (const submission of filtered) {
     const rate = submission.money.currency === "THB" || !submission.settledThbAmount
       ? ""
       : derivedRate(submission.money.amountMinor, submission.settledThbAmount);
     const submittedDate = submission.submittedAt.slice(0, 10);
     lines.push([
       escape(submission.id),
       escape(submittedDate),
       escape(submission.payee),
       escape(submission.category),
       escape(submission.money.currency),
       escape(submission.money.amountMinor),
       escape(submission.settledThbAmount ?? ""),
       escape(rate),
       escape(submission.status),
       escape(submission.evidenceReference),
     ].join(","));
   }
   const body = lines.join("\r\n") + "\r\n";
   ```

7. Import `derivedRate` from `@/app/lib/derived-rate` (the helper from
   Task 4). Do not duplicate the math here.
8. Return:

   ```ts
   return new Response(body, {
     status: 200,
     headers: {
       "content-type": "text/csv; charset=utf-8",
       "content-disposition": 'attachment; filename="accounting-submissions.csv"',
       "cache-control": "no-store",
     },
   });
   ```

The body is built as a string and returned as a single chunk. Streaming
via a `ReadableStream` is acceptable but not required at this dataset
size; a single-string response satisfies the spec without adding a
transport concern.

Verification:

```
CI=true pnpm --filter accounting exec vitest run \
  app/api/submissions/export/route.test.ts \
  app/_components/pending-submissions-list.test.tsx \
  app/page.test.tsx
CI=true pnpm --filter accounting check-types
```

Commit: `feat(accounting): export approved submissions as CSV for owner and accountant (track_id: accounting_minimum_product_20260822)`

---

## Phase 4: Closeout

### Task 7: Full gates and track closeout

Run the full gates for the affected package:

```
pnpm turbo run test check-types lint --filter=accounting
measure/doctor.sh
```

The pre-existing baseline is small; this track changes one package and two
app-local helpers (`auth.ts` and `derived-rate.ts`). Any new failure blocks.

Closeout:

- Update `measure/tracks/accounting_minimum_product_20260822/metadata.json`:
  `status: "complete"`, `actual_tasks: 7`, fresh `updated_at`.
- Register the track in `measure/tracks.md` next to the other finance
  entries:

  ```
  - [x] **Track: Accounting Minimum Product** *Link: [./tracks/accounting_minimum_product_20260822/](./tracks/accounting_minimum_product_20260822/)*
    Owner review & approve/reject UI, derived-rate display, and CSV export
    of approved submissions for the external accountant.
  ```

- Update the codebase graph for the changed files:

  ```
  build-graph update ./graph.db \
    apps/accounting/app/page.tsx \
    apps/accounting/app/_components/new-submission-form.tsx \
    apps/accounting/app/_components/new-submission-form.test.tsx \
    apps/accounting/app/_components/pending-submissions-list.tsx \
    apps/accounting/app/_components/pending-submissions-list.test.tsx \
    apps/accounting/app/lib/auth.ts \
    apps/accounting/app/lib/derived-rate.ts \
    apps/accounting/app/lib/derived-rate.test.ts \
    apps/accounting/app/api/submissions/export/route.ts \
    apps/accounting/app/api/submissions/export/route.test.ts
  ```

Commit: `chore(measure): close out the accounting minimum product track (track_id: accounting_minimum_product_20260822)`