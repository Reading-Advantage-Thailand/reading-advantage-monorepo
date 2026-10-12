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
