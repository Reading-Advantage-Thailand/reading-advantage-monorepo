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

The active service remained `codecamp-advantage-00025-vaz` at 100% traffic. The
deployment configuration builds the image before migrating, verifies migration
`0047` with the ledger doctor, and stages the resulting revision with zero
traffic. It does not promote that candidate over the active revision.

The production-write approval guard stopped the Cloud Build submission before
Cloud Build accepted it. Therefore no migration ran, no build or revision was
created, and no traffic or production data changed. Explicit owner approval is
still required before submission. After migration, the acceptance audit must
show 14 repaired pairs, zero combined-title rows, the same 43/41 progress
counts, and the exact same progress digest above.
