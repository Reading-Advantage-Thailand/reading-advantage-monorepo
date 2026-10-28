# Spec — www change list (standing)

**Track ID:** `www_change_list_20261027`
**Type:** chore (standing track; classic FR list with acceptance checks)
**Status:** active. Standing — no end date. Opened 2026-10-27.
**Owner chain:** Daniel (owner; approval-page gate; deploy gate) → Monorepo orchestrator (track owner: build, review, merge to local master) → PM orchestrator (sends the weekly entries; takes the out-of-scope requests back to PR).

## 1. Request

Daniel, 2026-10-26, tracks page row E8: "This needs to be continuous. Help me think of how to just have changes go to PR, and then PR plans changes to the www pages."

The PM reply, which Daniel's pass accepted: "PR keeps one www change list in its repository and adds each changed fact with the new copy. In my Monday pass I send the new entries to Monorepo. One standing Monorepo track builds them. You check the changed pages on one approval page each week; then your team deploys."

The same decision archived the two July www tracks (`measure/archive/www_product_features_refresh_20260517`, `measure/archive/www_app_directory_20260517`, commit `b7745061f`). This track replaces them.

## 2. What this track is

This is a standing track. It has no end date. It runs one weekly batch when the PM orchestrator sends entries. Each batch builds the copy changes on the www pages. This opening writes only the track files. It writes no app code, no test and no build.

## 3. Who owns what

- PR owns the claims and the copy. It writes each changed fact and the new copy in its own repository.
- Monorepo owns the build. It puts PR's copy onto the pages word for word.
- Monorepo never writes in PR's repository.
- The PM orchestrator is the only cross-project coordinator. Each Monday it sends the new entries of PR's www change list to Monorepo.

## 4. The entry format

Each entry that the PM orchestrator sends has six fields.

| Field | Meaning |
| --- | --- |
| entry id | A stable id that names the entry. |
| page | The route of the changed page, for example `/products/reading-advantage`. |
| locales | The locale list in the entry, for example `en`, `th` or `en, th, zh`. |
| changed fact | The fact on the page that changes, in a few words. |
| new copy | The new copy, in PR's exact words. Monorepo uses it word for word. |
| source | Where the fact came from, in PR's change list. |

## 5. The weekly cadence

Each weekly batch is one phase in `plan.md`, named "Week of YYYY-MM-DD". Work happens on a branch `www/changes-YYYY-MM-DD` from `master`, in a worktree under `/home/daniebo/Desktop/rama-worktrees/`.

## 6. The gates of a batch

Each batch passes these gates, in order:

1. The content tests of `apps/www-reading-advantage` that cover the changed pages. A changed fact with no test gets a new test.
2. Lint.
3. Typecheck.
4. The www build.
5. One live approval page, opened for Daniel, with one row per changed page and locale.

Each heavy command runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.

## 7. After the pass

After Daniel passes the approval page:

1. Merge the branch into local `master`.
2. Remove the worktree and delete the branch in the same turn.
3. The push to `origin/master` stays Daniel's gate. No agent pushes or deploys.

## 8. The rules

- Thai proper names keep the Thai script in the `th` locale: พิกุล ภูกะฐิน and โรงเรียนบุญยาทัตพลประสิทธิ์. The `en` and `zh` locales keep the Latin form.
- One program, one app. The www site is one app. No other app hosts the www pages.
- No new hash or checksum field. Tests and review prove correctness.
- Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, no reset. Other sessions commit in this tree.
- Commit headers stay at 100 characters or less and carry the track id `(track_id: www_change_list_20261027)`.

## 9. Out of scope for a weekly batch

An entry that needs new design, a new page, a new image or a new feature is out of scope. The batch records it and sends it back to the PM orchestrator as a separate request.

## 10. The www locales and page list

Read-only findings from `apps/www-reading-advantage` on 2026-10-27.

Locales: `en`, `th`, `zh` (default `en`), from `src/i18n/routing.ts`.

Pages (under `src/app/[locale]/(marketing)/`):

| Route | Page group |
| --- | --- |
| `/` | home |
| `/about` | about |
| `/services` | services |
| `/services/managed-service` | services |
| `/services/blended-learning` | services |
| `/products` | products overview |
| `/products/reading-advantage` | products |
| `/products/primary-advantage` | products |
| `/products/math-advantage` | products |
| `/products/science-advantage` | products |
| `/products/stem-advantage` | products |
| `/products/storytime-advantage` | products |
| `/products/tutor-advantage` | products |
| `/products/zhongwen-advantage` | products |
| `/products/codecamp-advantage` | products |
| `/features` | features |
| `/case-studies` | case studies |
| `/pricing` | pricing |
| `/contact` | contact |
| `/mastery-advantage` | mastery |
| `/blog` | blog |
| `/blog/[slug]` | blog |
| `/blog/page/[page]` | blog pagination |

## 11. The weekly approval page template

One live approval page opens for Daniel each batch. It has one row per changed page and locale.

Row fields:

| Field | Meaning |
| --- | --- |
| entry id | The id from the entry. |
| page | The changed route. |
| locale | `en`, `th` or `zh`. |
| changed fact | The fact that changed. |
| new copy | The new copy in PR's exact words. |
| source | Where the fact came from. |
| pass | Daniel's pass or reject for the row. |

The page shows one row per pair of changed page and locale, not one row per entry.

## 12. Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-1 | Spec section 4 records the six-field entry format. |
| AC-2 | Spec section 10 records the www locale list and the page list. |
| AC-3 | Spec section 11 records the weekly approval page row fields. |
| AC-4 | The batch receives the entries and reads every field from PR's words. |
| AC-5 | The content tests of the changed pages run first, and a changed fact with no test gets a new test. |
| AC-6 | The copy lands on the changed pages, word for word from PR. |
| AC-7 | Lint, typecheck and the www build pass for the batch branch. |
| AC-8 | One live approval page opens for Daniel, with one row per changed page and locale. |
| AC-9 | After the pass, the branch merges into local `master`, then the worktree is removed and the branch is deleted in the same turn. |