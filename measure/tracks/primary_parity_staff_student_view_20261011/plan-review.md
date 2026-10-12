# Plan review: Phase 0 design

Phase start sha: `43c2cab2f`. Review of the phase diff (docs, design notes, pairs, SQL). No app code changed.

Plan compliance: all four tasks done. The two look-check tasks use the defaults and carry "look check pending (owner, async)".

Security: the pair list has no password, token, or class code. `legacyPath` uses the raw legacy id; `{map:}` is only in `newPath`. The SQL file is read only.

Tests: the pair list parses with `PairList` (11 pairs). No code, so no unit test in this phase.

## Findings

| Level | Finding | Action |
| --- | --- | --- |
| Medium | The spec line numbers for `question.ts`, `article.ts`, `articleModel.ts`, and the read page were stale. | Corrected in `spec.md` and `behavior-contract.md`. |
| Medium | Two write routes were missing from the spec inventory: `flashcard/save/[id]` POST and `users/activitylog/[id]` POST. | Added; Phase S2 must guard both and add them to the route test. Check if `flashcard/save/[id]` really writes (it may only read). |
| Medium | `getAvatarState` writes (`ensureStarterSet`, `shop.ts:119`) on every read, so six pages write. | Phase S2 must split the read from the write or skip the call in preview. |
| Medium | The read page already limits `saveArticleCardsAfterQuiz` to STUDENT (quick_fixes item 8 is fixed). | Keep; S2 adds a test. |
| Low | The mock header is a text stand-in, not the real nav and HUD. | Phase S1 captures the real shell in acceptance. |
| Low | The `Buy` and `Save` buttons use `disabled`; a screen reader needs the note text near them. | Phase S3 links the note with `aria-describedby`. |

Shortcuts: none in code. Deviation: none. Lesson: a banner on a dark leather bar vanishes on the
dark scenes and a `Banner` hangs below its box, so it needs its own spacing and `relative z-10`
over the fixed scene backdrop.

## Phase S1 review (2026-10-12)

Plan compliance: all tasks done. Scope: access, provider, banner, menu item, back link, copy.
Security: the mode comes from the session role only (`studentViewModeFor`). `isStaffRole` reads the
role string of the session, never `user_roles` (checked). INTERN stays out. No data read or write is new.
Tests: 8 files, 59 tests pass (red run first: 7 tests failed). The app type check is clean.

| Level | Finding | Action |
| --- | --- | --- |
| High (gate) | After S1 alone, staff open the student pages and every write path saves on the staff row. | `plan.md` carries a MERGE GATE. The orchestrator must not merge S1 before S2. |
| Medium | Home, avatar, Class Quest, and class books can show an error for staff until S3 and S4. | Planned in S3 and S4. |
| Medium | The Thai copy was written by the helper. | Owner check pending. |
| Low | `notSaved` is added in S1 but no component shows it before S2. | Used from S2. |
| Low | `bannerTitle` uses `whitespace-nowrap`; a long Thai or Vietnamese title could be wide at 375 px. | Check in the owner look check; the Phase 0 mock fits English only. |
| Low | `doctor.sh` fails A13 (old archived track directory). | Not from this track. |

Shortcuts: none. Deviation: none. Lesson: the student layout test mocked only `getLocale`; a layout that
reads the session twice needs `currentUser` in the mock (it already had it).

## Phase S2 review (2026-10-12)

Phase start sha: `395b2e824`. Review of `git diff 395b2e824..HEAD` with a security focus.

Plan compliance: all tasks done. The guard has three layers: the app boundary (`guardStudentAction`,
`guardStudentRoute`), the domain (`primary:student-record:write`, STUDENT only), and the client
(`usePreviewSave`). The role is the session role (`users.role`); `user_roles` is never read.
INTERN is refused by every guard, as is an unknown role or a missing role.

Security: a refusal returns `{ status: "preview" }` or a 403 with the fixed code and the fixed text
"Preview: not saved". It carries no id, no row, and no user name. The guard runs before any body parse,
any read, and any write (the tests assert zero select, insert, update, delete, and transaction calls).
The log line holds the operation and the role only.

### Write paths and their guards

| Write path | Guard |
| --- | --- |
| `finishQuiz`, `retakeQuiz` (`actions/question.ts`) | `guardStudentAction` first |
| `updateUserActivity` (`actions/user.ts`) | `guardStudentAction` |
| `fetchArticleActivity` (`actions/article.ts`) | `guardStudentAction` |
| `saveFlashcard`, `saveArticleToFlashcard`, `reviewCard`, `deleteFlashcardCard` | `guardStudentAction` |
| `setAvatarProfileAction` | `guardStudentAction` and domain `assertStudentRecordWriter` |
| `POST /api/lessons/[articleId]` | `guardStudentRoute` |
| `POST /api/assignments/[id]` | `guardStudentRoute` (route now reads the session first) |
| `POST /api/v1/apk/complete`, `PATCH /api/v1/apk/rpg` | `guardStudentRoute` before the old STUDENT check |
| `POST /api/v1/apk/challenges/runs` | wrapper with `guardStudentRoute`; the shared handler is unchanged |
| `GET /api/v1/avatar` (write on read) | `guardStudentRoute` and `getAvatarState` skips `ensureStarterSet` for staff |
| `POST /api/v1/avatar/purchase`, `/loadout` | `guardStudentRoute` and domain assert |
| `POST /api/v1/quest/heartbeat` | `guardStudentRoute` and domain assert |
| `POST /api/voice/sessions`, `/connected`, `/end` | `guardStudentRoute` |
| `POST` of the four `flashcard/decks/[deckId]/*` game routes | `guardStudentRoute` |
| `POST /api/flashcard/cards/[cardId]/review` | `guardStudentRoute` |
| `POST /api/flashcard/save/[id]` | `guardStudentRoute` (the route only reads; guarded for the coverage rule) |
| `POST /api/articles/questions/[articleId]` | session check added (it had none), then `guardStudentRoute` |
| `POST /api/users/activitylog/[id]` | `guardStudentRoute` |
| `awardPowerUps` (home page load) | page skips it for staff; domain assert |
| `getAvatarState` callers (six pages) | domain skips the write for staff, so no page change is needed |
| `saveArticleCardsAfterQuiz` (read page) | stays STUDENT-only in the page; test for TEACHER, ADMIN, SYSTEM |
| Exempt (teacher or AI, no student row): `assignments` POST, `assistant/lesson-chatbot`, `v1/apk/challenges` POST, `v1/quest` POST/DELETE/status | listed with reasons in the coverage test |

### Findings

| Level | Finding | Action |
| --- | --- | --- |
| Medium | The five lesson games and the two flashcard games have a client skip but no render test (each needs a large fixture). The server guards and the progress bar test cover the data safety. | Add render tests in S3 or Phase A if the owner wants them. |
| Medium | `postAssignment` (`POST /api/assignments`) has no session check at all (`assignmentController.ts:237`). It is a teacher route, outside this track. | Own fix track. |
| Medium | `GET /api/v1/avatar` returns 403 to staff. S3 must not call it from the preview pages (the pages read the state through the domain). | S3. |
| Low | The `POST /api/flashcard/save/[id]` route writes nothing; the guard only keeps the coverage rule simple. | None. |
| Low | `cn`, `tw`, `vi` `rehearsalHint` stay English (they were English before). | Owner translation pass. |
| Low | `articles/questions/[articleId]` POST now returns 401 without a session (before: the call ran with no check). | Intended. |
| Low | MCQ in the article view shows the preview score inline; the lesson MCQ view moves to its completed state with the toast only. | Look check. |

Shortcuts: the client games rely on the server guards for safety. Deviation: the plan listed a `getAvatarState`
page skip; the domain split made the page skip unnecessary. Lesson: a hand-written test user without a
role breaks once a role guard exists; give every mock user a role. A `pkill -f vitest` inside a Bash
call matches its own shell and kills it; use `ps` and `kill` with the pid.
