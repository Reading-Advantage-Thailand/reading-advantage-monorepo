# Acceptance: primary_parity_cleanup_20261011

- Date: 2026-10-12 (batch capture 1)
- Legacy revision: bfea121
- New commit: 0c9356701 (production build; the play-kit `dist` and the other package `dist` folders were rebuilt first with `turbo run build --filter=primary-advantage^...`)
- Copies: primary_legacy_20261011, primary_parity_20261011
- Pair list: `acceptance-pairs.json` (AC-1 to AC-10; it parses with `PairList` of `scripts/primary-parity/pairs.ts`)
- Behavior contracts: `behavior-contract-fr10.md`, `behavior-contract-fr13.md`

## Migrated data checks (read-only, run 2026-10-12 on `primary_parity_20261011`)

| FR | SQL | Result |
| --- | --- | --- |
| FR-3 | `select count(*) from articles where author_id is not null and is_public = false` | 0 (Q2 stays unasked) |
| FR-6, FR-8 | `select count(*) from game_challenge_definitions where game_id in ('wizard-vs-zombie','labyrinth-goblin-king')` | 0 |
| FR-6, FR-8 | `select count(*) from game_completions where game_type in ('wizard-vs-zombie','labyrinth-goblin-king')` | 0 (the table has 0 rows in this copy; `game_challenge_runs` also 0) |
| FR-12 | Live rows of `ai_task_configs` and `ai_providers` in the C4 dump | Done in Phase 8: `qa.feedback` = Vertex `gemini-3-flash-preview`; `chatbot.stream` = OpenAI `gpt-4o-mini`; equal to `lib/ai/models.ts` |

The copy holds no game data, so the legacy-id check has nothing to count. `gameFor` maps the legacy ids
(`lib/games/catalog.ts`); a unit test covers it.

## API and asset probes for the batch (the page captures cannot show them)

Run against the new server after the build. Expected: every line prints `404`, except the redirect lines.

```bash
B=http://localhost:3005
for p in /api/articles/generate /api/articles/generate/custom-generate /api/articles/generate/custom-generate/save \
  /api/articles/generate/custom-generate/approve /api/host-proof/games/completions \
  /assets/apk/standard-pack-qc/apk-ui-panel-square.png; do
  echo "$p GET $(curl -s -o /dev/null -w '%{http_code}' $B$p) POST $(curl -s -o /dev/null -w '%{http_code}' -X POST $B$p)"; done
# AC-8: with a student session cookie in $C, each prints 308 and a location header with /student/games/apk/<id>
for g in vocabulary/dragon-rider vocabulary/enchanted-library vocabulary/rpg-battle vocabulary/rune-match sentences/potion-rush; do
  curl -s -I -H "Cookie: $C" $B/en/student/games/$g | grep -i -E '^(HTTP|location)'; done
curl -s -I -H "Cookie: $C" $B/en/student/games/vocabulary/unknown | head -1   # 404
```

A route that needs a session can give 401 or a redirect to sign-in before 404. Record the code that you see.
Also check the image layout: run the runner layout check of the batch and confirm that
`find <runner tree> -path '*standard-pack-qc*'` prints no file (AC-7; the Dockerfile `RUN rm -rf` line removes the files of other apps).

## Runner layout check (E-7, run 2026-10-12)

A hard-link copy of `.next/standalone` plus `.next/static` and `public` was placed as the Dockerfile runner stage places them. Before the `RUN rm -rf` line, `find -path '*standard-pack-qc*'` listed 158 paths. After the `rm -rf` line: 0 paths, 0 `standard-pack-qc-preview` files, 0 files or folders with `elvgames` in the name. `node apps/primary-advantage/server.js` (port 3005, run clone) started. Sign-in page: HTTP 200, title "Sign In", CSS asset 200. Student games page (kit student): HTTP 200, title "Games", 220 KB. Result: pass. Note: the check finds files by name only. Other `advantage-games` files stay in the copy (`package.json`, `public`), but none has an ElvGames name.

## Probe results (new server, 2026-10-12)

| Probe | GET | POST |
| --- | --- | --- |
| /api/articles/generate | 500 | 405 |
| /api/articles/generate/custom-generate | 404 | 404 |
| .../custom-generate/save | 404 | 404 |
| .../custom-generate/approve | 404 | 404 |
| /api/host-proof/games/completions | 404 | 404 |
| /assets/apk/standard-pack-qc/apk-ui-panel-square.png | 404 | 404 |

With a student session: `/api/articles/generate` POST 405; `custom-generate` POST 404; `host-proof` POST 404; `/en/student/host-proof/games` page 200 with the not-found content. Old game URLs (dragon-rider, enchanted-library, rpg-battle, rune-match, potion-rush): 308 with location `/en/student/games/apk/<id>`. `vocabulary/unknown`: 404.

## Result table

| Pair | Check | Result | Note |
| --- | --- | --- | --- |
| AC-1 | AC-1-1 | pass | New app shows the 404 page (HTTP status 200 with the not-found text, as the app does for all missing pages). Legacy showed the test tools. |
| AC-1 | AC-1-2 | pass | The 404 page has no nav, so no Testing item. |
| AC-2 | AC-2-1 | pass | 404 page in the new app. |
| AC-2 | AC-2-2 | pass | No nav on the 404 page. |
| AC-3 | AC-3-1 | fail (minor), fixed in code (commit 5a7085de8): recapture in batch 2 | `/api/articles/generate` has no route file. A dynamic route `app/api/articles/[articleId]` answers: POST 405, GET 500 (body `Error`). Expected 404. No generation runs. Likely file: `apps/primary-advantage/app/api/articles/[articleId]/route.ts` (no id validation, and the GET throws for the id `generate`). |
| AC-3 | AC-3-2 | pass | `custom-generate` GET and POST, `/save`, `/approve`: all 404, with no session and as a student (POST 404). |
| AC-4 | AC-4-1 | pass | After the dependency rebuild: parchment panel with ink text at 375 and 1280 px, no navy fill. First run on a stale play-kit `dist` (7 Oct) showed the old navy panel: a harness issue, not an app defect. |
| AC-4 | AC-4-2 | not checked; the check now has a `network` pattern: recapture in batch 2 | The kit does not record the network log. The PNG probe gives 404 (AC-7-1). Check by hand. |
| AC-5 | AC-5-1 | pass | White staff card with a border, no navy fill (after the dependency rebuild). |
| AC-5 | AC-5-2 | not checked; the check now has a `network` pattern: recapture in batch 2 | The kit does not record the network log. Check by hand. |
| AC-6 | AC-6-1 | pass | 404 page text in the new app (HTTP status 200 for the page, not-found content). |
| AC-6 | AC-6-2 | pass | POST `/api/host-proof/games/completions` gives 404 (no session and as a student). |
| AC-7 | AC-7-1 | pass | GET and POST `/assets/apk/standard-pack-qc/apk-ui-panel-square.png` give 404. |
| AC-7 | AC-7-2 | pass | Runner layout check, see below. |
| AC-8 | AC-8-1 | pass | Five old URLs give 308 to `/en/student/games/apk/<id>` with the same id. The rune-match page shows its intro (the 3D scene itself was not played). |
| AC-8 | AC-8-2 | not checked | No `/th/...` probe in this run. |
| AC-8 | AC-8-3 | pass | `vocabulary/unknown` gives 404. |
| AC-9 | AC-9-1 | fail (pair data), fixed in pair data: recapture in batch 2 | The new app shows "Failed to load lesson": `AssignmentForbiddenError`. The assignment in the pair list belongs to a class that the kit student has not joined. Legacy has no such check. Use an assignment of the kit student's class. AI keys are off anyway. |
| AC-9 | AC-9-2 | not checked | Blocked by AC-9-1; no AI key in the kit. |
| AC-10 | AC-10-1 | fail (pair data), fixed in pair data: recapture in batch 2 | Same page as AC-9: "Failed to load lesson", so the chatbot did not open. |
| AC-10 | AC-10-2 | not checked | Blocked by AC-10-1; no AI key in the kit. |

Owner look check: pending (owner, async). Report: `~/Desktop/primary-parity-acceptance/captures/primary_parity_cleanup_20261011/report.html`.

## After batch 1 (fixes, 2026-10-12)

- AC-3-1 now expects 404 with a JSON body for `GET /api/articles/generate`. The route `app/api/articles/[articleId]`
  checks that the id is a UUID, answers 404 JSON for an unknown or malformed id, and logs other errors with the
  Primary logger. `POST` stays 405 because the dynamic route has no POST handler. The spec (AC-3) says "each new
  route gives 404"; it does not name 405. Treat 405 on `POST /api/articles/generate` as accepted: no generation
  code runs and no AI call starts. A strict 404 for POST needs a POST handler that only returns 404; nobody added one.
  No session check was added (item E-8 waits for the owner).
- AC-9 and AC-10: both pairs now use the assignment `cmhmg00n10009t7mktirfpce7` of the class of the kit student.
  The new path maps it with `{map:assignments:...}`. The pair lists the legacy id and the new id separately.
  Recapture in batch 2.
- AC-4-2 and AC-5-2: the checks carry `"network": "standard-pack-qc"`. The report prints the matching request paths
  of each app in the Note cell. "No matching request" is the pass result.
