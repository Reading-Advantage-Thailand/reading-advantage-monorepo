# Production Diagnosis — 2026-08-10

## Availability

- Cloud Run service: `codecamp-advantage`, project `codecamp-advantage`, region
  `asia-southeast1`.
- Active revision at diagnosis: `codecamp-advantage-00025-vaz`, 100% traffic.
- `https://codecamp.reading-advantage.com/th/` returned HTTP 200 in 7.115s.
- No severity ERROR Cloud Run entries were returned for the preceding 24 hours.
- `/api/health` returned 404; the deployed app does not currently expose that
  historical runbook endpoint, so availability was verified through the real
  localized application route.

## Root Cause

The exercise backfill created a standalone exercise immediately before each
combined quiz and shifted the original quiz one order later. Later seed code
matched canonical lessons to existing lessons by order only. It therefore
rewrote each standalone exercise into the combined quiz's title/type/content,
while leaving the original shifted quiz row in place.

The module page renders every returned lesson by ID, and progress joins by
lesson ID. The screenshot is therefore the expected presentation of corrupted
curriculum metadata: two titles look identical while their valid progress rows
remain distinct.

## Aggregate Production Evidence

- Affected published modules: 14.
- Duplicate-looking lesson rows: 28.
- Learners with progress on those rows: 2.
- Progress rows on those rows: 43.
- Completed progress rows: 41.
- The reported `trpc-server-actions` module has:
  - earlier row: order 5, one exercise child, zero quiz questions, one completed
    learner and one in-progress learner;
  - later row: order 6, one redundant exercise child, five quiz questions, two
    completed learners with score 100.

No learner identifiers or credentials were captured in this artifact.

## Safety Decision

Do not delete the earlier row and do not merge its progress into the quiz. It is
the required GitHub exercise identity used by approved-PR completion. Repair the
two rows in place so learner evidence keeps its original semantic owner.

## Deployment Preflight and Approval Boundary

Immediately before the proposed production migration, a second read-only audit
confirmed the original shape without emitting learner identifiers:

- corrupted exercise/quiz pairs: 14;
- target lesson rows: 28;
- target progress rows: 43;
- completed target progress rows: 41;
- digest of every persisted field in the ordered target progress rows:
  `89367badf4012cd4deb116b04e82f06c`;
- remaining combined-title rows: 28.

The deployment configuration builds the image before migrating, verifies the
exact required migration with the ledger doctor, and stages the resulting
revision with zero traffic. It does not promote that candidate over the active
revision.

## Approval, False-Green Build, and Recovered Lineage

The owner explicitly approved the Codecamp production Cloud Build and the
repair migration while it was named `0047`. Two submissions failed during
image construction before any database step
(`42d8c3b5-e9df-4165-b2f1-3e30d4ec30d3` and
`9dafaaee-bf06-4104-bca1-cb2b42f3b9a6`). Build
`32aae3a3-121f-43c0-8397-cddb16970468` then built successfully and staged
revision `codecamp-advantage-00028-yiq` with zero traffic, but its migration
step silently skipped the then-named repair `0047`.

Read-only ledger reconciliation proved that production already contained two
newer migrations absent from this checkout. The retained source of Cloud Build
`822ac25c-4c8b-4b75-a6aa-0166289830d9` recovered their exact identities:

- `0047_fluffy_joshua_kane`, timestamp `1785580312598`, hash beginning
  `f54cbb650c4e`;
- `0048_workbook_publishing`, timestamp `1785672462951`, hash beginning
  `910b70e74f6c`.

Both hashes and all four resulting production schema sentinels match. Their SQL,
snapshots, schema declarations, and tenant classifications are now restored in
the repository. The same approved Codecamp repair SQL is reindexed as
`0049_codecamp_exercise_quiz_repair`, after the official production ceiling.

The migration runner now rejects duplicate timestamps, missing historical
entries, and governed checksum drift. The required-migration doctor gate now
requires one exact timestamp row, the committed SQL hash, and the schema
sentinel instead of trusting the ledger high-watermark. A pre-review real
Podman/PostgreSQL suite passed all 110 focused tests. Independent review then
caught and closed a mixed-state edge case in which one repaired pair could mask
a second malformed pair in the same module. The added normal-runner regression
proves that this state now aborts atomically without changing lessons, progress,
children, ledger rows, or the uniqueness sentinel; the affected eight-file
matrix passes 51/51 tests after the safeguard.

Because the exact migration identifier became
`0049_codecamp_exercise_quiz_repair`, the first attempted final submission was
blocked before Cloud Build accepted a job and before any database or revision
change. The owner then explicitly approved the exact `0049` identifier before
resubmission.

## Successful 0049 Deployment and Acceptance

Cloud Build `2a10e80a-67f1-432a-b818-d0a6afc636a1` completed successfully on
2026-08-10. Its ordered gates built and pushed image digest
`sha256:2200b2d15780bd013c7d0379a12e381df2368c57eced498d61046794429965c4`,
applied the migration, and reported:

> Required migration gate OK — "0049_codecamp_exercise_quiz_repair" has its
> exact ledger timestamp, committed hash, and schema sentinel.

The independent post-migration ledger check confirms exactly one row at
timestamp `1785758864000`, hash
`c4cf83337b95359da204914ef13414ad9d9fd141f8241e2e3a98b75418d28241`,
constraint `UNIQUE (module_id, "order")`, and no duplicate ledger timestamps.

The post-migration acceptance audit confirms:

- repaired exercise/quiz pairs: 14;
- target lesson rows: 28;
- target progress rows: 43;
- completed target progress rows: 41;
- progress digest: `89367badf4012cd4deb116b04e82f06c` (unchanged);
- remaining combined-title rows: 0.

Cloud Run revision `codecamp-advantage-00029-jis` is ready under the
`sso-candidate` tag with zero traffic. Revision
`codecamp-advantage-00025-vaz` retains 100% production traffic. Both live and
candidate `/th` routes return 200; both reject unsigned GitHub webhooks with
401; both return the intentional company-SSO 409 Accounts handoff from the
legacy password-login probe; and the candidate has no severity ERROR logs.

After the owner authenticated in the real browser, Kimi WebBridge verified the
production `trpc-server-actions` module page. Its accessibility tree, DOM, and
screenshot show six lessons with exactly one
`tRPC & Server Actions Exercise`, exactly one
`tRPC & Server Actions Quiz`, and zero
`tRPC & Server Actions Exercise + Quiz` headings. The production progress
digest independently proves the intern's existing completion evidence remained
attached to the original lesson IDs.
