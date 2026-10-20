# Forge sync: receiving steps (monorepo)

Track `apk3d_games_port_20261003`. Forge side: track `apk_monorepo_sync_workflow_20261020`
(Forge 71351fd0). For the monorepo session, which does every write in the monorepo.

Owner rule (2026-10-06): the Forge session works in `~/Desktop/advantage-forge` and runs only
read-only commands in the monorepo. The monorepo session runs the sync, the commit, the merge, and
the checks.

| Place | Path |
|---|---|
| Port worktree (branch `apk3d-games-port`) | `~/Desktop/reading-advantage-monorepo-3d` |
| Target worktree (branch `primary-parity-integration` until the owner merges it into master; after that, the branch the owner names) | `~/Desktop/rama-worktrees/integration` |
| Heavy lock | `~/Desktop/primary-parity-progress/heavy.lock` |

## 1. Read the handoff

Forge sends the full text of `scripts/monorepo-handoff.ts --target <branch>`.

1. Read the commit list. The handoff gives each Forge commit a class: fix, feature, release, or other.
2. During a feature freeze, accept fix and release commits only. A feature commit needs the owner's go.
3. When only one commit of the range is a fix, ask Forge for a fix-only sync (`--forge-commit <sha>`).
4. Note the packs that change (old and new version) and the games to check. Step 6 needs both lists.

## 2. Sync and commit

1. Check the memory: `ps -eo pid,rss,args --sort=-rss | head`. Ask the other sessions to pause a render or build.
2. In the port worktree, bring the port branch up to the target: `git merge --ff-only <target branch>`.
3. From the Forge root, run the sync. The script writes the port worktree and commits:
   `flock ~/Desktop/primary-parity-progress/heavy.lock node --import tsx scripts/monorepo-sync.ts --commit`
   For a fix-only sync, add `--forge-commit <sha>`.
4. The sync gate runs the kit tests and the games tests first. A red check commits nothing ("a check
   failed: nothing is committed"). Then send the output to Forge and stop.
5. Check the commit: the subject is `chore(game-cartridges-3d): sync from Forge <sha> (track_id: apk3d_games_port_20261003)`.
   Read `git show --stat HEAD`.

## 3. Merge into the target

1. In the target worktree: `git merge --ff-only apk3d-games-port`.
2. Build the package output, because the package exports point at `dist`. Run each build under the lock:
   `pnpm run build` in `packages/advantage-play-kit-3d` and in `packages/game-cartridges-3d`.
3. Answer Forge with the monorepo commit and the gate results. Forge then runs
   `monorepo-handoff.ts --record <monorepo sha>`.

## 4. Checks after the next app rebuild

The app serves the packs from its own `public/` folder: `/packs/<id>/<version>/` and
`/assets/apk/primary-chibi-2d/v1/` (the host uses `assetBase="/"`). The copy step is
`pnpm sync:3d-assets`. The app `prebuild` runs it, so `pnpm build` and the Docker build copy the
packs. A plain `next build` does not run it. The manual test server script
(`~/Desktop/primary-parity-progress/rebuild-manual-server.py`) runs the copy step first.

1. Check each new pack address. Each must answer 200:
   `curl -s -o /dev/null -w '%{http_code}' http://localhost:3005/packs/<id>/<version>/pack.json`
2. Check the 2D pack version: `/assets/apk/primary-chibi-2d/v1/pack.json` must give the version of the handoff.
3. Open each game of the handoff in 3D, in headed Chrome (real GPU). Open it again in 2D (add `?renderer=phaser`).
4. Pass when each game shows its models, no request gets 404, and no page error shows. Take one screenshot per run.
5. Send the result to Forge. A 404 makes the 3D game show "This device is not supported for this game".
   That screen does not mean a device fault (tech debt 2026-10-20, 3D game host follow-ups).

## Open after the cutover

`--status` in Forge lists a70e1ebf (the cartridge XP guard) as not received. The first sync after
the cutover brings it, together with the monorepo end card change and its kit test (tech debt
2026-10-20, 3D game host follow-ups).
