# Acceptance: primary_parity_cleanup_20261011

- Date: 2026-10-12 (preparation). The captures run in a batch (orchestrator).
- Legacy revision: bfea121
- New commit: pending (batch capture)
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

## Result table

| Pair | Check | Result | Note |
| --- | --- | --- | --- |
| AC-1 to AC-10 | all | batch capture (orchestrator) | |

Owner look check: pending (owner, async).
