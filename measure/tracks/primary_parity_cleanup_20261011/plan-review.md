# Plan review — primary_parity_cleanup_20261011

## Phase 2: Design

Phase diff: docs and one patch file. No code change. Plan compliance: done. Security, tests, logger, and locale keys: not affected.

Low findings:

- L-1. The student panel select (`Class`) has no style. It shows a white box on the parchment. Phase 6 can leave it; the box stays readable.
- L-2. The row divider of the student panel is `1px solid #475569` (`student-challenge-catalog-panel.tsx:195`). It is slate blue on parchment. Phase 6 may leave it, or may read a variable with `#475569` as the fallback.
- L-3. In night mode, the teacher fieldset edge is white. The plan of Phase 6 adds `[&_fieldset]:border-border` to `FIELD_FRAME`.

Shortcuts: the prototype used fixture data and a small bundle (esbuild) in place of a Next server. The captures show the real panels and the real `rpg.css`, but not the app shell. The teacher page tokens come from `globals.css`; the Tailwind classes of `FIELD_FRAME` were written as plain CSS.

Lessons: an esbuild bundle of one play-kit component, with a stubbed `fetch`, gives a design capture in seconds and needs no database or Next build.

## Phase 4: Remove Admin Article Creation (ADM-11)

Phase diff: page, component, and three routes deleted; FR-3 exports removed; nav, quick action, and locale keys removed in five locales. No new route, query, or table access. Security: the change removes code only. Logger and JSDoc: not affected. Locale keys: the same five keys left in `en`, `th`, `cn`, `tw`, `vi`.

Low findings:

- L-4. `articleController.ts` and `articleModel.ts` keep `console.error` in old code. Phase 5 removes much of it.
- L-5. The five locale files were rewritten with `JSON.stringify` (2-space indent). Only the removed keys and one trailing comma changed in the diff.

Deviation: the plan asked for `/admin/article-creation` in the dead-link list of `broken-ux-behavior.test.tsx`. The grep check forbids the string, so the entry was not added. The ADM-11 guard covers the path.

Shortcuts: none. Lessons: none. Data check: 0 custom drafts on the rehearsal 2 copy, so Q2 stays unasked. After this phase, Primary has no delete from `articles`.
