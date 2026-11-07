# Specification: Storytime at-home release (weeks 1 to 7 in the app)

**Track ID:** `storytime_at_home_release_20261106`
**Type:** chore (classic FR list with acceptance checks)
**Status:** active. Opened 2026-11-06.
**Author model:** claude-code/claude-sonnet-5-5
**Parent track:** [storytime_app_rebuild_20261025](../storytime_app_rebuild_20261025/) (spec: [spec.md](../storytime_app_rebuild_20261025/spec.md), plan: [plan.md](../storytime_app_rebuild_20261025/plan.md)). The parent spec stays the source. This spec points to its sections and does not copy them.
**Owner chain:** Daniel (owner, content approval, deploy word) → Monorepo orchestrator (track owner) → PM orchestrator (hand-offs to Workbooks).
**Plan:** [plan.md](./plan.md)
**Depends on:** the parent Phase 3 heading carries its checkpoint (the parent Phase 3 receiver gate pins `apps/storytime/content` at `67be5603` during its review). Red and Green of Phase 1 start after that checkpoint.

Decision: PM, 2026-11-05. Tasks 3.10 and 3.11 of the parent plan move to this track. The parent Phase 3 checkpoint is written after its reviews and its phase acceptance.

## 1. Purpose

The at-home release of 2026-11-20 needs weeks 1 to 7 in the app. The app receives the Workbooks week packages of commit `82f88853`. Daniel approves the content on 2026-11-16. The deploy follows on his word. The architecture, the app contract, the readiness gate, and the hard gates come from the parent spec. Parent spec sections 1 (architecture), 5 (hard gates), and 6 (non-functional rules) apply here without change.

## 2. Source of Phase 1 (PM hand-off, 2026-11-06)

The PM hand-off of 2026-11-06, quoted exactly:

```
PM → Monorepo. Hand-off: the Storytime week packages, from Workbooks commit 82f88853.
What: import 7 folders into the Storytime app. They use the same contract as the accepted week 1 package.
- ~/Desktop/handoff/w01-storytime-app-package-r2 (45 files). It replaces the first w01 folder. Its MANIFEST.txt lists the 7 changed files: 5 reader pictures (the nest and nut fixes), pictures.sha256, and w01.json (new color-own-book teacher lines).
- ~/Desktop/handoff/w02-storytime-app-package (44), w03 (43), w04 (39), w05 (45), w06 (42), w07 (43). Their meta.status is draft.
PM check: sha256sum -c of each MANIFEST.txt is OK. Each week file is byte-equal to git show 82f88853:content/storytime/l2/w<nn>.json.
Why: the at-home release (11-20) needs weeks 1 to 7 in the app. w01 r2 also fixes the live week 1 pictures.
Done when:
1. Each folder is imported after a sha256 check. The app tests pass.
2. Weeks 2 to 7 stay draft and do not show as published until Daniel's approvals on 11-16.
3. w01 r2 sits in a local commit, ready for his deploy word.
4. You report the commit and the test tail.
Date needed: 2026-11-16.
Order: Storytime P1, right after the current Phase 3 Green r2 turn. Heavy steps go through heavy-run (p1), with server and client in one job. No push, no deploy.
```

Facts that this spec adds, read on 2026-11-06 (read-only):

- The full id of the commit `82f88853` in the Workbooks repository is `82f88853615f2925d8f1c12b4571790305224178`.
- The current pin of `apps/storytime/content` is `67be5603e0410f21491a006b8e9d12f3f9dd1bfc` (`apps/storytime/content/source.json`).
- The Workbooks diff `67be5603..82f88853` changes `content/storytime/l2/w01.json` to `w08.json`. The hand-off holds no w08 folder. The w08 change is 8 lines.
- The receiver (`apps/storytime/scripts/receive-weeks.ts`, runbook `docs/runbooks/storytime-app-week-sync.md`) writes only week files and `source.json`. A run at a new commit must cover every file that `source.json` lists (runbook rule 4), so the run covers weeks 1 to 8.
- The receiver does not copy media. Media stay in the hand-off folders. They go to the production bucket with a deploy on Daniel's word (parent spec FR-4).

## 3. Functional requirements

Each acceptance check (AC) names its evidence class: **automated**, **person-checked**, or **owner-passed** (parent spec section 4).

### FR-1 Receive the week packages (Phase 1)

- Each of the 7 folders passes `sha256sum -c MANIFEST.txt` before any copy. A broken manifest stops the import and goes to the PM.
- w01 r2 replaces w01. The whole receipt (weeks 1 to 8 and `source.json`) goes into one commit, the receipt commit. w02 to w08 are already in the app as drafts at the old pin, and they stay draft. A deploy of the receipt commit changes only w01 for a user, so the commit is ready for Daniel's deploy word.
- w02 to w07 enter with `meta.status` `draft`. The receiver never changes `meta.status` or `approval` (parent spec FR-4).
- The receiver runs at `82f88853615f2925d8f1c12b4571790305224178` for weeks 1 to 8, with the existing command and no new tool. The receiver gate of the parent moves to this pin.
- Each week file in `apps/storytime/content/l2/` equals `git show 82f88853:content/storytime/l2/w<nn>.json` byte for byte. The check reads the Workbooks repository only. No command writes in the Workbooks repository.
- w02 to w08 do not show as published. The readiness gate (parent spec FR-5, AC-5.5) keeps them at 404. w01 stays ready.
- No push and no deploy.

Acceptance:

- AC-1.1 (automated) `sha256sum -c MANIFEST.txt` exits 0 in each of the 7 folders. The run records `folders_checked=7`.
- AC-1.2 (automated) For each of weeks 1 to 8, the written week equals the `git show 82f88853:…` output. The run records `weeks_equal=8`. For w01 to w07, the file also equals the hand-off file (`weeks_equal_handoff=7`).
- AC-1.3 (automated) A test reads the shipped w02 to w08. Each has `meta.status` `draft`, and `isWeekReady` is false for each, so each answers 404. The test records `weeks_checked=7`. The check for w08 is part of this test, because the receipt writes w08 at the new pin.
- AC-1.4 (automated) A test reads the shipped w01. It has `meta.status` `published`, and `isWeekReady` is true. It also holds the new color-own-book teacher lines of r2.
- AC-1.5 (automated) `source.json` records the commit `82f88853615f2925d8f1c12b4571790305224178` and lists weeks 1 to 8. The second-run gate binds to the receipt commit: after the receipt commit exists, a second receiver run at this pin makes no difference (`git diff --exit-code apps/storytime/content` exits 0).
- AC-1.6 (automated) The targeted app tests of the parent strategy (the phase 2 and phase 3 files that read shipped weeks, and the files that name the pin) exit 0 at the receipt commit. `tsc --noEmit` in `apps/storytime` exits 0.
- AC-1.7 (automated) The receipt commit holds `apps/storytime/content/l2/w01.json` to `w08.json` and `source.json`, with the changed pin expectations of the tests. It holds no other file. The whole task 1.7 set exits 0 at this commit.

### FR-2 The approved A-42 pin (Phase 2)

This is the task 3.10 of the parent. The text and the exception note come from the parent plan (lines 261, 263, 743, and 778 at the move). The rule of the parent spec FR-13 applies: AC-13.1 at the approved pin.

- Daniel checks the content on 2026-11-16. The approved weeks arrive as a new Workbooks pin through the PM.
- The target is 2026-11-17 to 2026-11-19.

Acceptance:

- AC-2.1 (automated) AC-13.1 of the parent spec: the typed read schemas parse the shipped weeks `l2/w01` to `l2/w08` at the approved pin. Tests load the shipped files.

### FR-3 The at-home deploy (Phase 3)

**Cross-track dependency (2026-11-07):** Phase 3 (the deploy) waits for the Phase 2b checkpoint of this track and for the Phase 1 checkpoint ("Council fixes") of track [storytime_look_20261107](../storytime_look_20261107/). Phase 2 of that track (the look port) ships on 2026-11-20 only if its gates pass in time.

This is the task 3.11 of the parent, with amendment R-1 (parent plan line 267: the at-home deploy moves out of task 6.3 into the parent task 3.11; task 6.3 keeps the teacher-app deploy).

- The deploy is Daniel's gate (parent spec section 5). The target is 2026-11-20. The marker is `[b] deferred:daniel`.
- The deploy ships the exact passed commit to `storytime-app` with no traffic, by the runbook `docs/runbooks/storytime-deploy.md`.
- w01 r2 ships only on Daniel's deploy word. It ships with the receipt commit of Phase 1.
- The production service has no `STORYTIME_SHOW_DRAFT_MEDIA` (parent spec AC-5.5).

Acceptance:

- AC-3.1 (owner-passed) Daniel gives the deploy word. The record names the revision and the word.
- AC-3.2 (automated, after the deploy word) The tagged URL answers 200 for the ready weeks with a valid session, and redirects to the sign-in page without one (FR-4). The media files in the production bucket match the hand-off files, file by file (parent spec rule 12.4).
- AC-3.3 (automated, after the deploy word) The environment of the deployed revision has no `STORYTIME_SHOW_DRAFT_MEDIA`. The record names the check and the result.
- AC-3.4 (automated, after the deploy word) AC-2.3 of the parent spec: each printed URL of the published weeks answers 200 on the live domain, after Daniel moves the traffic.

### FR-4 Login and protected media (Phase 2b)

Owner words, Daniel, Google Tasks, 2026-11-07 06:07 ICT: "Have noticed the student books have QR codes linking to our content and state that no login is required. This is of course an absurd choice because then any school or any person can use our online content without paying at all. Parents are going to be supervising the young learners so we can simply have a long running login that they have to complete the first time then we can keep out random people who aren't in our program". Approval, 2026-11-07 06:21 ICT: "Approved". The design is [login-design.md](./login-design.md).

- One account per family or per school class. The first sign-in, then the device stays signed in (about one year, renewed on use).
- A scan without a sign-in opens the sign-in page and returns to the same page after the sign-in (same-origin path check).
- A stranger sees a short "How to join" page and no content. Pictures, songs, and videos are protected too (signed URLs behind the session).
- The company makes the accounts for release 1 by a script from a list. Teacher routes need a teacher login.
- The www Storytime page copy ("By QR Code, With No Login" and its FAQ) changes after PR's text arrives. That is a separate change and is not in this FR.

Acceptance:

- AC-4.1 (automated) A request to `/<locale>/st/**` or `/<locale>/teacher/**` with no session redirects to the sign-in page with `next` set. A request with a valid session gets the page.
- AC-4.2 (automated) The `next` check accepts the scanned week path and rejects each bad input of a table (`//host`, `\\host`, `https://host`, a control character, bad percent encoding, a path outside `/(th|en)/(st|teacher)/`, a path over 200 characters). The table is asserted not empty (`next_cases` is the table size).
- AC-4.3 (automated) The sign-in handler rejects a bad password and a disabled account, locks after the rate limit, and writes an audit event for each success and failure. A good sign-in sets a cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and a 365-day `Max-Age`. CSRF: a cross-origin POST to the sign-in handler or the sign-out handler (an `Origin` header of another origin, or no `Origin` and a `Referer` of another origin) gets 403, sets no cookie, and changes no session (`cross_origin_cases` is asserted greater than 0). A same-origin POST passes. If the form is a Server Action, the same `assertSameOrigin` check is its first statement.
- AC-4.4 (automated) A session with fewer than 335 days left gets a renewed expiry on use, at most once each day. A disabled account fails on the next request. The cap is 30 active sessions for a `class` account and 5 for a `family` or `teacher` account; the next sign-in over the cap ends the oldest session.
- AC-4.5 (automated) The "How to join" page answers 200 with no session and holds no week content and no media URL. Its copy file holds `status: "draft"` and the page shows a draft marker until the PR copy and Daniel's Thai check are recorded (AC-4.10).
- AC-4.6 (automated) A `family` session and a `class` session get 403 on a teacher route. A `teacher` session gets 200 on the teacher routes and on the family routes.
- AC-4.7 (automated) Every media URL in a page response is a signed URL of the storage adapter for the bucket `storytime-app-media` with an expiry of 6 hours or less. No media URL names `primary-app-storage`. A page response with no session holds none. A browser test seeks in an mp4 on a signed URL.
- AC-4.8 (automated) The account script writes the CSV and the card list only to a path outside the repository, and the test checks `git status` of the repository stays clean.
- AC-4.9 (automated, evidence of tasks 2b.8 and 2b.9, run by the orchestrator under the PM decision of 2026-11-07) The service account `storytime-media-signer` exists with `roles/storage.objectViewer` bound on the bucket `gs://storytime-app-media` only (the bucket policy lists it; the project policy and the policy of `primary-app-storage` do not). The bucket is in `asia-southeast1` with uniform bucket-level access and public access prevention enforced, and an anonymous GET of an object answers 403. The secrets `storytime-database-url`, `storytime-storage-hmac-access-key`, and `storytime-storage-hmac-secret` exist with at least one version each. A text scan of the repository finds no value of these secrets. The production database holds 9 first-batch accounts by role: 5 `family`, 3 `teacher`, 1 `class`, with no personal names.
- AC-4.10 (owner-passed) The "How to join" copy comes from the PR session by 2026-11-10 and Daniel checks the Thai on 2026-11-16. The record names the date and his words. The deploy of task 3.1 needs the copy file at `status: "approved"`.
- AC-4.11 (owner-passed) Daniel gives the word for the deploy and for the removal of the public read of `gs://primary-app-storage/storytime-app/` (task 2b.10). That prefix serves the live revision `storytime-app-00011-dut` until the traffic move; the removal comes after it. The record names the revision and the word.
- AC-4.12 (automated) The login uses new storytime tables only: no import of the shared company tables (`accounts`, `sessions`, `auditEvents`, `loginAttempts`) or of `createSession` in `apps/storytime`; `apps/storytime` holds no database import (all SQL lives in `packages/backend/src/modules/storytime-access/`); and the storytime tables (`packages/db/src/schema/storytime/`) are registered EXEMPT in `packages/domain/src/tenant-registry.ts`. The reused helpers are `hashPassword`, `verifyPassword`, and `consumeRateLimit` only.

## 4. Constraints

- Hard gates stay with Daniel: paid generation, deploys, deletions, and public dates. A task at a gate gets `[b] deferred:daniel`.
- Never write in another repository. The Workbooks repository is read-only here.
- Do not add a hash, a checksum field, or a provenance file (AGENTS.md hashing policy). The `sha256sum -c` run is the check that the hand-off names. Git commit identity is the provenance.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy steps (vitest, `tsc`, eslint, build) run through `heavy-run.sh`, one job at a time, with server and client in one job. Vitest uses `--maxWorkers=1` and targeted files.
- Commit headers and body lines are 100 characters or less, with the `track_id`.
- No push. No deploy.

## 5. Out of scope

- A change to any app code or any contract (parent Phase 3 owns them). If the receiver or a test finds a contract fault, the task stops and reports it to the orchestrator.
- The loops (A-42) display work: tasks 3.9 and 4.6 of the parent.
- The teacher app deploy (task 6.3 of the parent).
- The media upload to the bucket and the traffic move before Daniel's word.
- Week 8 content work. The receiver writes w08 because the run covers the whole set.

## 6. Open questions

| # | Question | Default until the PM answers |
|---|---|---|
| R1 | The hand-off has no w08 folder, but the receiver rule needs weeks 1 to 8 at a new commit, and `82f88853` changes w08 by 8 lines. | Run weeks 1 to 8. Check w08 byte-equal to `git show`. w08 stays draft and not ready. Report the w08 diff to the PM. |
| R2 | The receiver writes `source.json` at the new pin, and it covers all weeks. How does w01 r2 ship alone? | It does not need a separate commit (spec review F1). One receipt commit holds weeks 1 to 8 and `source.json`. w02 to w08 are drafts at the old pin already and stay draft. |
| R3 | Do the media of the 7 folders stay in the hand-off folders until the deploy? | Yes. The review copy reads them through `STORYTIME_MEDIA_BASE`. The first w01 folder is superseded by r2. |
