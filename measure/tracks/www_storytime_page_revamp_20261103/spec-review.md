# In-session self-review: www_storytime_page_revamp_20261103

PM 2026-11-03: light lane. No independent spec review applies. The rounds below are retained as in-session self-review notes only.

Author model: opencode-go/deepseek-v4.1-flash

## Round 1

Date: 2026-11-03
Reviewer: in-session self-review; not independent

### What this track proposes

The track revamps the www Storytime Advantage marketing page at `/products/storytime-advantage` in `en` and `th`, and shows the English copy in `zh`. It follows the Primary page pipeline: Red content and image tests, Green crops and page, then lint, typecheck, build, and captures. Every string moves into the locale files, and all five live stock images leave the page. Seven fixed containers hold the seven section purposes, and Daniel gates the look, the Thai text, and the deploy.

### How the current system works, per this spec

The live page renders seven sections from `getScopedI18n("pages.products.storytimeAdvantage")`. The copy sits in `src/locales/pages/products/storytime-advantage.ts`, with separate `en`, `th`, and `zh` exports; the `zh` export holds Chinese text today. The hero and curriculum sections use five hard-coded stock images, including `/images/hero-storytime-advantage.jpg` and `/storytime-advantage.png`. Existing tests cover four decoration test ids, one static SEO row, and the `NONEXISTENT_APPS` claims check. The brief, the image list, and the Thai file are absent, so task 1.0 holds the build.

### Findings

- F1 [Major] `spec.md` §7 and §5 FAQ A2: The rule "The page names no app for release 1" contradicts the quoted A2 copy "with no app and no login", and AC-6 does not test the rule. Rationale: The implementer cannot tell whether to keep or rewrite A2, and no test holds the rule.
- F2 [Major] `spec.md` §7 copy rules: Comprehension gap: "reference program" and "in production" are not defined, and no acceptance criterion checks them. Rationale: A test writer cannot choose the banned strings, so the rule cannot be verified.
- F3 [Blocker] `plan.md` task 1.3: The task names no crop script, no command, and no file location for the crop tool. Rationale: The plan neither names a new script nor says to generalise `apps/www-reading-advantage/scripts/crop-primary-page-images.ts`, which already checks SHA-256 and writes lossless WebP.
- F4 [Blocker] `plan.md` task 1.1: The image test names only `A45_IMAGE_LIST`, with no brief path, no missing-source behaviour, and no named assertions. Rationale: `primary-page-images.test.ts` gates on `A34_SOURCE_ROOT`, `BRIEF_PATH`, and `A34_REQUIRE_SOURCES`; an absent list would fail with a filesystem error, which AC-2 excludes.
- F5 [Blocker] `spec.md` §4 and AC-13: §4 says a brief that drops or merges a section overrides the order, but AC-13 fixes seven containers by id. Rationale: The implementer must choose between the pending brief and the acceptance test when the brief changes a section.
- F6 [Blocker] `plan.md` tasks 1.1 and 1.4: The locale key schema is left open, and the plan names no change to `apps/www-reading-advantage/src/__tests__/phase-4-browser-regressions.red.test.tsx`, which reads `storytimeAdvantage.faq.questions` in all three locales. Rationale: A new key path breaks that gate, and the plan lists neither the file nor the key rule.
- F7 [Nit] `spec.md` §7 and `plan.md` rules: The `graph.db` gate cannot fail. Rationale: `.gitignore` line 48 ignores `graph.db`, and git does not track the file, so the diff is always empty.

### Author Response

- F1: FIX
- F2: FIX
- F3: FIX
- F4: FIX
- F5: FIX
- F6: FIX
- F7: FIX

## Round 2

Date: 2026-11-03
Reviewer: in-session self-review; not independent

### What this track proposes

The track rebuilds the www Storytime Advantage marketing page from a refreshed PR brief, in English and Thai, with the English copy in `zh`. It replaces the stock images with crops of real product files, each checked against a SHA-256 list and written as lossless WebP. The page keeps seven section purposes and seven `st-*` containers. Content and image tests check the copy word for word, the crop pixels, and the banned claims. Daniel checks the look and the Thai before the merge, and he keeps the push and the deploy.

### How the current system works, per this spec

The live page renders seven sections from `page.tsx` and the `en`, `th`, and `zh` exports of `locales/pages/products/storytime-advantage.ts`. It shows a roadmap badge and five stock or SVG images, and its metadata comes from `hero.title` and `hero.description`. Existing tests read `faq.questions`, the Storytime row of the static SEO test, and treat the app as nonexistent in `phase-w3-claims`. A crop script for the Primary page already checks source hashes and writes lossless WebP.

### Findings

- F4 [Blocker] plan.md task 1.1: The image test reads `A45_IMAGE_LIST`, `A45_SOURCE_ROOT`, and `A45_REQUIRE_SOURCES`, but the plan gives no default path for the list, no brief path or variable for the drift guard, and no skip rule for an unset list. Rationale: `primary-page-images.test.ts` derives `LIST_PATH` and `BRIEF_PATH` from `SOURCE_ROOT` and skips on `existsSync` of both; without both paths and that rule, the drift guard has no input file, and a gate run with `A45_REQUIRE_SOURCES=1` fails on a path error instead of a named assertion.
- F6 [Blocker] plan.md task 1.1: The key list keeps `heroAlt` but names no locale key for the alt text of the section images, although AC-1 checks each image alt in both languages and AC-6 puts every string in the locale files. Rationale: the merged Primary page renders `alt={t(\`images.${image.alt}\`)}` from locale keys, so the storytime implementer must invent key names; the schema choice is still open.
- F8 [Major] spec.md §8 AC-6 and plan.md task 1.1: The plan says to check that "no date, price, outcome claim, free trial, free term, or discount appears", but names no string or pattern for any of the six, and the required copy says "there is no public date" in the hero, A1, the CTA, and the meta description. Rationale: a literal check of the word "date" fails AC-1 and AC-5, and no test writer can choose the outcome-claim strings; name the patterns or the banned strings, as AC-15 does for its five strings.
- F9 [Major] spec.md §7 and §8 AC-12, and plan.md tasks 1.1 and 1.4: "No old string" and "every old string" are not defined, and the new copy keeps the live strings "Frequently Asked Questions" (`faq.heading`), "Interested in Storytime Advantage?" (`cta.heading`), "Learn More" (`cta.buttons.learnMore`), and "FOR THE TEACHER" (`eyebrows.teacherResources`). Rationale: a check of every string in the live locale file fails on the required copy; name the old roadmap strings to remove, and state whether keys such as `classroomAlt` and `adaptiveEngine.alt` are removed.

### Author Response

- F4: FIX
- F6: FIX
- F8: FIX
- F9: FIX

The author applied the Round 2 fixes after the re-review. The session has no question tool, so the author used the default of fixing every Blocker and Major. No finding is accepted as a risk.

After Round 2, the PM hand-off supplied the copy v0.4, the Thai file v0.1, and image list v0.2. The spec now records these sources and the light-lane decisions.

## Accepted Risks

- None.
