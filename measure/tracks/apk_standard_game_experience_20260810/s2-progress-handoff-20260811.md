# S2 Progress Handoff: Guided Gameplay Tutorial

**Paused:** 2026-08-11 at the user's request  
**Track:** `apk_standard_game_experience_20260810`  
**Last completed product phase:** S1 Standard Game Briefing (`0a2e845`)  
**Recoverable S2 RED checkpoint:** `fa01f9b30`

## Completed and accepted

S1 is complete and manually accepted. The standardized briefing now gates normal
gameplay, presents the objective, complete learning content, instructions, and
applicable controls, and supports compact and wide QC compositions. The final
feedback fixes are in `615f5dcdd`; the formal phase checkpoint is `0a2e845d2`;
the recorded Measure update is `abddca0b3`.

Verification recorded for S1 includes 55 APK files and 370 passing tests with
greater than 80% focused coverage, package type checking/build/lint, focused
Advantage Games QC tests, and live Chrome checks at 390x844 and 1440x900. The
user accepted the result on 2026-08-11.

## S2 work completed before the pause

No S2 production implementation is included in the final merge tree. The
contract boundary was nevertheless frozen from three sources: current APK
contracts, the legacy Advantage Games screens, and Tutor Advantage commit
`622201a` on `origin/oleang/feat/add-navigation-button-through-the-lesson`.

The agreed boundary is:

- APK owns tutorial sequencing, pause/resume, ordered advance, replay, skip,
  progress, lifecycle events, and suppression of production effects.
- A cartridge declares only serializable semantic target IDs and deterministic
  action IDs. Its non-serializable runtime driver executes those actions against
  the real Phaser mechanic.
- Tutorial steps form one linear array. Array position is the only order, so
  branch fields, dangling successors, and unreachable nodes cannot enter the
  contract.
- Resolved Thai or English strings cross the APK boundary. Locale maps,
  translation callbacks, React nodes, and application navigation callbacks do
  not.
- DOM selectors, test IDs, physical key codes, file paths, screen coordinates,
  rectangles, Tutor lesson/session state, sockets, and persistence APIs are not
  manifest fields.
- Tutorial completion, skip, correct feedback, and incorrect feedback may be
  demonstrated, but tutorial mode must emit no `GameResults`, persisted
  progress, authoritative XP, leaderboard write, or normal failure consequence.

## Frozen contract shape

Resume with `game-tutorial-contract.ts` beside the briefing contract and export
it through the existing presentation barrels. The RED checkpoint expects:

- strict schemas for semantic IDs, target kinds (`control`, `mechanic`,
  `learning-item`, `feedback`), deterministic actions, consequences (`neutral`,
  `correct`, `incorrect`), timing, resolved labels, steps, lifecycle policy,
  progress, commands, and the complete tutorial definition;
- a required unsigned 32-bit seed;
- bounded `leadInMs`, `demonstrationMs`, and `lingerMs` values from 0 through
  120000;
- declared target/action registries with unique IDs, no unused declarations,
  and step references that resolve exactly once;
- literal safety policy values for sequential advance, same-seed replay, safe
  skip/complete destinations, and five disabled production effects;
- optional `tutorial` validation in the current cartridge manifest for backward
  compatibility; S5 remains responsible for making it mandatory in new
  scaffolds/readiness checks;
- a tutorial-local `pause | resume | advance | replay | skip` command vocabulary;
- a `tutorial-skip` lifecycle event valid only from tutorial to countdown or
  playing;
- a runtime-only cartridge action-driver interface that receives validated
  input, the selected step, deterministic seed, tutorial mode, and diagnostics,
  but no completion, persistence, DOM, or navigation authority.

## RED checkpoint and restart instructions

Commit `fa01f9b30` contains 449 lines of test-only work:

- `game-tutorial-contract.test.ts` with valid Thai content, strict schema,
  ordering, reference, timing, seed, safety, and adversarial cases;
- lifecycle assertions for `tutorial-skip`;
- manifest assertions for an optional tutorial and nested error paths.

The focused direct Vitest run intentionally stopped RED with one unresolved
tutorial-contract import, two lifecycle failures, and two manifest failures;
42 existing assertions passed. The final merge tree removes this intentionally
failing draft while preserving it in Git history. On a resume branch, reapply
the checkpoint with `git cherry-pick fa01f9b30` and implement until this command
is green:

```bash
cd packages/advantage-play-kit
CI=true ../../node_modules/.bin/vitest run \
  src/presentation/__tests__/game-tutorial-contract.test.ts \
  src/presentation/__tests__/game-briefing-contract.test.ts \
  src/scaffolding/__tests__/cartridge-manifest.test.ts
```

Use the installed Vitest binary directly. The pnpm wrapper currently attempts a
dependency reconciliation against the repository's stale lock state and is not
the reliable focused-test path in this worktree.

## Next implementation sequence

1. Reapply `fa01f9b30` and implement the strict serializable tutorial schemas,
   validator, public exports, optional manifest field, and `tutorial-skip`.
2. Add runtime RED tests for seeded playback through the real cartridge,
   production-completion suppression, and cleanup.
3. Add the explicit tutorial runtime mode and cartridge-owned Phaser mechanic
   driver without changing `GameInput` or `GameResults`.
4. Implement the accessible tutorial controller/presentation, then compact/wide
   QC fixtures and manual verification.

Do not copy the Tutor React/Konva teaching wrapper, Zustand store, fixed Potion
Rush coordinates, socket state, or legacy Next.js navigation. They are product
evidence only.
