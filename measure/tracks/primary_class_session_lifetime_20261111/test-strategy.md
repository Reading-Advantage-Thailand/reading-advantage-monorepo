# Test strategy: class sign-in session lifetime choice

> **Track:** `primary_class_session_lifetime_20261111` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** `## Phase 1: Choice of the class session lifetime` in full (section P1). Tasks 1.1 to 1.12.
> **Written:** 2026-11-11 at role base `7b441fbe6` (the plan commit is `26cdcda80`). Model: claude-sonnet-5-5.
> **Spec review:** pass at `measure/runs/primary_class_session_lifetime_20261111/spec-review-26cdcda80.json`. F1 (Major) and F3 and F4 (Nit) are closed in this file (sections 4.2, 6.7, and 6.8). F2 (Nit) is closed in section 6.2.
> **No SHA in this file.** The strategy names no `phase_base_sha`. Section 1.5 names the capture point.
> **No hash, no checksum, no manifest.** The track adds none (AGENTS.md, Hashing and Provenance Policy).

## 1. Rules for the phase

### 1.1 Machine rules and commands

- The machine holds 7.3 GB of RAM. One heavy job runs at a time. Storytime keeps the first claim on the heavy lock.
- `HEAVY` is this wrapper. Type checks, builds, and full suites run inside it:

  ```bash
  HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- A named-file Vitest run is a light job. It runs in the foreground, outside the wrapper, with `CI=true` and `--maxWorkers=1`:
  - `DOM_CMD` = `CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 <files>`
  - `APP_CMD` = `CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 <files>`
- A light task needs no lock: reads, `rg -n`, `git show`, `git log`, `git diff`, `git rev-parse`.
- All work runs in the shared master tree. No worktree is created (A16). Scratch folders come from `mktemp -d` under `/tmp`.
- Detectors use `rg -n '<regex>'`. The command never uses `rg -nE` (A14). An `rg` exit code of 2 is a failure. It is never a zero-hit result.
- The machine time zone is Asia/Bangkok (UTC+7). A bug that reads the browser or server local clock therefore passes on this machine. Section 1.6 adds a time-zone matrix for this reason.

### 1.2 The hash rule

- The track adds no hash field, no checksum, and no manifest. Section 1.5 uses Git commit identity only.
- The audit line holds `lifetime`, `sessionId`, and `expiresAt`. It holds no code, no hash, and no token (spec section 9).

### 1.3 Evidence classes

- **Artifact test:** reads a file or a message tree and checks text or structure. The message-key parity case, the 44 px class case, and the `rg -n` detectors of the phase check are artifact checks. They never prove runtime behavior.
- **Function-level live test:** calls the real domain function, the real contract, the real handler, or the real component in the Vitest runtime. The mock database is a test double: it cannot evaluate SQL. A mock-database case never proves that a query predicate filters a row (section 4.1).
- **Real-database test:** the existing `student-login.real-db.test.ts` file. It runs only when `PG_TEST_URL` names a scratch database with all migrations applied (section 6.3).
- **Browser check:** the browser review of section 6.9. It is automated or person-checked, and the evidence names which.
- **Human evidence:** the Thai labels (task 1.10, `[b] deferred:pm`, person-checked). No other task needs a person.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5).

### 1.4 Intentionally-red aggregate suites

- The Red files of tasks 1.1 and 1.2 sit in the domain suite and the app suite. They are red by design until the Green tasks.
- The aggregate suites are not a gate while a Red file is open. The targeted commands of section 6 are the gates.
- The domain aggregate suite runs at the phase check (task 1.11), when every Red file is green.
- **Base run.** Before the Red role edits a file, the domain aggregate suite runs once at the phase base inside `HEAVY`. The Red role records `suite_base_files`, `suite_base_tests`, `suite_base_failed`, and the path of each failing file. The count `preexisting_red_files=<n>` is a labeled integer. The phase check compares with this record. No `git checkout`, `git stash`, or worktree can recreate the base later, so the base run must come first.
- A pre-existing red file outside this track is named with its path. It is not a reason to widen any change.

### 1.5 Capture of `phase_base_sha`

- This file embeds no `phase_base_sha`. A value from before the commit of this strategy is not valid.
- The orchestrator captures the value with `git rev-parse HEAD` **after** the commit of this strategy and **after** the commit of the strategy log, and **before** the Red role starts.
- The captured commit must contain this file: `git cat-file -e <sha>:measure/tracks/primary_class_session_lifetime_20261111/test-strategy.md` exits 0.
- The orchestrator records the full value in the Red evidence of Phase 1.
- Master is shared with other tracks. A scope check uses the commits of this track only:

  ```bash
  git log <phase_base_sha>..HEAD --format=%H --grep='track_id: primary_class_session_lifetime_20261111'
  ```

  Then `git show --name-only --format= <sha>` for each commit. The label is `lifetime_out_of_scope_paths=<n>`. The phase check needs 0.

### 1.6 The time-zone matrix

The tests that read a clock run three times: with the machine time zone, with `TZ=UTC`, and with `TZ=America/Los_Angeles`. A local-time implementation (`getHours()`, `toLocaleTimeString()` with no zone, or `new Date(y, m, d, 17)`) passes in one run only.

- Domain: `TZ=<zone> CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-class-session.test.ts`
- App: `TZ=<zone> CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 components/__tests__/class-session-control.test.tsx`

The count `tz_runs_green=3` is a labeled integer for each file at the Green gate of tasks 1.5 and 1.7. At Red, at least one clock case fails in each run for the stated reason. Falsification: a local-time mutant passes all three runs.

### 1.7 Labeled counts and floors

- Every count in a test message, a log line, or a plan note is a labeled integer `label=<n>`. A bare number never counts (A3).
- A count that measures work has a floor, stated before the loop runs. A loop over an empty set is a defect (A4). Each loop asserts its input size first.
- The new-case floors are: `new_cases_contracts>=12`, `new_cases_class_session>=20`, `new_cases_handler>=8`, `new_cases_control>=14`. A parameterized row counts as one case.
- A Red file fails at least one case at the base for the reason the task names. A case that passes at the base is a named characterization case. The Red evidence lists each one with its reason.
- A Green run quotes the exit code, the file count, the test count, and the labeled counts. A note that says "pass" without the exit code is a defect (A5).

## 2. Facts that shape the tests (read on 2026-11-11 at the role base; Red and Green measure again)

| # | Fact | Source |
|---|---|---|
| M1 | `startClassSession` runs in this order: `authorizeClassroom` (read), then `ensureStudentCredentials` at `class-session.ts:84` (can insert), then the close of old sessions at `:86-95` (update and audit), then the code loop with the insert at `:127-130` and the audit at `:136`. | `class-session.ts:77-138` |
| M2 | `ensureStudentCredentials` selects the students with no credential row. When the list is not empty, it inserts rows with `onConflictDoNothing`. A mock `selectSequence` of `[[classRow], [{ userId: "stu-new" }], ...]` makes it insert. | `credentials.ts:17-40` |
| M3 | `CLASS_SESSION_LIFETIME_MS` is used once, at `class-session.ts:124`. The existing test `student-login-class-session.test.ts:48` fixes `NOW + 3 h`. | spec section 3 |
| M4 | The app resolves `@reading-advantage/domain` and `@reading-advantage/domain/calendar-day` through the git-ignored `packages/domain/dist/`. The app Vitest config holds no alias for the domain. A domain change does not reach an app test until `pnpm --filter @reading-advantage/domain build` runs. `dist` was built on 2026-11-10 at 01:18 and holds no `lifetime`. | `packages/domain/package.json` exports, `vitest.config.ts`, `rg -c lifetime packages/domain/dist/student-login/contracts.js` returns 0 hits |
| M5 | `STATUS` in `http.ts:11-19` is a `Record<StudentLoginErrorCode, number>`. At HEAD a thrown `StudentLoginError("invalid_input")` finds no status. `NextResponse.json(body, { status: undefined })` then answers 200. The handler Red case sees 200 where it expects 400. | `http.ts:49-54` |
| M6 | `errorKey` in `api.ts` maps status 400 to `generic`. A new `lifetimeInvalid` key needs the response code `invalid_input` as the discriminator, because the contract failure is also 400 (`Invalid input`, no code). | `api.ts:errorKey`, `http.ts:67-68` |
| M7 | `ClassSessionStartInput` is `z.infer` of the object. With a Zod default, the inferred (output) type makes `lifetime` required. Existing callers and tests pass `{ classroomId }`. `check-types` of the domain package compiles the test files. | `contracts.ts:38,171` |
| M8 | The existing control test asserts the start body as `JSON.stringify({ classroomId: CLASS_ID })`. The new default body is `{ classroomId, lifetime: "3h" }`. This one assertion changes in Red. | `class-session-control.test.tsx` (first test) |
| M9 | The existing control tests use the real clock. The new option list depends on the clock. The existing cases that assert other text stay valid at any hour, because they do not assert the option list. | `class-session-control.test.tsx` |
| M10 | `i18n/request.ts` loads only `messages/<locale>.json`. The fallback `withPublicFallback` covers only the public namespaces, and only for `vi`. `cn`, `tw`, and `vi` each hold a full `ClassLogin` tree. A new key in `th` and `en` only is therefore missing in `cn`, `tw`, and `vi`. The spec claim "other locales fall back as they do today" does not hold for these keys. See finding F5 (section 8). | `i18n/request.ts:14-23`, `public-fallback.ts`, `messages/cn.json:2982` |
| M11 | The real-database file already calls `startClassSession` at nine places, `issueClassCardTokens` at `:204`, and `signInWithCardToken` at `:212`. It forces expiry with a direct row update at `:74`. It is skipped when `PG_TEST_URL` is unset. | `student-login.real-db.test.ts` |
| M12 | `findOpenSession`, `resolveCode`, and `signInWithCardToken` take an explicit `now`. A real-database test can test the boundary at `expiresAt - 1 ms` and at `expiresAt` with no wait. The predicate is `expiresAt > now` (strict). | `class-session.ts:181-198`, `card-token.ts:65-70` |
| M13 | `Intl.DateTimeFormat` with `timeZone: "Asia/Bangkok"`, `day: "numeric"`, `month: "short"`, `hour: "numeric"`, `minute: "2-digit"` gives: en `Nov 18, 5:00 PM`, th `18 พ.ย. 17:00` (Node v24.19.0). With `hour` and `minute` only: en `5:00 PM`, th `17:00`. The en text can hold U+202F before `PM`. Tests match with `\s`. | one Node probe, 2026-11-11 |
| M14 | `audit.ts` passes `metadata` to `recordAuditEvent` as the field `metadata`. The existing tests mock `recordAuditEvent` and read `calls[i][1]`. | `audit.ts:30-45` |

## 3. Phase summary and review applicability

| Phase | Risk | Review A | Review B | Review C | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 Choice of the class session lifetime | **high** | yes (required) | **yes (required by the PM)** | yes (required) | yes (small scope) | yes (one viewport) |

**Why the risk is high.** The choice makes a credential live for 7 days. The class code and every QR card of the class share one session row (D-3). A lost card, or a code that a student photographs, then works for a week. The change touches authentication timing, a Zod contract, a new error code, a teacher panel, and the message files. It adds no migration. The blast radius is the Primary Advantage class sign-in. Red and Green run on different model families (DeepSeek and GLM).

**Review A (correctness) applies.** It checks the three expiry rules, the boundary at 17:00, the Bangkok date rule at the UTC date edge, the default, the `=== undefined` default rule (section 6.7), the check order of F1, the audit line, the restart, and the dist rebuild (M4).

**Review B (security) applies and is required.** The scope is in section 6.5.

**Review C (UX and API wiring) applies.** The phase adds a teacher control and one API field. It checks the contract wording, the 400 body, the error key, the string pairs, the keys in the five locales (F5), the 44 px targets, and the narrow-width layout.

**Adversarial testing applies in a small scope.** The scope is time boundaries, the enum bypass (the prototype keys and the `null` default), and the tenant scope of the session. Section 6.6 lists the rounds.

**The browser review applies.** The phase changes a teacher page. Section 6.9 holds the scope.

## 4. Acceptance criteria, tests, and the proof of each

### 4.1 What a mock-database test can and cannot prove

The mock database returns the next value of `selectSequence` for each `select()`. It never runs the predicate `expiresAt > now`. A test that feeds the mock an empty list and calls it "expired" proves nothing (A4). The strategy therefore splits AC-5:

- **What changes in this track:** the value that enters the row and the value that returns. A mock case proves it (the inserted `expiresAt` equals the returned `expiresAt`).
- **What does not change:** the predicates in `findOpenSession`, `card-token.ts`, and the collision check. The detector `untouched_login_files_changed=0` proves that the files stay as they are (section 6.4). The real-database case proves the predicate with an explicit `now` (section 6.3).
- **No mock case may be named "expired".** Red writes no card case or code case with a hand-fed empty select as its proof of expiry. The card test file stays unedited unless Red can state a falsifiable case. The count `card_file_edit=<0|1>` is a labeled integer, with the reason in the Red note.

### 4.2 The criteria table

| AC | Requirement | Test cases (file) | Evidence class |
|---|---|---|---|
| AC-1 | Three choices | `lifetime 3h`, `lifetime absent`, `lifetime 7d`, `lifetime until_17` at 05:00Z (domain class-session) | function-level live test |
| AC-2 | Refused values | contract: `1d`, `30d`, `""`, `7`, `null`, near-misses; handler: 400 and no domain call; domain: cast values throw and write nothing (class-session, contracts, handler) | function-level live test |
| AC-3 | `until_17` limit and F1 | 09:59:59Z works; 10:00:00Z, 16:59Z refused; 17:30Z works; day roll at 16:59:59.999Z and 17:00:00Z; the no-write case with a credential-less student (class-session) | function-level live test |
| AC-4 | Audit | `class_start` metadata holds `lifetime`, `sessionId`, `expiresAt`, and no secret (class-session) | function-level live test |
| AC-5 | Expiry still fails; early end; restart | inserted row equals the returned value (class-session); `7d` code and card work before and fail at `expiresAt`, end early closes it, restart replaces it (real-database file, when `PG_TEST_URL` is set); `untouched_login_files_changed=0` detector | function-level live test and real-database test and artifact check |
| AC-6 | Panel | radio group, default, post body, hide rule, expiry text, error text, help text, 44 px class, both locales (control, panel) | function-level live test, artifact test, browser check |
| AC-7 | Other behavior stays | the existing `student-login-*` files, the handler file, and the panel files exit 0 | function-level live test |
| AC-8 | No migration | `git diff --name-only <phase_base_sha>..HEAD -- packages/db` is empty | command run |
| AC-9 | Reviews | section 3 and section 6.5 | review |
| AC-10 | Strings out | task 1.10 hand-off | person-checked |

## 5. Risks, defenses, and mutants

| ID | Risk | How the track can fail it | Defense in the tests |
|---|---|---|---|
| R1 | A refused start writes a row (spec review F1). | The check runs after `ensureStudentCredentials` (`:84`) or after the close of old sessions (`:86`). | Section 6.2 case `refusal makes no write` uses a class with a credential-less student and an open old session. It asserts no insert, no update, no delete, and no audit call. A positive control with `3h` on the same fixture proves that the fixture inserts. |
| R2 | The client sets a time. | A body field `expiresAt` or `minutes` reaches the domain. | The contract case strips an extra `expiresAt` key. The panel case asserts the body keys are exactly `classroomId` and `lifetime`. |
| R3 | An enum bypass in the domain. | A lookup table `TABLE[lifetime]` accepts `"constructor"`, `"toString"`, or `"__proto__"`. A `?? "3h"` default turns `null` into `3h`. | The domain refused list holds the prototype keys and `null`. Each must throw `invalid_input` and write nothing. |
| R4 | A local-time implementation. | The code reads `getHours()` or the machine zone. | The time-zone matrix of section 1.6. |
| R5 | The 17:00 edge is off by one. | `<=` instead of `<`, or 16:59:59.999 refused. | The cases at 09:59:59Z (works), 10:00:00Z (refused), and 09:59:59.999Z (works, optional row). |
| R6 | The Bangkok date is wrong near midnight. | The date comes from the UTC date. | The cases at 2026-11-10T16:59:59.999Z (23:59:59.999 on 10 Nov in Bangkok) and 2026-11-10T17:00:00.000Z (00:00 on 11 Nov). Both have a UTC date that differs from the Bangkok date. |
| R7 | The app test passes against a stale `dist`. | Green changes the domain, skips the build, and the app test runs the old contract. | The rebuild step of section 6.7 and the labeled count `dist_has_lifetime`. |
| R8 | A longer time than 7 days. | A value above 7 days reaches `expiresAt`. | The invariant case: for each accepted value, `0 < expiresAt - now <= 7 d`. The loop asserts `choices_checked=3` first. |
| R9 | The 3-hour path changes. | `3h` or no value returns another instant. | Characterization cases at HEAD. They stay green. |
| R10 | A panel option hides in the wrong zone. | The hide rule reads the browser zone. | The panel clock cases under the time-zone matrix. |
| R11 | The panel shows a time for a 7-day session with no date. | The formatter prints `5:00 PM` only. | The later-date cases in `en` and `th` (section 6.8). |
| R12 | The new keys are missing in a locale. | `cn`, `tw`, and `vi` show raw key text (M10). | The key parity case of section 6.8. The inactive row of section 7.2. |
| R13 | A refused start leaves a wrong error on screen. | A 400 with `invalid_input` shows the generic text. | The control case `server refusal shows the lifetime error`. |

**Mutants the Red set must kill.** The orchestrator may apply each mutant to the Green code in a scratch copy of the changed file, never in the repository, and run the named file. Each mutant must turn at least one case red.

| Mutant | Killed by |
|---|---|
| `until_17` check placed before `:86` but after `:84` | R1 case |
| `<=` for `<` at 17:00 | the 10:00:00Z and 09:59:59Z cases |
| UTC date instead of the Bangkok date | R6 cases |
| `getHours()` local time | R4 matrix |
| `lifetime ?? "3h"` | the `null` case |
| lookup table with no `hasOwn` guard | the prototype-key cases |
| the handler passes the raw body | the handler `30d` case and the stripped `expiresAt` case |
| the panel posts a computed time | the body-keys case |
| the audit line drops `lifetime` | the audit case |
| `STATUS` has no `invalid_input` | the handler `invalid_input` case |

## 6. The per-phase strategy

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. The clock cases use the fixed instants listed here. Expected values are literals, not computed with the production code.

### P1: Choice of the class session lifetime

**Risk: high.** Review A, Review B, Review C, adversarial (small), and browser (one viewport) all apply (section 3).

#### 6.1 Red order and the first checks

1. The base run of section 1.4 (domain aggregate suite inside `HEAVY`).
2. Run the three domain files and the three app files at the base. Record `base_tests_total`, `base_tests_failed`, `base_tests_passed`. All must be green. This is the positive control for the Red files (A4).
3. Rebuild the domain `dist` at the base inside `HEAVY` (`pnpm --filter @reading-advantage/domain build`), so the app Red run does not read an old `dist` (M4). Record `dist_rebuilt=1` and `dist_has_lifetime=0` (`rg -c lifetime packages/domain/dist/student-login/contracts.js` finds 0 hits, which is exit 1 of `rg`).
4. Red imports only symbols that exist at HEAD. It never imports `classSessionLifetime`. It never imports a helper that Green will add. It tests through `classSessionStartInput`, `startClassSession`, `startClass`, and `ClassSessionControl`. A missing import is a load error and is not a valid Red.
5. Red reads a message key with a helper that returns `undefined` for a missing path. Then it asserts `typeof value === "string"`. A direct chain such as `messages.ClassLogin.session.lifetime["3h"]` throws a `TypeError` at HEAD and is not a valid Red.

#### 6.2 Task 1.1: the domain Red cases

**Files (Red edits only these):** `packages/domain/src/__tests__/student-login-class-session.test.ts`, `student-login-contracts.test.ts`, and optionally `student-login-card.test.ts` and `student-login.real-db.test.ts` as section 4.1 and section 6.3 state. The real-database edit is the answer to spec review F2: one new `it`, no change to existing cases.

**Red command:**

```bash
CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-contracts.test.ts src/__tests__/student-login-card.test.ts
```

Add `src/__tests__/student-login.real-db.test.ts` to the command. With `PG_TEST_URL` unset, its cases are skipped, and the Red note records `real_db_skipped=1`.

**Contract cases (`student-login-contracts.test.ts`):**

| Case | Input | Expected | At HEAD |
|---|---|---|---|
| accepts each value | `{ classroomId, lifetime }` with `3h`, `until_17`, `7d` | `parse(...).lifetime` equals the value | fails (undefined) |
| missing gives `3h` | `{ classroomId }` and `lifetime: undefined` | `parse(...).lifetime === "3h"` | fails |
| refused values | `"1d"`, `"30d"`, `""`, `7`, `null` | `safeParse(...).success === false` | fails (the key is stripped, so success) |
| near-miss values | `"7D"`, `"UNTIL_17"`, `" 7d"`, `"7d "`, `["7d"]`, `{}`, `"constructor"`, `"__proto__"` | `success === false` | fails |
| no client time | extra keys `expiresAt` and `minutes` next to a valid `lifetime` | the parsed object has no `expiresAt` and no `minutes` key | passes (characterization: stripping) |
| output unchanged | `classSessionStartOutput` keys | the existing case stays | passes |

**Class-session cases (`student-login-class-session.test.ts`).** `NOW_A = 2026-11-11T05:00:00Z` (12:00 Bangkok). A fixture helper builds the mock database as the existing tests do.

| Case | Clock | Expected | At HEAD |
|---|---|---|---|
| `3h` explicit | `NOW_A` | `expiresAt = NOW_A + 3 h` | passes (characterization) |
| lifetime absent | `NOW_A` | `NOW_A + 3 h` (the existing line 48 stays) | passes (characterization) |
| `7d` | `NOW_A` | `NOW_A + 7 d` = `2026-11-18T05:00:00Z` | fails |
| `until_17` | `NOW_A` | `2026-11-11T10:00:00Z` | fails |
| `until_17` last second | `2026-11-11T09:59:59Z` | works, `expiresAt = 2026-11-11T10:00:00Z` | fails |
| `until_17` at 17:00 | `2026-11-11T10:00:00Z` | rejects with code `invalid_input` | fails (resolves) |
| `until_17` at 23:59 | `2026-11-11T16:59:00Z` | rejects with code `invalid_input` | fails |
| `until_17` UTC date differs | `2026-11-11T17:30:00Z` (00:30 on 12 Nov) | works, `2026-11-12T10:00:00Z` | fails |
| day roll, last instant before | `2026-11-10T16:59:59.999Z` (23:59:59.999 on 10 Nov) | rejects with `invalid_input` | fails |
| day roll, first instant after | `2026-11-10T17:00:00.000Z` (00:00 on 11 Nov) | works, `2026-11-11T10:00:00Z` | fails |
| row equals result | each of the three choices | `inserted.expiresAt` equals `out.expiresAt`, `startsAt` equals `now`, and `Object.keys(out).sort()` is `["code","expiresAt","sessionId"]` | the `7d` and `until_17` rows fail |
| 7-day maximum | the three choices | the loop asserts `choices_checked=3`, then `0 < expiresAt - now <= 7 d` and `Number.isFinite(expiresAt.getTime())` | passes (characterization) |
| audit holds the choice | each choice | the `class_start` metadata equals `{ sessionId, expiresAt: <ISO>, lifetime: <choice> }` with no other key | fails for `7d` and `until_17`; the `3h` row also fails because `lifetime` is missing |
| audit default | lifetime absent | the metadata `lifetime` is `"3h"` | fails |
| audit has no secret | `7d` | `JSON.stringify` of all audit calls holds no code and no `codeHash` value | passes (characterization) |
| restart with `7d` | `7d`, one open old session | the audit actions are `["student_login:class_end","student_login:class_start"]`, and the start metadata `lifetime` is `"7d"` | fails on the metadata |
| unknown values, cast | `"30d"`, `"1d"`, `""`, `7`, `null`, `"constructor"`, `"toString"`, `"__proto__"`, `"hasOwnProperty"` (cast around the type) | rejects with `invalid_input`; no insert, no update, no delete, no audit | fails (resolves) |
| student and system with `7d` | `7d` | `forbidden`, no insert | passes (characterization) |
| other school with `7d` | `7d`, empty class select | `not_found`, no insert | passes (characterization) |

**The F1 case, `refusal makes no write` (Major, spec review F1).** AC-3 governs. The plan text anchors the check "before `class-session.ts:86`". That is too late, because `ensureStudentCredentials` at `:84` can insert rows (M1, M2). The rule: **the check runs before the first row write, which is before `:84`.** It can run after `authorizeClassroom`, because that call only reads.

- Fixture: `selectSequence: [[classRow], [{ userId: "stu-new" }], [], []]`, `updateReturning: [{ id: "old", expiresAt: <NOW + 1 h> }]`, `insertReturning: [{ id: <uuid> }]`.
- Positive control (A4): the same fixture with `3h` at the same instant. Assert `db.insert` was called twice (the credential row and the session row) and `db.update` once. The control proves that the fixture can write.
- Refusal: `until_17` at `2026-11-11T10:00:00Z` and at `2026-11-11T16:59:00Z`. Assert the call rejects with `invalid_input`, `db.insert` was not called, `db.update` was not called, `db.delete` was not called, and `recordAuditEvent` was not called. The labeled count is `refusal_writes=0`.
- A check at `:86` (after `:84`) leaves one insert call, and the case fails. A check at `:84` is the Green target.
- The same rule covers a refused unknown value (the cast list above).

**Optional row, ordering of the refusal and the authorization (adversarial round only).** A student calls with `until_17` at 23:59 Bangkok. The result is `forbidden` or `invalid_input`. Either code is valid. The no-write assertion must hold. The strategy states no order between the two codes, because the spec states none. Review B reads the order.

**Expected Red result at HEAD.** Exit 1. Failures sit only in the `7d`, `until_17`, audit, refusal, contract, and `refusal makes no write` rows. The labeled counts: `tests_total`, `tests_failed`, `tests_passed`. The Red evidence lists each characterization case with its reason. A failure that names a `TypeError`, a `ReferenceError`, a `SyntaxError`, `Cannot find module`, or `Failed to resolve import` is a bad reason: `rg -n 'TypeError|ReferenceError|SyntaxError|Cannot find module|Failed to resolve' <red log>` must give 0 hits. The count is `red_failures_bad_reason=0`.

**Red commit:** `test(domain): pin the class session lifetime (track_id: primary_class_session_lifetime_20261111)`, test files only.

#### 6.3 The real-database case (task 1.1 extension)

One new `it` in `student-login.real-db.test.ts`, inside the existing `describe.skipIf(!url)` block:

1. Start with `lifetime: "7d"` and a fixed `now`. Read the row. Assert `expiresAt - startsAt` equals 7 days exactly.
2. `findOpenSession(db, code, expiresAt - 1 ms)` returns a session. `findOpenSession(db, code, expiresAt)` returns `undefined`.
3. Issue a card token for one student. `signInWithCardToken` with `now = expiresAt - 1 ms` succeeds. With `now = expiresAt` it rejects with `invalid_credentials`.
4. Start again with `lifetime: "7d"`. The first code fails and the second works (restart replaces).
5. `endClassSession` on a `7d` session returns `{ closed: 1 }`. The code then fails.
6. The case ends the class so no row stays open.

**Run rule.** The case needs a scratch database. `PG_TEST_URL` points at a scratch database with all migrations applied, never the shared `primary_advantage` database. The run goes inside `HEAVY`:

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && PG_TEST_URL=<scratch url> CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login.real-db.test.ts'
```

The orchestrator records the scratch database name. A Postgres out-of-memory kill on this machine is a known risk. When no scratch database is available at the closeout, the evidence says `real_db_ran=0` and `real_db_skipped=<n>`. The AC-5 proof is then weaker, and Review B reads the detector of section 6.4 and the unchanged predicates by hand. The note must not say "pass" for the real-database part.

**At HEAD** the case fails at step 1 (the row holds 3 hours) when it runs. When skipped, it counts as `real_db_skipped=1` at Red.

#### 6.4 Green gates for tasks 1.3 to 1.5 and the detectors

| Task | Gate | Expect |
|---|---|---|
| 1.3 contract | `DOM_CMD src/__tests__/student-login-contracts.test.ts` | exit 0, `tests_failed=0`, `tests_skipped=0` |
| 1.4 error code | `rg -n 'invalid_input' packages/domain/src/student-login/errors.ts apps/primary-advantage/lib/student-login/http.ts` finds one hit in each file. The `check-types` of the domain package is the exhaustiveness proof (`STATUS` is a `Record`). `rg -n 'StudentLoginErrorCode' apps packages --glob '!**/dist/**' --glob '!**/node_modules/**' --glob '!**/.next/**'` lists the other users. Each other `Record<StudentLoginErrorCode, ...>` gets the new key. | exit 0 of `rg` for the first, and a listed answer for the second |
| 1.5 domain | `DOM_CMD src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-card.test.ts src/__tests__/student-login-contracts.test.ts`, then the time-zone matrix of section 1.6 for the class-session file | exit 0, `tests_failed=0`, `tests_skipped=0`, `tz_runs_green=3` |
| 1.5b domain build | `HEAVY` with `pnpm --filter @reading-advantage/domain build`, then `rg -c lifetime packages/domain/dist/student-login/contracts.js` | exit 0, `dist_has_lifetime>=1` |

**Task 1.5b is a strategy addition.** The plan has no build step. The app resolves the domain through `dist` (M4). Without the build, the gates of tasks 1.6 and 1.7 and the app `check-types` read the old contract. The build changes no tracked file (`dist` is git-ignored).

**Detector `untouched_login_files_changed=0`** (constraint: the picture password, the rate limits, and the card token logic do not change):

```bash
git diff --name-only <phase_base_sha>..HEAD -- packages/domain/src/student-login/card-token.ts packages/domain/src/student-login/rate-limits.ts packages/domain/src/student-login/picture-password.ts packages/domain/src/student-login/codes.ts packages/domain/src/student-login/credentials.ts
```

The list must be empty. `class-session.ts` may change only in `startClassSession`, its JSDoc, and the lifetime function. The reviewer reads `git diff <phase_base_sha>..HEAD -- packages/domain/src/student-login/class-session.ts` and states that `findOpenSession`, `resolveCode`, `endClassSession`, and the collision check are untouched.

#### 6.5 Review B (security) scope

Review B reads the following. Spec section 9 is the source.

1. The enum is the only input. No client value reaches `expiresAt`. The contract strips extra keys. The domain refuses unknown values with no write.
2. The check runs before the first row write (F1).
3. The audit line holds `lifetime` and holds no code, no hash, and no token.
4. A 7-day session keeps the class code and every card valid for 7 days. The teacher can end it early. Review B states whether the panel help text (`lifetimeHelp7d`) is enough.
5. **OQ-1.** A class with the picture password off gives a `code_only` session. A 7-day code then lets any person with the code sign in as any student of that class for 7 days, with no second factor. The PM holds the decision. The default is no refusal rule. Review B states its advice in the review. Section 7.1 holds the ready Red rows for the case that the PM refuses `7d` for such a class.
6. The rate limits and the card miss limits apply for the whole 7 days. The track changes none (detector of section 6.4).
7. The tenant scope: the session row keeps `schoolId` and `classroomId` from `authorizeClassroom`. The lifetime choice adds no query.
8. The order of the refusal and the authorization (optional row of section 6.2).

#### 6.6 Adversarial scope (small)

One round, after Green and before the phase check. It covers:

- The time boundaries: 09:59:59.999Z, 10:00:00.000Z, the day roll, and a `now` that has milliseconds.
- The enum bypass: prototype keys, `null`, an array, and a number in the contract, the handler, and the domain.
- A body with extra keys (`expiresAt`, `minutes`, `lifetime` twice) at the handler.
- The tenant scope of the session: a teacher of another school with `7d` gets `not_found` and no write.
- A `7d` start by a student session (full or `code_only`): `forbidden`. A `code_only` teacher session gets 403 at the handler (the existing case stays green).

The round writes no product code. It reports a finding or `none`.

#### 6.7 Tasks 1.3 to 1.5: rules for Green

- The domain function treats `undefined` as `3h` and `null` as unknown. A destructuring default or `=== undefined` does this. A `??` default does not.
- The lookup of the choice uses an own-property check or a `switch`. A plain object lookup accepts prototype keys.
- The input type of `startClassSession` is the Zod input type, or the callers compile in another way. The `check-types` of the domain package compiles the existing tests, which pass `{ classroomId }` (M7). The count `typecheck_errors_in_existing_tests=0` is a labeled integer.
- **Spec review F3.** The default for `ClassLogin.session.lifetimeHelp7d` is: **add the key now** to `en` and `th`, with the plan text. The panel shows it only when `7d` is selected. If Review B refuses the text, a follow-up Green edit removes the key, the render, and its test case. Green stays deterministic, because the Red case for the help text is active at Red.
- `CLASS_SESSION_LIFETIME_MS` stays exported with the value of 3 hours (the existing import in tests).

#### 6.8 Task 1.2: the handler and panel Red cases

**Files (Red edits only these):** `apps/primary-advantage/lib/__tests__/student-login-handlers.test.ts`, `apps/primary-advantage/components/__tests__/class-session-control.test.tsx`, and `class-login-panel.test.tsx` only when a case needs it.

**Red command:**

```bash
CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 lib/__tests__/student-login-handlers.test.ts components/__tests__/class-session-control.test.tsx components/__tests__/class-login-panel.test.tsx
```

The Red role runs step 3 of section 6.1 first. The time-zone matrix of section 1.6 applies to the control file.

**Handler cases:**

| Case | Expected | At HEAD |
|---|---|---|
| body `lifetime: "7d"` | status 200; the domain mock receives `input` equal to `{ classroomId, lifetime: "7d" }` | fails (input has no `lifetime`) |
| body with no `lifetime` | status 200; the domain receives `lifetime: "3h"` | fails |
| refused bodies: `"30d"`, `"1d"`, `""`, `7`, `null`, `"constructor"` | status 400; the domain mock is not called. The loop asserts its row count first (`refused_rows=6`). | fails (200 and a call) |
| extra keys `expiresAt` and `minutes` with `lifetime: "3h"` | the domain input holds no `expiresAt` and no `minutes` | passes (characterization) |
| domain throws `StudentLoginError("invalid_input", ...)` | status 400 and body `code` equal to `invalid_input` | fails (status 200, M5) |
| no session, with `lifetime: "7d"` | 401; the domain is not called | passes (characterization) |
| not a full session, with `7d` | 403; the domain is not called | passes (characterization) |
| unknown fields in the result | the existing case stays | passes |

**Panel (control) cases.** Each case that depends on the clock uses `vi.useFakeTimers({ toFake: ["Date"] })` and `vi.setSystemTime(...)`. The `Date`-only fake keeps `waitFor` and the promise timers real. The panel file (`class-login-panel.test.tsx`) fakes all timers for its poll, so a case there that needs a clock keeps its existing pattern. Each test restores real timers in `afterEach`.

| Case | Expected | At HEAD |
|---|---|---|
| radio group in `en` | a `radiogroup` named "How long should sign-in stay open?" with `radio` options named "3 hours", "Until 17:00 today", "7 days" at the clock 2026-11-11T05:00:00Z | fails (no radio) |
| radio group in `th` | the same structure, with the `th` labels read from the message tree through the safe helper (section 6.1) | fails |
| default selection | "3 hours" is checked; the other two are not | fails |
| post body, default | Start posts `{ classroomId, lifetime: "3h" }` (the one changed existing assertion, M8; the count `existing_assertions_changed=1` is labeled) | fails |
| post body, `7d` | a click on "7 days", then Start: `JSON.parse(body)` equals `{ classroomId, lifetime: "7d" }`, and `Object.keys(body).sort()` is `["classroomId","lifetime"]` | fails |
| New code uses the selection | after a start and a roster rerender with an open session, New code posts the selected value | fails |
| radio group beside every button state | the group shows with no session (Start), with a shown code (New code), and with an open session and no code (New code) | fails |
| hide rule, before 17:00 | at 2026-11-11T09:59:59Z (16:59:59 Bangkok) "Until 17:00 today" is shown | fails (no group) |
| hide rule, at 17:00 | at 2026-11-11T10:00:00Z and at 2026-11-11T16:59:00Z the option is not shown. The other two options are shown. | fails (no group) |
| hide rule, UTC date differs | at 2026-11-11T17:30:00Z (00:30 on 12 Nov, Bangkok) the option is shown | fails |
| expiry text, same day | server `expiresAt` 2026-11-11T10:00:00.000Z with the clock at 05:00Z: en text matches `/Open until 5:00\sPM$/`, th text matches `/17:00$/`, and neither holds a month name | passes (characterization of the time-only text) |
| expiry text, later date | server `expiresAt` 2026-11-18T05:00:00.000Z, clock 2026-11-11T05:00:00Z: en text matches `/Open until Nov 18,\s12:00\sPM/` (12:00 PM is 05:00Z in Bangkok = 12:00); th text matches `/18 พ\.ย\. 12:00/`; neither holds `2026` or `2569` | fails (time only) |
| expiry text, Bangkok date edge | clock 2026-11-11T16:00:00Z (23:00 Bangkok), server `expiresAt` 2026-11-11T19:00:00.000Z (02:00 on 12 Nov): the text holds the date (the UTC date is equal, the Bangkok date is later) | fails |
| expiry text, no date near midnight | clock 2026-11-11T17:30:00Z, server `expiresAt` 2026-11-12T10:00:00.000Z: time only (same Bangkok date) | passes (characterization) |
| server refusal | a 400 response with body `{ code: "invalid_input" }` shows the alert with the `lifetimeInvalid` text (en literal "This choice is not available now. Choose another time."; th from the message tree). The generic text is absent. The radio group stays, the busy state ends, and no code shows. This case also covers OQ-2 (the browser clock shows `until_17` at 16:00 Bangkok and the server refuses). | fails (generic text) |
| contract 400 stays generic | a 400 response with no `code` shows the generic text | passes (characterization) |
| `errorKey` unit | `errorKey(new ClassLoginApiError(400, "invalid_input"))` is `"lifetimeInvalid"`; `errorKey(new ClassLoginApiError(400))` is `"generic"` | fails |
| help text | the key `lifetimeHelp7d` is a non-empty string in `en` and `th`. The text shows when `7d` is selected and does not show for `3h`. The `en` text is the literal of plan task 1.9. | fails |
| option size and label (artifact) | each radio has a visible label with the text of its option (not `aria-label` alone), and the label element or its wrapper carries a height class of `min-h-11` or more (`min-h-11`, `min-h-12`, `h-11`, `h-12`). jsdom has no layout. This case is an artifact test and proves the class only. The browser check of section 6.9 measures the pixels. | fails |
| string parity (artifact) | the key paths under `ClassLogin.session.lifetime`, `ClassLogin.session.lifetimeLabel`, `ClassLogin.session.lifetimeHelp7d`, and `ClassLogin.errors.lifetimeInvalid` exist in `en` and `th`, with non-empty strings and with different text (`en` is not copied into `th`). The loop asserts `keys_checked=6`. | fails |
| existing cases | all other existing cases stay green. Those that run at the real clock do not assert the option list (M9). | passes |

**Expected Red result at HEAD.** Exit 1. The failures sit only in the rows marked "fails". The characterization rows pass and the Red evidence lists them. The labeled counts: `tests_total`, `tests_failed`, `tests_passed`, `red_failures_bad_reason=0`, `existing_assertions_changed=1`.

**Red commit:** `test(primary): pin the lifetime choice (track_id: primary_class_session_lifetime_20261111)`, test files only.

#### 6.9 Green gates for tasks 1.6 to 1.8, and the browser review

| Task | Gate | Expect |
|---|---|---|
| 1.6 handler | `APP_CMD lib/__tests__/student-login-handlers.test.ts` after the build of task 1.5b | exit 0, `tests_failed=0` |
| 1.7 panel | `APP_CMD components/__tests__/class-session-control.test.tsx components/__tests__/class-login-panel.test.tsx`, then the matrix of section 1.6 for the control file | exit 0, `tests_failed=0`, `tz_runs_green=3` |
| 1.8 strings | the panel gate again, in `th` and `en`. `node -e` or `jq` proves both message files are valid JSON. The new keys sit in the same order in both files. | exit 0, `json_valid=2`, `keys_checked=6` |

A Green role changes no test file. A needed test change goes back to the orchestrator as a new plan line.

**The browser review (task 1.12).** Scope:

- **Build and server.** The orchestrator builds the Primary app inside `HEAVY` and starts `next start` on a free port. The port is never 3005 and never 3099. The database is a scratch database copy or the test seed, never the shared `primary_advantage` database. The orchestrator records the URL and the database name.
- **Viewport.** One viewport: a laptop, 1366x768.
- **Locales.** `th` and `en`.
- **Steps for each locale.**
  1. Sign in as a seeded teacher. Open the class sign-in panel of a seeded class.
  2. The group shows three options and "3 hours" is selected. Measure each option's clickable area with `getBoundingClientRect()`: height 44 px or more. Record `option_min_height_px=<n>`.
  3. Select "7 days" and start. The code shows. The text shows the date. The text matches the server `expiresAt`.
  4. Read the `class_start` audit row in the scratch database: `lifetime` is `7d`.
  5. A new code with the same selection keeps `7d`.
  6. The hide rule after 17:00 Bangkok: the option is hidden. The check needs a fixed clock. Use the browser tool clock override (`Date` override before load) at 2026-11-11T10:05:00Z. When the tool cannot override the clock, the evidence says `hide_rule_browser=unchecked` and the unit cases of section 6.8 carry the rule.
  7. End the class. The code fails at the sign-in page.
- **Narrow width.** The spec asks that the control works at a narrow width. The required browser check has one viewport. A second viewport (390x844) is optional. Review C reads the wrap classes. The strategy does not require the second viewport.
- **Evidence class:** automated if the steps run by script, person-checked if a person drives the browser. The note says which. A screenshot goes under `/tmp/opencode`.
- **Cleanup.** The orchestrator stops the server by the PID from `ss -ltnp` for its port and removes the scratch database and the build output.

#### 6.10 The allowed paths

**Red paths (tasks 1.1 and 1.2):**

- `packages/domain/src/__tests__/student-login-class-session.test.ts`
- `packages/domain/src/__tests__/student-login-contracts.test.ts`
- `packages/domain/src/__tests__/student-login-card.test.ts` (only when `card_file_edit=1`)
- `packages/domain/src/__tests__/student-login.real-db.test.ts` (one new `it`)
- `apps/primary-advantage/lib/__tests__/student-login-handlers.test.ts`
- `apps/primary-advantage/components/__tests__/class-session-control.test.tsx`
- `apps/primary-advantage/components/__tests__/class-login-panel.test.tsx` (only when a case needs it)

**Green paths (tasks 1.3 to 1.8):**

- `packages/domain/src/student-login/contracts.ts`
- `packages/domain/src/student-login/errors.ts`
- `packages/domain/src/student-login/class-session.ts`
- `packages/domain/src/student-login/index.ts` (only if a new export needs a line)
- `apps/primary-advantage/lib/student-login/http.ts`
- `apps/primary-advantage/lib/student-login/handlers.ts` (only if a case needs it; it should not)
- `apps/primary-advantage/components/teacher/class-login/class-session-control.tsx`
- `apps/primary-advantage/components/teacher/class-login/api.ts`
- `apps/primary-advantage/components/teacher/class-login/class-login-panel.tsx` (only if it needs it)
- `apps/primary-advantage/messages/en.json`
- `apps/primary-advantage/messages/th.json`
- the track files under `measure/tracks/primary_class_session_lifetime_20261111/` and `measure/runs/primary_class_session_lifetime_20261111/`

**Paths out of scope:** `packages/db` (AC-8), `card-token.ts`, `rate-limits.ts`, `picture-password.ts`, `codes.ts`, `credentials.ts`, `access.ts` (unless section 7.1 is active), `packages/domain/src/calendar-day.ts`, and the messages of `cn`, `tw`, and `vi` (unless section 7.2 is active). The count `lifetime_out_of_scope_paths=0` is a labeled integer.

**Other new files:** none. Green adds no file. `build-graph update` changes `graph.db`, which Git does not track as a track file. The phase check lists any other change.

#### 6.11 Task 1.11: the closeout gate

All commands run at one HEAD. Run one job at a time. The orchestrator records `git rev-parse HEAD`.

1. **Domain type check:** `HEAVY` with `pnpm --filter @reading-advantage/domain check-types`. Exit 0.
2. **Domain build:** `HEAVY` with `pnpm --filter @reading-advantage/domain build`. Exit 0. `dist_has_lifetime>=1`.
3. **App type check:** `HEAVY` with `pnpm --filter primary-advantage check-types`. Exit 0. This runs after step 2, so it reads the new `dist`.
4. **ESLint on the changed files only:** `pnpm --filter primary-advantage exec eslint <changed app files>` and `pnpm --filter @reading-advantage/domain exec eslint <changed domain files>`. Exit 0. The Primary app has pre-existing errors. The count `eslint_new_errors_in_changed_files=0` is a labeled integer.
5. **Targeted tests:** the Red commands of tasks 1.1 and 1.2 (exit 0, `tests_failed=0`), plus every existing `student-login-*` domain file: `src/__tests__/student-login-card.test.ts src/__tests__/student-login-class-passwords.test.ts src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-contracts.test.ts src/__tests__/student-login-limits.test.ts src/__tests__/student-login-picture.test.ts src/__tests__/student-login-roster.test.ts src/__tests__/student-login-usernames.test.ts` (AC-7). The time-zone matrix of section 1.6 passes (`tz_runs_green=3` for each of the two files).
6. **Domain aggregate suite:** `HEAVY` with `CI=true pnpm --filter @reading-advantage/domain test`. Compare with the base record of section 1.4: `suite_failed_new=0`. Every failing file is also in the base list.
7. **Real-database run** (section 6.3), or `real_db_skipped=<n>` with the reason.
8. **`git diff --name-only <phase_base_sha>..HEAD -- packages/db` is empty** (AC-8). The count `db_changed_paths=0` is a labeled integer.
9. **Detector of section 6.4:** `untouched_login_files_changed=0`.
10. **Scope check** of section 1.5: `lifetime_out_of_scope_paths=0`.
11. **No hash added:** `git diff <phase_base_sha>..HEAD -- . ':(exclude)measure' | rg -n 'sha256|createHash|checksum'` finds no added line that belongs to this track (the existing code holds `createHash` in unrelated files, so the reviewer reads only the added lines). The count `added_hash_lines=0` is a labeled integer.
12. **`build-graph update ./graph.db <changed source files>`** through `HEAVY` (A10).
13. **Strings out:** task 1.10 hand-off sent (`[b] deferred:pm`). It does not block the other closeout items.
14. **Reviews and browser:** Review A, B, and C pass. The adversarial round reports. The browser review of section 6.9 is done and recorded.

The Green gate of the phase is steps 1 to 6 and 8 to 10. The closeout needs all 14 steps, with step 13 as the one human gate.

## 7. Ready rows that are not active

### 7.1 OQ-1: refuse `7d` for a code-only class (INACTIVE until a PM decision)

The status is **not active**. Red does not write these rows by default. If the PM answers that the server refuses `7d` for a class with the picture password off, the orchestrator activates them as a plan amendment before Red starts, or as a Red follow-up before Green.

| Case | Expected |
|---|---|
| domain, `7d` with `classRow.picturePasswordEnabled = false` | rejects with `StudentLoginError` code `invalid_input`; no insert, no update, no delete, no audit call |
| domain, `3h` and `until_17` with the same class | work (positive control: the refusal is about `7d` only) |
| domain, `7d` with `picturePasswordEnabled = true` | works (the existing case stays) |
| handler, domain throws `invalid_input` | 400 (already covered) |
| control, a prop or roster value `picturePasswordEnabled: false` | the "7 days" option is hidden or disabled, and a text explains why |

`access.ts` already returns `picturePasswordEnabled` (`access.ts:42,58`). The `ClassRoster` type already carries `picturePasswordEnabled`. When active, the allowed paths of section 6.10 add nothing for the domain (the flag is already read), and add the prop wiring in `class-login-panel.tsx` and `class-session-control.tsx`.

### 7.2 F5: the new keys in `cn`, `tw`, and `vi` (INACTIVE until the orchestrator decides)

The status is **not active**. The default keeps the plan scope (`th` and `en` only). See finding F5 (section 8).

If the orchestrator activates it: Red adds one artifact case that checks the six keys of section 6.8 in all five locales (`keys_checked=30`). Green adds the six keys to `cn.json`, `tw.json`, and `vi.json`, with the `en` text as a labeled stopgap (not a translation). The allowed paths add `apps/primary-advantage/messages/cn.json`, `tw.json`, and `vi.json`. The PM is told that these three locales hold English text.

## 8. Findings and questions for the orchestrator

- **F1 (spec review, Major): closed.** The rule is in section 6.2: the check runs before `:84`. The case `refusal makes no write` proves it, with a positive control.
- **F2 (Nit): closed.** Section 6.3 names the one new real-database case. The existing calls need no change.
- **F3 (Nit): closed.** Section 6.7 states the default: add `lifetimeHelp7d` now.
- **F4 (Nit): closed.** Section 6.8 names the formatter: `useIntlFormatter().dateTime` (Intl with `SCHOOL_TIME_ZONE` and the page locale tag) with `day`, `month: "short"`, `hour`, and `minute`. No year is printed. The `th` Buddhist year is therefore never shown. The literals are in M13.
- **F5 (new, Major, spec FR-5 and plan task 1.8): the claim that `cn`, `tw`, and `vi` "fall back as they do today" is wrong** (M10). Those locales have a full `ClassLogin` tree and no fallback for it. A teacher in those locales sees raw key text on the new control. **Question to the orchestrator:** fill the six keys in `cn`, `tw`, and `vi` with English text (section 7.2), or accept the gap? **Default:** keep the plan scope (the row stays inactive). **Recommendation:** activate it. The cost is three message-file edits and one artifact case.
- **F6 (new, Minor, plan): the plan has no domain build step** (M4, section 6.4). Task 1.5b is added by this strategy. Without it, the app gates read an old `dist`.
- **F7 (new, Minor, plan 1.1):** the plan card-file instruction needs a falsifiable case. Section 4.1 explains that a mock case cannot prove expiry. The card file stays unedited by default (`card_file_edit=0`).
- **F8 (process):** the role request names `phase_base_sha = 90b4e22ff...`, and HEAD at the start was `7b441fbe6`. That value predates this strategy commit. The role rule says to capture the value after the strategy commit. This file follows the role rule (section 1.5).
- **OQ-1** stays with the PM. The default is no refusal rule. Section 7.1 holds the ready rows.
- **OQ-2** is covered by the case `server refusal` in section 6.8.
- **OQ-3** is closed by F4.

## 9. Anti-pattern coverage

The catalog is `measure/anti-patterns.md`. A1, A2, A8, A11, and A13 are not phase risks of this track. A1 applies to the orchestrator supervisor. A2 applies to a publish gate. A8 applies to the plan markers, which the plan-update role owns. A11 applies to a review track. A13 applies to the closeout move of the track folder.

| ID | Defense in this phase | Falsification condition |
|---|---|---|
| A3 | Every count is `label=<n>`: `tests_total`, `tests_failed`, `refusal_writes`, `tz_runs_green`, `keys_checked`, `choices_checked`, `refused_rows`, `dist_has_lifetime`, and the others. A count check parses the label. | A date or a bare number passes a count check. |
| A4 | The base run proves the files are green before Red. The F1 case has a positive control that inserts. Each loop asserts its size first (`choices_checked=3`, `refused_rows=6`, `keys_checked=6`). No mock case is named "expired" (section 4.1). The refusal cases assert a write call count of 0 against a fixture that writes in the control. | A refusal case passes with a fixture that cannot write. A loop runs over an empty list. |
| A5 | A plan note quotes the exit code and the labeled counts of the command it cites. The real-database part says `real_db_ran=0` when skipped. It never says "pass". | A note says "pass" and the cited command exits non-zero or skipped the case. |
| A6 | The registry note for this track names the real-database run state and the F5 gap. It does not claim that all five locales are done. | The registry claims that every locale shows the control while F5 is open. |
| A7 | No detector uses a bare word as an exclusion token. The near-miss values (`"7D"`, `" 7d"`) are positive refusal cases. The hash detector of section 6.11 step 11 is read by a person for added lines. | A near-miss value is accepted, or a real added hash line is filtered out. |
| A9 | No test of this track reads a `measure/tracks/` path or a `measure/runs/` path. The archive and scope checks are shell commands. | A test holds the string `measure/tracks` or `measure/runs`. |
| A10 | The closeout runs `build-graph update ./graph.db <changed source files>` once after the structural edits (step 12). | The phase changes an export and the graph stays stale. |
| A12 | The message key checks read the real message files through the shared helper. No test holds a key list of its own beyond the six keys of the plan task 1.9. | A key list in a test drifts from the plan. |
| A14 | Every detector uses `rg -n '<regex>'`. The command never uses `rg -nE`. An exit code of 2 is a failure. | A detector exits 2 and the evidence reads "no hit". |
| A15 | The role receipts hold the commit and the commands. They hold no file hash. | A receipt holds a hash of a file that a later commit changes. |
| A16 | The one-worktree rule holds (section 1.1). `git worktree list --porcelain` shows one worktree at the phase check. | The list shows more than one worktree. |

## 10. Summary of the commands

```bash
# Red 1.1 (domain)
CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-contracts.test.ts src/__tests__/student-login-card.test.ts
# Red 1.2 (app), after the dist rebuild of section 6.1 step 3
CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 lib/__tests__/student-login-handlers.test.ts components/__tests__/class-session-control.test.tsx components/__tests__/class-login-panel.test.tsx
# Green 1.3
CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-contracts.test.ts
# Green 1.5, then the TZ matrix (UTC and America/Los_Angeles) for the class-session file
CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-card.test.ts src/__tests__/student-login-contracts.test.ts
# Green 1.5b (inside HEAVY)
pnpm --filter @reading-advantage/domain build
# Green 1.6
CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 lib/__tests__/student-login-handlers.test.ts
# Green 1.7 and 1.8, then the TZ matrix for the control file
CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 components/__tests__/class-session-control.test.tsx components/__tests__/class-login-panel.test.tsx
```
