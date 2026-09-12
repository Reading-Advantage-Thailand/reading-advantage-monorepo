# Dragon Flight Current-Source Host-Proof Verification — 2026-08-02

## Status and scope

This is a bounded technical verification receipt for the Dragon Flight-only
Existing Core corrective phase. It supersedes the older browser receipt only
as current-source browser evidence: the selected-union getter, app selection
boundaries, isolated artifacts, and port-scoped Primary Next output were added
after that receipt.

It does **not** mark Existing Core Task 5, the track, production, cutover,
retirement, a cohort, or product-owner acceptance complete. The verified
protocol claim remains limited to server-observed request ordering and timing;
it is not evidence of physical-human play, anti-bot resistance, answer
comprehension, mastery, anti-cheat efficacy, or broader XP integrity.

## Recovery note

The first refreshed Reading-positive attempt exposed a browser-test-only
access error: waitForRequest() returns a Request, but the test tried to read a
nonexistent nested .request. The run was stopped and retained only as
diagnostic output. Both app specs now read launchRequestInfo.postData(). That
correction changes neither runtime behavior nor the server policy. The four
reports below were then produced from fresh databases with the corrected test
source; only those reports are evidence in this receipt.

## Source binding

The shared worktree contains independent parallel application work. An
isolated-index technical checkpoint was therefore created at
`bdbedbb7ded94ce69f9149d1a69cb8a704838ee2` on
`codex/apk-dragon-flight-tech-checkpoint-20260802`, with base commit
`1d16956bbeb03f20b0117d7b0d8dadd6e64d3a17`. Its diff contains only the
Dragon Flight protocol, selected edition, host surfaces, selected assets,
focused guards, and listed receipts; it excludes the mixed `pnpm-lock.yaml`
importer drift and all unrelated parallel work. `git diff --check` against
the base passed.

The required full-checkout rerun against that commit remains open: Git could
not materialize the temporary worktree because the filesystem was full (only
1.4 GB available; `No space left on device`). The SHA-256 fingerprints below
continue to bind the shared-worktree source used by the completed local
browser evidence; they do not substitute for the checkpoint rerun.

### Shared protocol, selected edition, and guards

| File | SHA-256 |
| --- | --- |
| packages/domain/src/games/dragon-flight-host-proof-attempt.ts | de112d71b36e855345d0a9bc6a191d373368f6b7d41d476d1d3498b3f7030c9b |
| packages/domain/src/games/dragon-flight-host-proof-attempt-adapter.ts | 2538d285b89129aee97d884681b437950452bc4c8f0defd619859d74d46386b5 |
| packages/domain/src/__tests__/dragon-flight-host-proof-attempt.test.ts | cad45b365c0b6fca5884a71d8f10b70782f6ae93b91625b23ca35abf5fb75ed3 |
| packages/domain/src/__tests__/dragon-flight-host-proof-dwell-policy.test.ts | 9fc38ffe88a759dc71ecab04e6df9532ab5fe9da627c4e788b3b5683f9cdd905 |
| packages/advantage-play-kit/src/editions/host-proof-edition.ts | 171160492d1094dec62af2edfb4980cb02ede1b1b7800f1c233e8dabda194fd2 |
| packages/advantage-play-kit/src/editions/host-proof-edition.test.ts | 242fff905c5f430e2c13ccff989af27bb1fbd51be95e24608b9fa0e57d9ffbe9 |
| packages/advantage-play-kit/src/editions/index.ts | 02dc980caccd4c0249750354e14c97655309a0a8af0d5000579381a12eca5d35 |
| packages/game-cartridges/src/host-proof.ts | 08f6a8b97bc03cc4c5d35d4dba40c3bccb4e56690862a5e29e41d0316891476e |
| packages/game-contracts/src/host-proof-bindings.ts | 087f91cbdc108697f5d896de2ea47a807474eb9adac33f3784e176972ce2798d |
| packages/game-contracts/src/index.ts | 88fcfc186d926649222c987e8e20284e4d51b4bfa37c02420de81feffb64a396 |
| packages/advantage-play-kit/assets/standard/standard-pack-release.json | ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932 |
| packages/advantage-play-kit/scripts/materialize-standard-pack.mjs | 98c199ffd6ad18228c08c6753d7ce7713498d3159a44b2a3fd3bbc023ede8ae9 |
| measure/tests/test_apk_existing_core_cutover_task5_host_proof_remediation.py | ed8de76df7f2ae5fc8162b90273e68d2d798edaac220591e0a74079ec475df64 |
| measure/tests/test_apk_existing_core_dragon_flight_scope_quarantine.py | fc6ae121874918336a4e1e71d1fe73379dd975dc7fad152ffd2551243d0a05b0 |

### Host surfaces

| Surface | Reading SHA-256 | Primary SHA-256 |
| --- | --- | --- |
| host-proof-test-config.ts | eef497cc4437e612fa13f36571686f5f7c620e72b66c4dd59de26b24b134cd02 | 3fbf03deb0a32f18c7f26916b4e988449273e4e5e873c7e5f5cd6ae8c92b5ee9 |
| playwright.config.ts | 71f4d6947755031fcc6366f57b562623a6259db0f13e475db26f9dcf9207941b | 8d5b8bfb7908d11f1c351f823c8b82a721d1a7580e5cd820217e14e2a43a5249 |
| next.config.ts | 07637e3b4c7dff391c602558c585ff63960344b9d43d30ac7beb86b1149d4da6 | ad328238a98a2966d3813d14062550c758431131f632d7f05df69caa8ebc316a |
| scripts/seed-host-proof-session.ts | 2215944f552737bd7ea9f5ecda6bc1c790cb9e95ef83b705fccff78499c21adf | 7d9fcd005db35b1dce4fd5e2796903b85a477fd2d9e024f48746f9b6d7326b41 |
| tests/e2e/host-proof-auth.setup.ts | be8fd2a728caed4deddab6c993e7c5b05c2f811ce7e4d0075a761330c6166f2c | 722ac0c3694d52e082bde18da62158559fbce2e8930cf848e530b2121e673bc5 |
| tests/e2e/host-proof-games.spec.ts | 1acd46f695032c18c8efe4b3801389f911c137ab32fa6cc41bcd72a9555dc902 | 1acd46f695032c18c8efe4b3801389f911c137ab32fa6cc41bcd72a9555dc902 |
| tests/e2e/dragon-flight-host-proof-hostile.spec.ts | f44caee76d546622e9326c66b8ee8bf9795feeaa605a5def1819ee23b0b3e7e2 | f44caee76d546622e9326c66b8ee8bf9795feeaa605a5def1819ee23b0b3e7e2 |
| (host-proof)/layout.tsx | f6ccc7d202f2bf1552b65ec1b304a98878b29393403e1de80d077797769b389e | 241727a3a7c33b136730eeb935284f7e220e1d41fd7fddae26d75a88451383a1 |
| (host-proof)/student/host-proof/games/page.tsx | aaf31b011088c30d162f8b8f04143469c5be16b57116265c80053326a9ad9d34 | befd059b497005f7a003a1acebd2703f0456b5d0ff5edbf787114af9d2cf6d6f |
| components/host-proof/HostProofGameClient.tsx | 0d619c48cef50ef3eb7752c567ca8f282a2c6c78cf22861939af7f8fbb0dc53e | 922e344db018b84adf23bdb9bd296716aa92190b698151ce56a19e7d753f8d71 |
| server selection module | lib/host-proof-selections.ts 207d81c0a9b9e427b1c43f546780a3b94a0bc0b9ab10bb8de0b86f52eba9c80a | lib/host-proof-selections.ts 207d81c0a9b9e427b1c43f546780a3b94a0bc0b9ab10bb8de0b86f52eba9c80a |
| client loader | lib/host-proof-qc-loader.ts 8a8e7dc3c759db36b623955993e02a4c0c0eeb698dd391297d49a7c89c698c70 | lib/host-proof-cartridge-loader.ts 8a8e7dc3c759db36b623955993e02a4c0c0eeb698dd391297d49a7c89c698c70 |
| lib/host-proof-config.ts | b99c2384bd7cb279e2c89729f0804e40fdeb4c9e511786ad0bb4cfd221c93c32 | b99c2384bd7cb279e2c89729f0804e40fdeb4c9e511786ad0bb4cfd221c93c32 |
| attempts route | 62b8ca1c6bed3ab77bb665d0c011e358deb59613cdcb5d80f1e3e2f4a18b6892 | edf4333a2cfffdfa5d1240a90663cf5df33cf73842ecfd4f407c906e97d71506 |
| action-attestation route | 7bccdbfc05d3ad329157dab6f3fe045d5e52259967c0057e0002d43c79396d4c | 95510f51aa1e6e04e1802a930ff805e16a5b13bde6f0a983920435ce999eff32 |
| completion route | 7791e93ceb2494ddcb11cc6abe5ce1ff20e80c2e28579adf0a22455b3d08550e | 1737384c9ee8d32de5c8d3e2e0ecf38863d400975f0589a8391610952fdc7333 |
| package.json | d9295591d7f7ed805b3bec03a62920d576fcb1e3853ccc768ef7924775a64018 | e5451b1c68ddf9b07c6dff627412c77ba73c65dd36d2407937f45ce2bb75b713 |
| materialization manifest | ea4c4401e5712e7e3113e5dbe126cd97e93493d160f5b39e738be24d77fe02c7 | ea4c4401e5712e7e3113e5dbe126cd97e93493d160f5b39e738be24d77fe02c7 |

Both manifests list exactly the selected three assets with matching deployed
bytes in each host: hit-01.ogg
25c239ed9b6c9cd898a2ffb2c2760e87499ee5f6330060aa51be87f548bd5f23,
hit-01.png
5062b915d194a51d1df910f2b00a8dd33f654e8e5f7b8f38baa0626d1f7528f1,
and hero-01.png
6aeab3f50c0f6be436eeb5594e7d9c1ae31f8f19ac3bdfa04d7fbcbf856ba5e4.

## Fresh isolated Chromium evidence

Every run used CI=true, a fresh local-only scratch PostgreSQL database, and
explicit DATABASE_URL and DIRECT_DATABASE_URL values pointing to that same
scratch database. Each used a unique port, /tmp report/auth/output paths, and
the checked-in self-starting Playwright command. The command rebuilt its
dependencies, migrated and seeded only the scratch database, and set
HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS=3000. The Primary command also set
NEXT_DIST_DIR=.next/host-proof-<port>. No remote database, production host, or
normal app build/output directory was used.

| Host and proof | Scratch DB / port | Result | Local JSON report SHA-256 |
| --- | --- | --- | --- |
| Reading positive real-cartridge proof | apk_host_proof_reading_positive_20260802_1040 / 3134 | 5 expected, 0 skipped, 0 unexpected, 0 flaky | 1da9bc0abab0b07050d9aea0c9a5df8b64c429a14c9eb4a87910f70ecdb89980 |
| Reading hostile direct-JSON/same-frame bypass | apk_host_proof_reading_hostile_20260802_1040 / 3135 | 2 expected, 0 skipped, 0 unexpected, 0 flaky | 7c377c6a28e7dcc421358ca97e40a7458d0ca068a0814621a0ea3b0c9b18a35a |
| Primary positive real-cartridge proof | apk_host_proof_primary_positive_20260802_1040 / 3136 | 5 expected, 0 skipped, 0 unexpected, 0 flaky | 754224c957106c639bbe6296c5dd1dd9296d3df33929630d3464c1b2cbf18122 |
| Primary hostile direct-JSON/same-frame bypass | apk_host_proof_primary_hostile_20260802_1040 / 3137 | 2 expected, 0 skipped, 0 unexpected, 0 flaky | 23ee364c9b1bf38a0e659698f5c9f6c17b3efd73372667c3b8db9e2b942fa78a |

The positive suites cover setup plus compact/wide keyboard, pointer, and
touch input. They prove the real cartridge uses ordered opaque receipts and
the returned server dwell before a verified result. The hostile suites prove
an immediate direct choose-gate-to-launch sequence is rejected with safe 4xx
behavior, cannot complete, and does not change history.

Transient report locations were:

- /tmp/apk-reading-positive-20260802-1040-results.json
- /tmp/apk-reading-hostile-20260802-1040-results.json
- /tmp/apk-primary-positive-20260802-1040-results.json
- /tmp/apk-primary-hostile-20260802-1040-results.json

## Current focused regression checks

| Check | Result |
| --- | --- |
| selected-edition Vitest (host-proof-edition.test.ts) | 1 file, 2 tests passed |
| bounded Dragon Flight Measure group (Task 5/evidence/scope guards plus the Task 6 artifact-isolation subguard) | 17 tests passed |
| Reading host-proof page/client/boundary/config suites | 5 suites, 24 tests passed |
| Primary host-proof page/client/boundary/config suites | 5 files, 25 tests passed |
| pnpm --filter @reading-advantage/advantage-play-kit build | passed |

The remediation guard now asserts the configurable report, auth, and output
paths used by this receipt rather than a superseded in-worktree literal report
path. It also continues to require the Primary port-scoped NEXT_DIST_DIR.

## Independent review disposition

Terra passed the bounded Dragon Flight technical corrective phase after
recomputing the source and report hashes, confirming all four reports have no
skipped, unexpected, or flaky tests, and finding no Critical or High source or
browser-proof issue. Sol independently accepted this receipt as current-source
browser evidence only, also with no Critical or High concern in the bounded
selected-union and host-proof slice. Neither disposition accepts Task 5,
lifecycle work, retirement, cutover, production, cohort use, or owner gates.

## Deferred Task 6 boundary

The full deferred Task 6 retirement module is **not** green or consumable:
`measure.tests.test_apk_existing_core_task6_legacy_retirement` ran 9 tests and
failed one. Its graph guard still requires `APK_HOST_PROOF_BINDINGS` and
`loadCartridge` in the quarantined root cartridge catalog. The active Dragon
Flight scope guard correctly prohibits that cohort binding. This is a
downstream test-governance contradiction to repair in a dedicated Task 6
planning change; it does not justify reintroducing the 24-title binding and
does not invalidate the bounded Dragon Flight technical evidence above.

## Remaining formal gates

- Task 5 remains [~]; no Task 5, track, or lifecycle status changes here.
- The full Reading TypeScript baseline remains ungreen and is not replaced by
  these focused checks.
- A clean bounded checkpoint, Measure manual verification, confirmation on
  both hosts, and explicit product-owner authorization remain required.
- No later title, cohort, production exposure, deployment, cutover, or Task 6
  legacy retirement may consume this evidence.
