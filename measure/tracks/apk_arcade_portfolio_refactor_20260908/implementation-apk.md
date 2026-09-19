# APK shell implementation report

## Outcome

The shared shell now offers Play now and Practice from one briefing.
Play now enters scored play directly.
Practice keeps tutorial results, XP, persistence, and failure effects disabled.

The briefing uses an action-first retro arcade layout.
Expandable sections retain all instructions, learning items, translations, and controls.
The primary action receives focus with `preventScroll`.
Thai text uses Tahoma and Noto Sans Thai fallbacks.

The result screen separates display XP from confirmed XP.
It reports pending, confirmed, failed, and not-applicable persistence states.
Failed saves offer same-result retry and unsaved replay.
The timeout prevents indefinite pending state.
Generation checks reject stale persistence updates.
A synchronous guard blocks rapid duplicate retry requests.

Three authenticated adapters validate strict completion receipts.
They return only server XP and duplicate state to the shared host.
The Advantage adapter records confirmed server XP locally.
It skips duplicate receipts and stale replay receipts.
Each adapter preserves the session key during retries.

The host accepts an optional listening-controller factory.
It creates controllers only for authoritative playing mounts.
The runtime owns a controller after a successful mount.
The host destroys an unowned controller after mount failure.
The host also reports mute changes to external audio without trusting observer behavior.

## Changed files

- `packages/advantage-play-kit/src/presentation/game-briefing-screen.tsx`
- `packages/advantage-play-kit/src/presentation/game-presentation.tsx`
- `packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx`
- `packages/advantage-play-kit/src/presentation/index.ts`
- `packages/advantage-play-kit/src/react/apk-game-host.tsx`
- `packages/advantage-play-kit/src/react/index.ts`
- `packages/game-cartridges/src/standard-experience.ts`
- `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx`
- `apps/reading-advantage/components/apk/StudentCartridgeHost.tsx`
- `apps/primary-advantage/components/apk/StudentCartridgeHost.tsx`
- Matching tests for each changed shell and adapter.

`GamePersistenceState` documents the four persistence states.
`APKHostCompletionConfirmation` documents the authoritative receipt boundary.
`APKGameHostProps` documents listening creation, persistence timeout, and external mute observation.

## Red evidence

The first shared test run failed four tests and passed 88 tests.
It exposed tutorial-first start, missing persistence status, missing timeout, and missing confirmed XP.

The styling test run failed three tests and passed 90 tests.
It exposed scrolling focus, missing disclosures, and the missing visual theme.

The first listening test run failed one test and passed 87 tests.
It proved the host did not pass a controller into playing runtime context.

## Green evidence

The final shared command passed 116 tests across four files.

```text
node ../../node_modules/vitest/vitest.mjs run \
  src/presentation/__tests__/game-briefing-screen.test.tsx \
  src/presentation/__tests__/game-tutorial-screen.test.tsx \
  src/presentation/__tests__/game-presentation.test.tsx \
  src/react/apk-game-host.test.tsx \
  --maxWorkers=1 --no-file-parallelism
```

The Advantage adapter passed 12 Jest tests.
The Reading adapter passed three Jest tests.
The Primary adapter passed four Vitest tests.
These focused checks passed 135 tests in total.

The Advantage Play Kit build passed.
The Advantage Games typecheck passed.
The Game Cartridges typecheck passed.
Earlier Reading and Primary typechecks passed.
Reading required a four-gigabyte Node heap after the default heap failed.

The browser review used the live Wizard vs Zombie preview.
The title, objective, Play now, Practice, and Demonstrate actions remained visible at laptop height.
The learning sections remained available through native disclosures.

The graph update processed ten source files.
It changed 187 nodes to 231 nodes and 309 edges to 326 edges.
A final host refresh changed 37 nodes to 43 nodes without changing 92 edges.

## Broader check limits

The full Game Cartridges suite passed 621 tests and failed five Wizard vs Zombie tests.
Those failures concern concurrent spawn constants, routing, aliases, and asset bindings.
They do not cover this shell change.

The full Advantage Play Kit run encountered concurrent untracked tests.
One scaffold integration test failed, and one archive-path guard failed.
The run then stopped after prolonged execution.
All owned focused tests passed afterward.

Two `pnpm` test attempts tried to reach the package registry and failed with `EAI_AGAIN`.
Direct local Jest and Vitest commands passed.

## Remaining limits

Authenticated hosts still need real listening clips and session metadata.
The public host currently owns its generated preview clips.
The asset-selection phase still owns final frame, icon, effect, and font choices.
Host-owned viewport sizing remains outside this packet.
