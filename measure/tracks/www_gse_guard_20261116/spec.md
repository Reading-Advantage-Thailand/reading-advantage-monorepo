# Spec — www: GSE out of customer copy

**Track ID:** `www_gse_guard_20261116`
**Type:** chore (copy guard and asset fix)
**Status:** new. Track files only. Opened 2026-11-16.
**Owner chain:** Daniel (owner; page-check; push gate) → Monorepo orchestrator (track owner: sweep, guard test, SVG fix, gates, live check) → PM orchestrator (final-check gate; decides each PENDING entry).
**Lane:** light lane (PM 2026-11-03, rule 3): one maker, one checker later, then Daniel's page-check.

## 1. Request

The PM final-check gate of 2026-11-16 decided, word for word: "GSE leaves all customer copy (CEFR only)".

`www_copy_truth_pass_20261002` already set this copy rule. Its spec says, word for word: "Public copy names CEFR only. No Cambridge, YLE, PET, GSE, or Pearson." A later edit put GSE text back into the Reading product mockups and into one blog post. This track removes the mockup labels and adds a guard that blocks any new GSE, Pearson, or YLE text in customer copy.

## 2. Scope

Customer copy means every string a visitor can read on www.reading-advantage.com:

| Path | Kind |
| --- | --- |
| `apps/www-reading-advantage/src/locales/**` | page strings for en, th, and zh |
| `apps/www-reading-advantage/src/app/**/blog/posts/**` | blog post bodies (`.md`) |
| `apps/www-reading-advantage/src/app/**` and `src/components/**` | TSX and TS string literals that render |
| `apps/www-reading-advantage/public/**/*.svg` | marketing mockups |

The sweep also reads every `.md` and `.mdx` file under `src`. The guard excludes test files, `node_modules`, and `.next`.

## 3. Terms

The guard blocks four terms in customer copy:

1. `GSE` (uppercase, as a word).
2. `Global Scale of English` (any letter case).
3. `Pearson` (any letter case).
4. `YLE` (uppercase, as a word).

## 4. Sweep result at origin/master `9a9ae9aea`

The sweep found four customer-copy hit groups:

| File | Lines | Text | Action |
| --- | --- | --- | --- |
| `public/marketing/ra-marketing-reading-advantage.svg` | 202, 205, 222, 225, 242, 245 | `GSE tag 1..3` comments and `GSE 52`, `GSE 61`, `GSE 72` labels | fixed in this track |
| `public/marketing/ra-marketing-reading-advantage-th.svg` | 202, 205, 222, 225, 242, 245 | the same six lines | fixed in this track |
| `src/app/[locale]/(marketing)/blog/posts/en/the-advantage-engine-kst-srs.md` | 24 | "aligned with the Global Scale of English (GSE) and international math standards" | PENDING (PM decides) |
| `src/app/[locale]/(marketing)/blog/posts/th/the-advantage-engine-kst-srs.md` | 24 | "ที่สอดคล้องกับมาตรฐาน Global Scale of English (GSE) และมาตรฐานคณิตศาสตร์สากล" | PENDING (PM decides) |

The sweep found no `Pearson` and no `YLE` in customer copy.

Hits outside customer copy stay unchanged: `docs/design-rules.md`, `measure/tracks/www_asset_pipeline_20261002/spec.md`, `measure/tracks/www_copy_truth_pass_20261002/spec.md`, `docs/pr/supporting-docs/aka-2019.txt`, and the term list inside `src/__tests__/www-batch-20261116.locale.test.ts`.

The Science mockups hold no GSE at origin/master `9a9ae9aea`. Commit `7843d864b` removed the labels before this track opened. Commit `ses_e1d72678affeXgysDJLBLwJSjb` owns the Science page copy check.

## 5. Mockup fix

In each Reading mockup, remove these six lines and nothing else:

1. The `<!-- GSE tag 1 -->`, `<!-- GSE tag 2 -->`, and `<!-- GSE tag 3 -->` comments.
2. The `<g class="tag1">`, `<g class="tag2">`, and `<g class="tag3">` groups. Each group holds one pill `rect` and one `text` element. The pill frames only the label. The group leaves an empty shape when the label goes, so the whole group goes.

The CSS animation rules for `.tag1`, `.tag2`, and `.tag3` stay. The `word1`, `word2`, and `word3` highlights stay. No new text enters either file. The layout keeps every other shape, line, and word.

## 6. Guard

`src/__tests__/no-gse-in-customer-copy.test.ts` (vitest) scans the paths of section 2. It fails on any term of section 3 and prints each hit as `file:line`.

The guard holds a PENDING list with one reason per entry. A PENDING hit does not fail the test. The test prints each PENDING hit. A PENDING entry that no longer matches a hit fails the test, so the list cannot go stale.

The guard holds no code-identifier allowlist today. Test files are out of the scan, and no identifier in a scanned file uses a blocked term.

## 7. Acceptance checks

- AC-1: The sweep table of section 4 lists every customer-copy hit with file, line, and text.
- AC-2: Both Reading mockups hold no `GSE` string.
- AC-3: Both Reading mockups keep every other line. They hold no empty tag shape.
- AC-4: The guard test fails on the Reading mockups before the fix and passes after the fix.
- AC-5: The guard test lists the en and th blog-post hits as PENDING, with a reason each.
- AC-6: The blog post and every other PENDING hit stay unchanged.
- AC-7: The www vitest suite, `tsc --noEmit`, ESLint on touched files, `next build`, and `scripts/ci/__tests__` pass.
- AC-8: The selector names only `www-reading-advantage`, or nothing.
- AC-9: The live page returns HTTP 200 at 1280 and 390 in en and th. The mockup holds no GSE label and no empty tag shape.
- AC-10: The CD run passes, including the photo e2e and the deploy.

## 8. Out of scope

- The blog-post copy. The PM decides it. This track edits no word of it.
- The Science mockups and the Science page copy. Another session owns them.
- The `CEFR` wording and any other copy claim.
- Any change to a route, a component, or a locale file.
- A merge commit on the main checkout. The main checkout stays untouched.
