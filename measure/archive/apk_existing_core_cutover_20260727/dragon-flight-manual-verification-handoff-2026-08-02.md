# Dragon Flight Manual Verification and Product-owner Handoff — 2026-08-02

## Status and authority boundary

This is a procedure-only handoff for the Dragon Flight Existing Core
corrective phase. It records **no** completed verification, acceptance,
production proof, checkpoint, or product-owner authorization.

The procedure may be used only to collect the owner-visible evidence required
after the current source is isolated into a clean bounded checkpoint. It does
not authorize deployment, cutover, retirement, later-title use, cohort use,
or a Task 5 status change. The source and local-only browser evidence it will
eventually bind are described in
[`dragon-flight-host-proof-current-source-verification-2026-08-02.md`](./dragon-flight-host-proof-current-source-verification-2026-08-02.md).

## Formal-run preconditions

Before recording a formal owner confirmation, all of the following must be
true:

1. A clean, Dragon Flight-only checkpoint has been created without absorbing
   unrelated parallel application work.
2. The focused checks and both-host browser reports have been rerun against
   that exact checkpoint and their source/report hashes recorded.
3. Each target is an isolated non-production host running those checkpoint
   bytes with `HOST_PROOF_ENABLED=true` set server-side.
4. A disposable authenticated student belongs to a school for each host. Do
   not use production data, credentials, or a production URL.
5. The test-only dwell override is unset. The owner validates normal bounded
   host behavior, not the 3000 ms CI policy.

A 404 means the host flag or eligibility prerequisite is absent; it is not a
successful verification.

## Required flow

Run the following once on Reading and once on Primary at:

`/en/student/host-proof/games`

1. Sign in as the prepared school-scoped test student and open the route.
2. Confirm the visible surface shows **Dragon Flight**, a **Dragon Flight
   vocabulary game** region/canvas, and **Your recent verified flights**. It
   must not expose a title selector/dropdown, generic **Restart game**
   control, raw error, stack trace, credential, or internal receipt data.
3. Record the number of visible history rows, if any.
4. Choose the right gate and press **Enter immediately**; do not manually wait
   to satisfy a timing rule. The client may show **Verifying your flight…**,
   but must not expose an error or require manual timing.
5. Confirm a **Verified result**, server-rendered score, accuracy, and XP,
   plus either **Victory confirmed** or **Flight recorded**. Confirm exactly
   one new Dragon Flight row appears in **Your recent verified flights** and
   that no cartridge-local **Game result** panel substitutes for the verified
   host result.
6. Refresh the route once and confirm the new history row remains visible.

Use the keyboard flow at a wide desktop viewport on both hosts. When a
touch-capable device is available, also repeat the compact pointer/touch gate
selection followed by Enter on each host. Automated evidence covers these
input modes; this manual step verifies the owner-visible experience.

## Required evidence and confirmation

For each host, retain one final-state screenshot showing the Dragon Flight
heading, verified result, and recent-history area. Record the non-production
host, timestamp, input modality, and viewport. Do not include credentials,
opaque checkpoints, request bodies, or production data.

The product owner should confirm one statement per host using this wording:

> On `<non-production host>` at `<timestamp>`, using a school-scoped test
> student, I opened `/en/student/host-proof/games`, saw only the bounded
> Dragon Flight surface, completed a gate-then-immediate-launch flow, saw the
> verified result, and confirmed one new history row persisted after refresh.
> I observed no raw error or internal protocol data.

## What this does and does not establish

The confirmation establishes only the visible, authenticated Dragon Flight
bounded-host flow and persistence on Reading and Primary for the checkpoint
under review. It does not establish physical-human play, anti-bot resistance,
answer comprehension, mastery, anti-cheat efficacy, broader XP integrity,
production readiness, Task 5 completion, cutover, retirement, later-title
use, or cohort acceptance.

After both confirmations, the remaining formal gates are: a fresh Terra phase
acceptance and independent Sol review against the checkpoint and evidence,
Reading full-TypeScript resolution or an explicitly accepted separate
disposition, Measure closeout, explicit product-owner authorization, and
dedicated Task 6 planning for the contradictory retirement guard.
