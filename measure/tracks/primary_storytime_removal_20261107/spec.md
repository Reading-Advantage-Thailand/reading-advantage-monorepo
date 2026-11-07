# Specification: Remove the void Storytime code from Primary

**Track ID:** `primary_storytime_removal_20261107`
**Type:** chore (classic FR list with acceptance checks)
**Status:** active. Opened 2026-11-07.
**Author model:** claude-code/claude-sonnet-5-5
**Parent track:** [storytime_app_rebuild_20261025](../storytime_app_rebuild_20261025/) (task 7.1, plan line 1997).
**Owner chain:** Daniel (owner, deploy gate, bucket gate) → Monorepo orchestrator (track owner) → PM orchestrator.
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing. The parent phase order stays as it is.

## 1. Purpose

Storytime is its own app, `apps/storytime`. A void Storytime page still sits inside Primary. The page still answers on `https://primary.reading-advantage.com/th/st/2/1` (HTTP 200, checked 2026-11-07). This track removes that code from `apps/primary-advantage`.

Why, word for word. Daniel, Google Tasks, 2026-11-07:

```
Are we back to the Storytime app inside Primary for a third time after I have originated that?
```

Owner rule (AGENTS.md, "One program, one app, one container"): an app never hosts another program's pages. A spec that puts a program inside another app is wrong at the spec stage.

PM decision, 2026-11-07: the code part of plan task 7.1 of `storytime_app_rebuild_20261025` moves into this track. The parent task 7.1 becomes a `[b]` line that points here. The full role chain applies: spec review, strategy, Red, Green with ONE deletion commit, Reviews A, B, and C, phase acceptance, final acceptance, closeout. Review B applies because the host rule in `proxy.ts` changes request routing on a live service.

## 2. Inventory (read only, 2026-11-07, at 732547e11)

All paths start at `apps/primary-advantage/` unless the path starts with `docs/`. The Red role runs `rg -il storytime` again before the first test and records any difference.

**DELETE (25 files):**

| Group | Files | Count |
|---|---|---|
| Route | `app/[locale]/st/[level]/[week]/page.tsx`, `app/[locale]/st/[level]/[week]/__tests__/page.test.tsx` | 2 |
| Components | `components/storytime/storytime-book.tsx`, `storytime-song.tsx`, `storytime-week.tsx`, `components/storytime/__tests__/storytime-week.test.tsx` | 4 |
| Content | `content/storytime/l2/w01.json` to `w08.json`, `content/storytime/weeks.ts`, `content/storytime/media-list.txt` | 10 |
| Library | `lib/storytime/blend.ts`, `host.ts`, `speak.ts`, `week.ts`, `lib/storytime/__tests__/blend.test.ts`, `week.test.ts` | 6 |
| Script | `scripts/storytime/receive-weeks.ts` | 1 |
| Host test | `lib/__tests__/proxy-storytime-host.test.ts` | 1 |
| Root doc | `docs/runbooks/storytime-week-sync.md` (repository root) | 1 |

Total: 2 + 4 + 10 + 6 + 1 + 1 + 1 = 25 files.

**EDIT (9 files):**

- `proxy.ts`: the import on line 9 and the host rule on lines 18 to 20.
- `components/pwa/service-worker-register.tsx`: the `isStorytimeHost` import and check (lines 4, 14, and 15).
- `components/pwa/__tests__/service-worker-register.test.tsx`: the mock and the Storytime case.
- `messages/en.json`, `th.json`, `cn.json`, `tw.json`, `vi.json`: the top-level `Storytime` key.
- `lib/__tests__/route-policies.test.ts`: the `/st/2/1` entry.

**KEEP (no change):**

- `packages/read-along`: `apps/storytime` imports it.
- `packages/types`: the shared program list keeps `storytime`.
- `components/read-along/read-along-player.tsx` and its test: they only name the Storytime speeds of the shared player.
- `app/api/upload/csv/__tests__/route.test.ts`: `storyTimepoints` is a table name.
- Primary `next.config`, `package.json`, `Dockerfile`, and the cloudbuild files: they have no Storytime entry.
- `docs/runbooks/storytime-app-week-sync.md` and `docs/runbooks/storytime-deploy.md`: the runbooks of the new app.
- The bucket prefix `gs://primary-app-storage/storytime/`: Daniel's deletion gate, after 2026-11-20.

## 3. Functional requirements

Evidence classes: **automated**, **person-checked**, **owner-passed** (parent spec section 4).

### FR-1 Remove the code (Phase 1)

- One deletion commit removes the 25 files of section 2 and makes the 9 edits. The Red test commit comes first.
- No other Primary behavior changes. The proxy keeps its locale, sign-in, role, and callback routing.
- `useTranslations('Storytime')` has no caller after the removal, so the `Storytime` message key goes in all 5 locale files.

Acceptance:

- AC-1.1 (automated) Each of the 25 deleted paths does not exist (`storytime_removed_paths=25`). The test asserts that the path list is not empty before each check.
- AC-1.2 (automated) No Primary source file imports `@/lib/storytime` or `@/components/storytime`, and none names `storytimeHostRedirect` or `isStorytimeHost`. The scan excludes `node_modules`, `.next`, and `__tests__/storytime-removed.test.ts` itself.
- AC-1.3 (automated) `proxy.ts` has no Storytime import and no Storytime host rule. The tests `lib/__tests__/route-policies.test.ts` and the Primary proxy tests exit 0, so the other routing is unchanged.
- AC-1.4 (automated) No `messages/*.json` file has a top-level `Storytime` key (`locales_checked=5`). No Primary file calls `useTranslations('Storytime')` or `getTranslations('Storytime')`.
- AC-1.5 (automated) The Primary tests of the touched files exit 0. `tsc --noEmit` for `primary-advantage` exits 0 through `heavy-run`. ESLint of the touched files adds no new error against the known Primary count (49).
- AC-1.6 (automated) `apps/storytime/__tests__/phase1-boundary.test.ts` exits 0 (the new app still builds without Primary files).
- AC-1.7 (automated) The files of the KEEP list are unchanged in the deletion commit (`git diff --stat` over the KEEP paths is empty). No bucket command and no deploy command is part of this track; the bucket and production stay as they are.

### FR-2 Production leaves the route (Phase 2)

- The route leaves production at the next Primary deploy by the team. This track deploys nothing.
- The marker is `[b] deferred:daniel`.

Acceptance:

- AC-2.1 (owner-passed) The team deploys Primary with a commit that holds the deletion commit. The record names the revision.
- AC-2.2 (automated, after the deploy) `https://primary.reading-advantage.com/th/st/2/1` no longer answers with the void Storytime page (the 404 page of Primary or a redirect). The record names the command and the status.

## 4. Constraints

- Hard gates stay with Daniel: deploys, deletions of production data, and public dates. No push and no deploy.
- The bucket prefix `gs://primary-app-storage/storytime/` stays untouched.
- No hash, checksum field, or provenance file (AGENTS.md hashing policy). Git commit identity is the provenance.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy steps run through `HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`, one job at a time. Vitest uses `--maxWorkers=1` and targeted files.
- Commit headers are 100 characters or less, with the `track_id`.

## 5. Out of scope

- Parent task 7.2 (Primary imports the player from `packages/read-along`). It stays in the parent.
- Parent task 7.3 (void branches and worktrees) and 7.4 (continuity watch).
- Any change in `apps/storytime` or `packages/`.
- The deletion of the bucket prefix.

## 6. Open questions

| # | Question | Default |
|---|---|---|
| R1 | The printed QR paths `/th/st/<level>/<week>` on the Primary host: where do they go after the removal? | The domain moved to `storytime-app` on 2026-10-24 (Daniel). The Primary host then answers its own 404. The parent task 7.4 watches the printed paths. |
| R2 | Does the parent task 7.1 keep a part? | The `[b]` line in the parent names this track for the code. The old runbook goes in this track (it is in the DELETE list). |
