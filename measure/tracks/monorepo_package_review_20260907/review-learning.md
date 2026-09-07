# Learning and shared package review

Reviewed 17 packages in the current checkout. The checkout contains existing changes.
I applied the Measure review workflow and the Ponytail Rules. I changed no source files.
I reviewed selected runtime paths and relevant tests. This review does not claim exhaustive coverage of every function.

## Findings

### L1 — P2: Keep the timing watermark when an old event arrives

Source: `packages/practice-core/src/practice/timing.ts:188-190`.
The negative-delta branch changes `lastEventTime` before it discards the event.
Start at zero, then submit interaction timestamps 1000, 500, and 1500.
The accumulator records 2000 milliseconds of wall time, although only 1500 milliseconds elapsed.
A Node reproduction against the existing build returned `wallClockMs: 2000` and `activeMs: 1500`.
The source contains the same faulty branch.
Minimal fix: Remove the assignment in the negative-delta branch.
Test: Add this event sequence to `src/__tests__/timing.test.ts` and assert 1500 milliseconds.

### L2 — P2: Honor a zero recommendation limit in sparse graphs

Source: `packages/knowledge-space-practice/src/planner/recommended-next.ts:236-238`.
The diversity helper selects an item before it checks the limit.
The sparse branch calls this helper with `topN: 0` and returns one skill.
A source reproduction returned `['skill-a']` for one ready skill and `policy: { topN: 0 }`.
The dense branch already returns an empty result for this limit.
Minimal fix: Return an empty array before the helper loop when `topN` is zero.
Test: Cover zero limits in both branches of `planRecommendedNext`.

### L3 — P2: Preserve controller ownership during player effect cleanup

Source: `packages/activity-react/src/interactive-activity-player.tsx:171-172`.
The subscription effect destroys the supplied controller whenever the activity object changes.
React Strict Mode also runs this cleanup before it repeats the effect setup.
The next setup subscribes to the destroyed controller without creating its provider again.
The YouTube controller destroys its player. The hosted controller removes its media event listeners.
A locale change can replace the activity while the host keeps its controller.
Minimal fix: Keep subscription cleanup separate from provider destruction and assign destruction to the controller owner.
Test: Mount with Strict Mode and a real adapter lifecycle stub. Rerender with a new activity object and verify notifications continue.
The existing fake controller does not model destruction, so current player tests miss this failure.

### L4 — P2: Forward the progress value to the accessible root

Source: `packages/ui/src/components/Progress.tsx:11-19`.
The component removes `value` from props but never passes it to the Radix root.
A value of 50 moves the indicator, while assistive technology receives an indeterminate progress bar.
A custom maximum also produces the wrong indicator percentage because the transform assumes 100.
Minimal fix: Pass `value` to the root and calculate the percentage from the effective maximum.
Test: Assert `aria-valuenow` for 50 and a half-width indicator for `value: 5, max: 10`.

### L5 — P2: Apply consecutive functional storage updates to the latest value

Source: `packages/utils/src/hooks/useLocalStorage.ts:24-25`.
Two functional setter calls before a rerender both read the same captured value.
Two increments from zero therefore store one instead of two.
Minimal fix: Keep the latest value in a ref and update it synchronously before each storage write.
Test: Call the setter twice inside one `act` block and assert two in state and storage.

### L6 — P2: Apply storage removal events from other tabs

Source: `packages/utils/src/hooks/useLocalStorage.ts:49-51`.
The storage listener ignores events whose new value is null.
A second tab therefore keeps an old preference after another tab removes that key.
Minimal fix: Reset to the initial value for matching removal events. Handle a storage-clear event consistently.
Test: Dispatch matching removal and clear events after loading a stored value.

## Package coverage and checks

I ran `pnpm exec vitest run --maxWorkers=1` inside each package, sequentially.
Logs use `/tmp/review-learning-<package>.log`.
Some release tests invoke child processes or package builds. Their failures limit the full verification result.
I did not regenerate receipts, modify hashes, or expand the review into release infrastructure changes.

| Package | Inspected source and test areas | Check result |
| --- | --- | --- |
| activity-react | `controllers.ts`, `interactive-activity-player.tsx`, `tutorial-activity-panel.tsx`, `testing.ts`; interactive-player tests | 20 pass; L3 |
| activity-runtime | `persistence.ts`, `server.ts`; persistence and assessment contracts, suite results | 66 pass; no additional finding |
| activity-tutorial | `checker.ts`, `offline.ts`, `credentials.ts`; protocol tests | 16 pass; no additional finding |
| advantage-play-kit | `runtime/runtime.ts`, `react/apk-game-host.tsx`, bounded-frame-loop, single-completion, result-accounting; runtime and integration results | 583 pass, 3 fail |
| architecture-enforcement | `architecture-check.ts`, `inventory.ts`; stable-order and analyzer counterexample tests | 209 pass, 41 fail |
| codecamp-knowledge | `adapter.ts`, `transition.ts`; curriculum inventory, source sync, and release tests | 80 pass, 4 fail, 5 skip; one suite fails setup |
| config | `eslint/index.js`, `tsconfig/base.json`, package exports; observability guard result | 9 pass, 1 fail |
| game-cartridges | `standard-experience.ts`, Rune Match grid validation, swaps, and group search; cartridge suite results | 621 pass; no additional finding |
| game-contracts | `educational-io.ts`, `host-proof-bindings.ts`; contract suite results | 61 pass; no additional finding |
| knowledge-space-core | outer-fringe, mastery-state, weighted-readiness, transfer-credit, knowledge-state-engine; weighted-readiness and boundary tests | 647 pass, 37 fail |
| knowledge-space-practice | recommended-next, review-load; v32-planner-integration tests | 421 pass; L2 |
| mastery-runtime-compat | `index.ts` compatibility validation; runtime-manifest and release results | 56 pass, 7 fail; one unhandled rejection |
| practice-core | srs-rating, timing, timing-baseline; timing and generator gate results | 198 pass, 3 fail; L1 |
| sales-knowledge | bindings and validation; release and curriculum test results | 19 pass; no additional finding |
| srs-engine | queue, review-processor, session-composition; scheduler and queue suite results | 303 pass; no additional finding |
| ui | Progress, Button, Dialog, Tabs; component test results | 10 pass; L4 |
| utils | storage and media hooks, ffmpeg-process; useLocalStorage tests | 22 pass; L5 and L6 |

## Verification limits

The Advantage Play Kit failures concern a source receipt digest, checker stdout, and generated scaffold compilation.
The architecture suite includes analyzer expectation differences and repository discovery failures.
The Codecamp suite includes protected source differences and a packed release setup failure.
The config guard reports 639 console errors against its baseline of 621.
The knowledge-space-core failures mainly concern missing specification files, documentation assertions, boundary scripts, and import spelling assertions.
The mastery compatibility failures concern package packing and child-process release checks.
The practice-core failures concern generator checks in the CI workflow.
These failures prevent a clean package-wide result. They do not establish additional runtime defects without further isolation.

The graph returned an ambiguous player symbol and no storage-hook callers.
I then inspected the player host references in Codecamp source.
The planner reproduction first hit a sandbox IPC restriction. The approved retry confirmed L2.
