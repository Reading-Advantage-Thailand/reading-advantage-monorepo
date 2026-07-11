# APK Arena & Target Action W4 Browser Verification

## Result

Accepted locally on 2026-07-11 against the current W4 source and package build.

## Kimi WebBridge manual pass

- Opened the QC lab through Kimi's real-browser bridge and selected all five W4 catalog cards.
- Confirmed each selection resolved the exact public ID, title, input mode, mechanic label, one Phaser canvas, `ARENA_SCENE_READY`, and zero document overflow.
- Switched Archer's Revenge from Primary Chibi to Secondary Epic and confirmed the runtime destroyed/recreated while retaining one canvas.
- Applied a real `390x844` device override through Kimi CDP; every cartridge retained one canvas, `touch-action: none`, readable targets/controls, and zero horizontal overflow.
- Visually inspected the final screenshots after the distinct-scene correction: Archer wall defense, Paladin twin heroes/wave status, Griffin aerial clouds/flap lane, Gryphon patrol bounds/minimap, and Realm territory grid.
- Re-ran the evidence after the mandatory-review correction that connected projectile shots, health/failure, wave progress, flap altitude, patrol camera state, territory capture, aimed keyboard selection, and normalized pointer release to the runtime state.
- Re-ran the evidence after queuing short keyboard press edges in the APK input adapter, so a press/release between Phaser frames is consumed exactly once instead of being lost.
- Canonical evidence is stored under `browser-evidence/kimi-<public-id>-{desktop,mobile}.png`.

Kimi's first command timed out while the extension was disconnected. After reconnection, the complete manual pass above succeeded. Transient screenshots captured before the replacement canvas appeared were discarded and are not evidence.

## Automated interaction pass

`PLAYWRIGHT_PORT=3300 pnpm exec playwright test tests/e2e/apk-w4.spec.ts --project=chromium`

- Five desktop keyboard scenarios completed under Secondary Epic with 100% results and lifecycle-safe edition switching. An adversarial Archer scenario aimed right for one wrong shot, then left for four correct shots, and verified the exact five result keys with 80% accuracy.
- One mobile touch scenario completed all five games at `390x844`, waiting for every `ARENA_TARGET_RESOLVED` event and asserting no horizontal overflow.
- Final result: 7 passed in 2.5 minutes.
- Ten final Playwright screenshots were produced in `apps/advantage-games/test-results/`; test outputs remain ignored runtime artifacts rather than committed evidence.

## Verification notes

- Kimi telemetry may show a throttled one-frame-per-second sample while its tab is backgrounded or screenshot capture is active. Playwright foreground interactions remained responsive and completed every loop; no performance claim is based on the throttled Kimi sample.
- Authenticated production persistence is inherited from accepted W2 and remains covered by the generic host/completion tests. W4 adds no per-game transport.
