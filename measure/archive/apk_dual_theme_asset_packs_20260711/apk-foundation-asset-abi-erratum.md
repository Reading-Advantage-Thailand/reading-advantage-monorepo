# APK Foundation Asset-ABI Erratum — 2026-07-11

## Corrected conclusion

The archived `advantage_play_kit_20260710` track did not implement the production
asset contract claimed by Story S3 and its completed plan tasks. It implemented a
generic semantic loader dispatch seam and procedural placeholder records. That is
useful infrastructure, but it is not the sprite asset ABI required by the approved
dual-theme specification.

The foundation may remain archived for its educational I/O ABI, lifecycle,
package boundaries, and Phaser host work. Its asset-contract completion claim is
superseded by this erratum and is not evidence that APK presentation is complete.

## Claimed versus implemented

| Foundation claim | Implementation reality | Required remediation |
|---|---|---|
| Every edition provides required animation and presentation slots | Required-slot validation accepts `procedural` records and does not require production files or animation definitions | Separate placeholder eligibility from production asset validation |
| Atlas/animation metadata is defined | Metadata only permits an optional list of frame-name strings; it does not define animations, ranges, rates, directions, origins, collisions, or selected frames | Add typed physical sheet and semantic animation contracts |
| Artwork can swap without scene changes | One global `player.hero` role cannot select both top-down and side-scroll sheets, and scenes commonly call `add.image` | Add view-specific bindings and animation-aware scene helpers |
| Imported sprite assets are normalized and validated | No canonical physical pack manifest enforces the 4x8, 4x4, Wang, prop-strip, VFX, anchor, or collision contracts | Add deterministic validators and paired-theme parity checks |
| Edition asset tests prove completeness | Tests prove schema shape and loader dispatch, not playable sprite behavior | Add frame, playback, theme-swap, and real-browser acceptance tests |

## Program status impact

- W0-W4 mechanics and educational-result behavior remain implementation evidence.
- W0-W4 presentation remains placeholder evidence only.
- The APK program must not be described as production-complete until this track
  repairs the asset ABI, delivers both mirrored packs, integrates them, and passes
  animated Kimi WebBridge verification.

## Ownership

`apk_dual_theme_asset_packs_20260711` owns both the foundation remediation and the
subsequent Chibi Quest / Riven Lands production delivery. Treating it as a simple
asset-copy task would repeat the original contract failure.
