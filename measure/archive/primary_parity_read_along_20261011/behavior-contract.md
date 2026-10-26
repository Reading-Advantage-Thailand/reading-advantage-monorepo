# Behavior contract — primary_parity_read_along_20261011

Legacy facts: revision `bfea121`. Paths are in the legacy repository.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-10 | Read-along follows the voice | "Improve the UX here. The legacy app was not very good at this." | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Word maps | STUDENT | Plays the article audio | The display words map to the audio words with one forward cursor: exact, up to 3 joined tokens, prefix, suffix, Levenshtein 1, then position. There is no resync after a dropped word. | `components/articles/article-content.tsx:115-207` |
| Display split | STUDENT | Reads the text | The split pattern knows straight quotes only. A curly quote joins a word and moves the index. | `components/articles/article-content.tsx:47-77` |
| Highlight | STUDENT | Plays the audio | A frame loop finds the sentence and the word. It keeps the last sentence and word in a gap. It takes the closest word within 0.3 s. | `hooks/use-audio-player.ts:60-197` |
| Tap a word | STUDENT | Taps a word | The audio seeks to `word.start - 0.05` and plays. | `hooks/use-audio-player.ts:320-342`, `components/articles/article-content.tsx:428-442` |
| Player | STUDENT | Opens the audio | Two copies of the player (a fixed bar and an inline block). Play and pause work. Previous and next have no `onClick` (they do nothing). Speed is a select with 0.5, 0.75, 1, 1.25, 1.5. | `components/articles/article-content.tsx:584,597,605-609,644,655,663-667` |
| Follow scroll | STUDENT | Plays the audio | The current sentence scrolls to the centre. | `components/articles/article-content.tsx:292` |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Sentence and word timings | table | `articles.sentences` (jsonb, `SentenceTimepoint[]`) | read | the existing page check of the read page | `components/articles/article-content.tsx` |
| Audio file | storage URL | `articles.audio_url` | read | same | same |
| Translations | table | `articles.translated_passage` | read | same | same |

No write. No XP, no log, no email, no file, no AI call.

## 4. New target

- Drizzle tables (and the migration, when the schema changes): none. No migration.
- Domain functions (Zod input and output): none. The alignment and the position are pure client modules (`lib/read-along/align.ts`, `position.ts`) with a Zod schema for `SentenceTimepoint`.
- Permission action for `assertCan`: none new. The read page keeps its check.
- TenantDB class for each table: none new (`articles` is unchanged).
- AI adapter use: none.
- RPG skin components: `Panel` (dark), `Sign`, `rpgButton`; `HIGHLIGHT_CLASSES` of `lib/audio-highlight.ts`.
- Routes (with the locale): `/[locale]/student/read/[articleId]` and the lesson reading step `/[locale]/student/lesson/[id]`. The stories chapter page reuses the component (stories track S4).

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| The alignment resyncs after a dropped or an extra audio word, and handles curly quotes | Legacy moves every later word (58 entries in production lose words) | STU-10, 2026-10-11 |
| One player (a bottom bar on a phone, in the reading frame on a desktop) | Legacy has two copies | STU-10, 2026-10-11 |
| Previous, replay, and next sentence work | In legacy the previous and next buttons do nothing | STU-10, 2026-10-11 |
| Speeds 0.75×, 1×, 1.25× (legacy: 0.5× to 1.5×) | Spec default (member question) | look check pending (owner, async) |
| Each sentence is one tab stop; words are not | Legacy and the monorepo tab through every word | STU-10, 2026-10-11 |
| A hint line explains the tap | New | look check pending (owner, async) |
| The follow scroll keeps the sentence in the upper third | Legacy centres it | look check pending (owner, async) |
| The September timer fixes stay (ref timer, controlled speed, three colours, cancel on close) | Track `primary_audio_highlight_correctness_20260912` | 2026-09-12 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| RA-A1 | `/en/student/read/<clean article>` | same, new id | STUDENT | The lit word is the spoken word; tap plays from the word; player buttons work | none | |
| RA-A2 | `/en/student/read/<curly-quote article>` | same, new id | STUDENT | The mark stays right after each quote | none | |
| RA-A3 | `/en/student/read/<dropped-word article>` | same, new id | STUDENT | The mark recovers within one word after a gap | none | |
| RA-A4 | `/en/student/lesson/<clean article id>?type=article` | same, new id | STUDENT | The reading step has the same highlight and tap, and one player | none | |
| RA-A5 | same as RA-A4, 375 px only | same, new id | STUDENT | The player bar does not cover the lesson footer (M-11) | none | |

The article ids are in `data-profile.md`.

## 7. ETL and runbook changes

None.
