# Plan review — primary_parity_cleanup_20261011

## Phase 2: Design

Phase diff: docs and one patch file. No code change. Plan compliance: done. Security, tests, logger, and locale keys: not affected.

Low findings:

- L-1. The student panel select (`Class`) has no style. It shows a white box on the parchment. Phase 6 can leave it; the box stays readable.
- L-2. The row divider of the student panel is `1px solid #475569` (`student-challenge-catalog-panel.tsx:195`). It is slate blue on parchment. Phase 6 may leave it, or may read a variable with `#475569` as the fallback.
- L-3. In night mode, the teacher fieldset edge is white. The plan of Phase 6 adds `[&_fieldset]:border-border` to `FIELD_FRAME`.

Shortcuts: the prototype used fixture data and a small bundle (esbuild) in place of a Next server. The captures show the real panels and the real `rpg.css`, but not the app shell. The teacher page tokens come from `globals.css`; the Tailwind classes of `FIELD_FRAME` were written as plain CSS.

Lessons: an esbuild bundle of one play-kit component, with a stubbed `fetch`, gives a design capture in seconds and needs no database or Next build.
