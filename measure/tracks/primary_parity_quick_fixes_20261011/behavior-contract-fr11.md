# Behavior contract — primary_parity_quick_fixes_20261011 / FR-11 saved chip and save rule (STU-16)

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-16 | Saved chip shows own state; legacy save rule | port (owner choice "port", before the cutover) | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Article load | STUDENT | Opens the read page | Only the logs of the signed-in user load | legacy `server/models/articleModel.ts:387-388` |
| Chip | STUDENT | Reads the chip | "Saved" or "Not saved" from the student's own decks | legacy `components/articles/flashcard-saved-badge.tsx` |
| Auto save | STUDENT | Finishes MCQ, SAQ, and LAQ | Saves 3 to 5 random new words (case-insensitive, any article) and all sentences when the deck has none for the article; marks the log saved | legacy `hooks/use-auto-save-flashcard.ts`, `server/controllers/flashcardController.ts:237-339` |

## 3. Data read and written

| Item | Kind (table, route, side effect) | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Article log | table `article_activity_logs` | `is_sentence_and_words_saved` | read and write | user_id filter | `packages/domain/src/games/primary-article-cards.ts` |
| Decks and cards | tables `flashcard_decks`, `flashcard_cards` | vocabulary and sentence cards | read and write | user_id filter; STUDENT only | same file |

## 4. New target

- Drizzle tables: none changed.
- Domain functions: `saveArticleCardsAfterQuiz`, `getArticleCardState` with Zod input and output.
- Permission action: STUDENT role check inside the function.
- TenantDB class: `flashcard_decks`, `flashcard_cards`, `article_activity_logs` are REFERENTIAL; `tenantDb.unscoped` with a `user_id` filter on each query.
- AI adapter use: none.
- RPG skin components: `ArticleCard` chip (ink on parchment).
- Routes: `/en/student/read/<articleId>`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Other users' logs no longer reach the browser | Closes the leak part of E-8 | Spec, 2026-10-11 |
| The lesson task 7 keeps saving all words | Legacy does the same in the lesson | Spec, 2026-10-11 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-11 | `/en/student/read/<id>` | same | STUDENT | The chip shows the student's own state; after three quizzes new words and all sentences are in the decks | SQL FR-11 (126 saved logs, 401 not saved; 81 logs with three quizzes done and not saved) | |

## 7. ETL and runbook changes

none. The track reads the stored values as they are (rule R-1). `migrated-data-checks.sql` holds the data checks.

