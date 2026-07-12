# APK Scoped Teardown Manifest — 2026-07-11

## Authorization and boundary

The product owner directed that the invalid APK work be removed and rebuilt from
the canonical asset system. This teardown is intentionally destructive inside the
APK product boundary and intentionally conservative outside it.

Preserve:

- legacy game implementations as mechanic and content references;
- `@reading-advantage/game-contracts` educational input and result schemas;
- server-authoritative completion and idempotency behavior that is independent
  of the invalid asset ABI;
- unrelated application, curriculum, auth, database, and concurrent worktree changes.

Remove or withdraw from production:

- all 14 current `@reading-advantage/game-cartridges` catalog entries and loaders;
- all cartridge scenes and families built against procedural semantic slots;
- the `primary-chibi` and `secondary-epic` procedural edition manifests;
- production arcade and QC routes that present those cartridges as valid;
- Reading and Primary cross-host smoke files that claim the invalid cartridges
  prove package consumption;
- tests whose acceptance premise is procedural-slot presence rather than the
  canonical physical sprite-sheet and animation contract.

Rebuild from:

- the canonical dual-theme file tree and fixed sheet layouts;
- a typed physical source manifest;
- view-specific semantic frame and animation bindings;
- executable anchor, collision, Wang-mask, alpha/chroma, paired-theme, and
  browser-animation acceptance gates.

## Live blast-radius evidence

- The public cartridge catalog currently contains 14 entries.
- The graph contains 519 nodes across the cartridge package source.
- Direct consumers include Advantage Games production/QC hosts and Reading and
  Primary host-smoke modules.
- Codecamp consumes APK runtime concepts but does not require preservation of the
  invalid 14-cartridge catalog; its unrelated dirty files are outside teardown scope.

## Re-entry rule

A cartridge may return to the public catalog only after:

1. its required physical assets exist in both mirrored theme packs;
2. its semantic bindings name the correct view, sheet, frames, and animations;
3. its actors use those animations at runtime;
4. structural, unit, animation-inspection, mobile, and Kimi WebBridge checks pass;
5. the product owner accepts the visible result.
