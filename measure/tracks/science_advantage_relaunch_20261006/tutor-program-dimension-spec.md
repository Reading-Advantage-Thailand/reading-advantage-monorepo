# Spec addendum: program dimension on Tutor Advantage series records

**From:** Science session (monorepo), track `science_advantage_relaunch_20261006`, Phase 0
**For:** Daniel's developer, through the PR session, as an addendum to `tutor-advantage/docs/specs/2026-10-tutor-catalogue-and-platform-spec.md`
**Date:** 2026-10-06. **Needed before:** a Science, Math, or Zhongwen book enters the Tutor Advantage catalogue (not before the May 2027 school launch). Target: 2026-11-27 for the spec; implementation when the first subject book is printed (Science, about 2027-04-23).
**Source decisions:** strategy v1.6 §3.3 and §5; Science D1 and D2 (programs inside the shared Primary Advantage app, one database, canonical content store with a `program` dimension), approved 2026-10-06.

## 1. What changes

Tutor Advantage reads every article from the Primary Advantage database. That database gains a `program` dimension. Tutor Advantage series records, class packages, and the reader must carry and filter by the same value so that a second-subject book sells as its own class package and reads its own lesson shape.

## 2. The contract

| Field | Type | Values | Rule |
|---|---|---|---|
| `program` | string enum | T6's `Program { PRIMARY READING SCIENCE MATH ZHONGWEN }` | Already added by T6 (2026-09-30); this addendum adds no second program field. The monorepo `programSchema` in `@reading-advantage/types` uses the same five values in lower case; Tutor folds T6's value to lower case for every content read. |
| `lesson_shape` | string enum | `english-13`, `science-12`, `math-12`, `zhongwen-13` | `english-13` for PRIMARY and READING (same steps, different level scale). Derived from `program` in version 1; stored so a later edition can change shape without a program change. |
| `graph_id` | string | `english`, `science`, `math`, `zhongwen` | `english` for PRIMARY and READING (one English graph, two level maps). One graph per subject in version 1. |
| `graph_version` | string | release tag | The pinned graph release the book was tagged against. |

Where the fields go in Tutor Advantage:

1. **Series record** (the catalogue entry for a book): T6's `program` plus `lesson_shape`, `graph_id`, `graph_version`. A series belongs to one program.
2. **Class package** (one package = one workbook): inherits `program` from the series; the package list, the checkout, and the tutor's class list show the program name and the program brand color (Science rose `#fb7185`, Math orange `#fb923c`, Zhongwen fuchsia `#e879f9`, from the Mastery Advantage brand table).
3. **Reader and lesson phases**: the 18 Tutor phases are the English 13 steps plus five digital phases. A non-English program loads its own step list (`science-12`, `math-12`, or `zhongwen-13` with the script layer) from the shared store; the five digital phases (Flashcards, Vocabulary Game, Sentence Game, Pair Conversation, Wrap-Up) stay where the shape allows them. Reedy (Pair Conversation) is English only.
4. **Content reads**: every query that reads articles, questions, vocabulary, or lessons from the Primary database filters by `program` (T6's value in lower case). PRIMARY and READING series keep reading their own rows (`primary`, `reading`), so nothing changes for the live catalogue until a subject series exists.
5. **Evidence**: Tutor emits shadow-mode evidence with the series' `graph_id` and `graph_version`. The subject evidence policies (`science-evidence.v1`, `math-evidence.v1`, `zhongwen-evidence.v1`) live in the monorepo; Tutor only passes the surface, the outcome, and the context as the Primary policy expects.

## 3. Migration rule

Additive only. T6 already adds `program`. Add `lesson_shape`, `graph_id`, and `graph_version` with defaults derived from `program`, then make them required. No existing series, package, or commission row changes meaning. Deploy the migration before the first non-English series is created.

## 4. Acceptance

1. An existing PRIMARY or READING series sells exactly as before, with `lesson_shape = english-13` and `graph_id = english`.
2. A Science series can be created with `program = science`, appears in the catalogue under the Science brand, and sells as one class package.
3. A student with a Science package opens a lesson and sees the 12 science steps in order, not the 13 English steps.
4. Content reads for a PRIMARY or READING package never return science rows and the reverse.
5. Evidence rows from a Science package carry `graph_id = science` and the pinned `graph_version`.

## 5. Out of scope

Pricing per program (Q-SV items), tutor commission rules per program, and the Tutor visual refresh. Those stay with the PR side and Daniel's developer.
