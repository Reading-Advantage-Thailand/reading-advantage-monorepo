# Decisions: Phase 0 design

Status of every row: look check pending (owner, async). The owner decided on 2026-10-12 that the
set does not stop for owner input. Each row uses the default of the spec. The owner can change a
row later; a change comes back to this file, `spec.md`, and `plan.md`.

| ID | Topic | Default used | Where in the spec |
| --- | --- | --- | --- |
| P0-1 | SYSTEM school rule | A SYSTEM user with a `schoolId` sees that school. A SYSTEM user with no school sees the global catalogue and the empty preview state for the school panels (leaderboard, class books, Class Quest). The SYSTEM school selector of `primary_parity_admin_dashboard_20261011` is not used here. | D8 |
| P0-2 | Banner form | A blue hanging `Banner` with the words "Student preview", the line "You see what a student sees. Nothing here is saved.", and an iron "Exit preview" button. No leather bar. It differs from the brown uppercase "PREVIEW" plank of Reedy by colour, shape, size, and the full words. | D4 |
| P0-3 | Not-saved note | One small line "Preview: not saved" beside each switched-off write control (Save hero, Buy, quiz result, game end). | D3 |
| P0-4 | Preview states | Each page that needs a student record shows one parchment notice with a title and one line that starts "A student sees ..." or "Your ... show here". No sample student data. | D5 |
| P0-5 | Home | The guild hall with the no-hero portrait, zero streak and XP, level 1, the "Pick a hero" notice, four notices, and the school leaderboard (none for a SYSTEM user with no school). | D5, D8 |
| P0-6 | Avatar and shop | Heroes, pieces, and prices show. Try on works in the page. Save, Wear, and Buy are off (disabled) with the not-saved note. | S3 |
| P0-7 | AI feedback | SAQ and LAQ feedback stays allowed in preview (it writes nothing). Reedy stays student-only. | D9 |
| P0-8 | Games | The host runs in demo mode with a sample word set; the end screen shows the note. | D6 |

Copy keys (English; five locale files in Phase S1 and later). Namespace `StudentView`:
`bannerTitle` ("Student preview"), `bannerNote` ("You see what a student sees. Nothing here is saved."),
`exit` ("Exit preview"), `menuItem` ("Student view"), `notSaved` ("Preview: not saved"),
`homeHeroTitle`, `homeHeroLine`, `emptyLesson`, `emptyBooks`, `emptyReading`, `emptyQuest`,
`emptyHistory`, `emptyReports`, `emptySentences`, `emptyVocabulary`, `questNoClass`,
`reedyStudentsOnly`, `gameSampleWords`.
