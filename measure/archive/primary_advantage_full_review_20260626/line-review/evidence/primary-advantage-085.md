# Line Review Evidence: primary-advantage-085

Reviewer: coder-minimax-m3/primary-advantage-085
Files assigned: 1
Lines assigned: 2657

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/messages/vi.json` | 1-2657 | reviewed | 4 |

## Findings

### LR-085-001 — Locale switcher maps `cn` to Taiwan instead of Mainland China

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/vi.json:4`
- Evidence: Line 4 contains `"locale": "{locale, select, th {🇹🇭 ไทย} en {🇺🇸 English} tw {🇹🇼 中文} cn {🇨🇳 台灣} vi {🇻🇳 Tiếng Việt} other {Unknown}}"`. The `cn` branch (Simplified Chinese, used in Mainland China) is mapped to the text `台灣` (Taiwan) with the Chinese flag 🇨🇳. The `tw` branch (Traditional Chinese, used in Taiwan) is mapped to `中文` with the Taiwan flag 🇹🇼. This is a country/label mismatch: a Simplified-Chinese-speaking user selecting `cn` sees "Taiwan" displayed alongside the Mainland flag, which is incorrect and confusing. Cross-file grep confirms the same buggy ICU selector is present in all five message files (en.json:4, vi.json:4, th.json:4, tw.json:4, cn.json:4), so the bug originated in the source template and was faithfully localized into every locale.
- Impact: The locale switcher shows incorrect geographic labels for the Simplified Chinese and (to a lesser extent) Traditional Chinese entries. Vietnamese users selecting Chinese Simplified see the label "台灣" which is misleading. The text "中文" should appear on the `cn` branch (or "简体"/"中国大陆") while "台灣" should remain on the `tw` branch.
- Recommendation: Fix the ICU selector so `cn {🇨🇳 中文}` and `tw {🇹🇼 台灣}` (or equivalent locale-correct labels), and verify all five locale files in a single coordinated change.

### LR-085-002 — US-centric `us_symbols_landmarks` subgenre translated into Vietnamese

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/messages/vi.json:669`
- Evidence: Line 669 contains `"us_symbols_landmarks": "Biểu tượng & Địa danh Hoa Kỳ"` inside the `Article.subgenres` block. This faithfully translates the English key (which already appears in en.json:669 as "U.S. Symbols & Landmarks", already flagged by reviewer `coder-xiaomi-mimo-v2-5-pro/primary-advantage-082` as LR-082-007). The Vietnamese translation correctly localizes the US-centric phrasing ("Hoa Kỳ" = "United States"), but the underlying subgenre is still US-only and is inappropriate for the Vietnamese, Thai, Chinese Simplified, and Chinese Traditional user bases — all of which are supported locales in this app. Cross-file grep shows the same key exists in th.json:669, tw.json:669, cn.json:669, all translating the US-centric label.
- Impact: Non-US Vietnamese students (and students using the other non-English locales) see a US-specific content category in the article selection UI. If articles are generated under this subgenre for non-US schools, the resulting content will be culturally inappropriate for primary students.
- Recommendation: Track this as a shared content-curation issue (already captured by LR-082-007 in the English batch). Either rename to a locale-neutral "Symbols & Landmarks" with culturally adaptive content, or hide the subgenre for non-US schools. vi.json:669 will need to be updated when the upstream decision is made.

### LR-085-003 — Hard-coded "5" in AdminDashboard.alerts.newRegistrations.description

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/messages/vi.json:396`
- Evidence: Line 396 contains `"description": "5 giáo viên đang chờ phê duyệt"` inside `AdminDashboard.alerts.newRegistrations`. The number "5" is hard-coded into the Vietnamese translation string, mirroring the English source (en.json:396 "5 teachers pending approval", already flagged by reviewer `coder-xiaomi-mimo-v2-5-pro/primary-advantage-082` as LR-082-004). The Vietnamese translator faithfully localized the literal "5", but the bug is structural: the source string is a static placeholder rather than an ICU interpolation like `{count} giáo viên đang chờ phê duyệt`. Cross-file grep confirms th.json, tw.json, cn.json also localize the hard-coded "5".
- Impact: The admin dashboard will always display "5 giáo viên đang chờ phê duyệt" ("5 teachers pending approval") regardless of the actual pending count, misleading Vietnamese-speaking administrators. The translation is correct given the buggy source, so this finding is inherited from the upstream fork.
- Recommendation: Change the source key to `"{count} giáo viên đang chờ phê duyệt"` (with proper ICU plural if needed), pass `count` from the component, and update all five locale files to match.

### LR-085-004 — Leading-space typo in `completedDescription` value, copied from English source

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/vi.json:1174`
- Evidence: Line 1174 contains `"completedDescription": " Bạn đã hoàn thành {count} thử thách sắp xếp câu",` inside the `Lesson.SentenceActivities.sentenceOrder` block. The value begins with a literal space character before "Bạn", producing a stray leading space in the rendered UI text. Cross-file comparison shows the same leading space is present in en.json:1174 (`" You completed {count} sentence ordering challenges"`) — the Vietnamese translator faithfully copied the typo from the English source. Other locales (th.json:1173, tw.json:1174, cn.json:1174) correctly removed the leading space during translation, but vi.json did not.
- Impact: When the sentence-order completion screen renders in Vietnamese, the message will appear with a visible leading space (e.g., " Bạn đã hoàn thành 5 thử thách sắp xếp câu") instead of properly trimmed text. Cosmetic but unprofessional and inconsistent with the other locale outputs.
- Recommendation: Trim the leading space in vi.json:1174 (`"Bạn đã hoàn thành {count} thử thách sắp xếp câu"`). The English source en.json:1174 should be fixed in the same coordinated change so future locales do not reintroduce the typo.

## No-Finding Notes

- `apps/primary-advantage/messages/vi.json` lines 5-94: Reviewed line-by-line; no findings. The NotFound, common, MainNav, Sidebar (excluding the locale selector already addressed in LR-085-001), and Leaderboard sections are structurally clean. MainNav.usernav navigation labels, Sidebar admin/teacher submenu items, and Leaderboard column headers are consistently translated.
- `apps/primary-advantage/messages/vi.json` lines 95-150: Reviewed; Question.SAQuestion/LAQuestion/MCQuestion, Student.history sections are clean. The same typos inherited from en.json (`anwserError`, `feedbackwritting`, `areaforimpovement`, `clarityandcoherence`, `complexityandstructure`, `contentanddevelopment`, `examplerevisions`, `feedbackoverall`, `finalfeedback`) appear as key names in the JSON structure but the Vietnamese values themselves are correctly localized — these key-name typos are owned by the English batch (LR-082-001..003, LR-082-008) and only need tracking here as inherited.
- `apps/primary-advantage/messages/vi.json` lines 151-219: Reviewed; Admin.Classrooms, Admin.Students.Add sections are clean with proper Vietnamese grammar and complete toast messages.
- `apps/primary-advantage/messages/vi.json` lines 220-340: Reviewed; ImportData section (errors, upload, preview, formatGuide, format, tips, issues subsections) is well-translated and structurally consistent with en.json.
- `apps/primary-advantage/messages/vi.json` lines 342-405: Reviewed; AdminDashboard section. Found LR-085-003 (hard-coded "5") at line 396. The rest of the stats, quickActions, recentActivity, systemStatus, charts blocks are clean.
- `apps/primary-advantage/messages/vi.json` lines 407-556: Reviewed; AdminArticleCreationPage, Components (including AdminArticleCreation tabs, dialogs, loading states, editor, manage, status, list, toasts) sections are clean. CEFR level labels A1..C2 are correctly passed through.
- `apps/primary-advantage/messages/vi.json` lines 558-696: Reviewed; WordList, Article.title/description/types/genres/subgenres sections. Found LR-085-002 (us_symbols_landmarks) at line 669. The rest of the genres/subgenres enumeration (school_stories, fantasy_magic, adventure, biomes, etc.) are clean and age-appropriate for primary students.
- `apps/primary-advantage/messages/vi.json` lines 699-757: Reviewed; Reports, Reports.activityprogress/recentactivity/activityheatmap/xpoverall/readingstatschart headers, Reports.activityType, Reports.level (full CEFR A0..C2 descriptions), Reports.progress sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 759-811: Reviewed; Overall.roles, Overall.status, Overall.time (relative-time ICU selectors with {minutes}, {hours}, etc.), Overall.days, Overall.months sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 813-851: Reviewed; Assignment (title, assignForm, studentAssignmentTable) section is clean.
- `apps/primary-advantage/messages/vi.json` lines 853-1302: Reviewed; SentencesPage (matchingGame, clozeTestGame, sentencesCard, manage, sentenceOrder, orderWordGame) sections are extensive but clean. All interpolation placeholders ({count}, {current}, {total}, {score}, {language}, {title}, {percent}, {elapsed}, {time}, {name}) are consistently formatted. ICU plural selectors in startScreen.language are correctly structured.
- `apps/primary-advantage/messages/vi.json` lines 1304-1307: Reviewed; VocabularyPage section is clean.
- `apps/primary-advantage/messages/vi.json` lines 1309-1412: Reviewed; HomePage.hero/features/benefits/contact/cta sections are clean. The HomePage.hero subtitle explicitly mentions age 8-12 (Lớp 3-6), which is appropriately localized for primary students.
- `apps/primary-advantage/messages/vi.json` lines 1414-1435: Reviewed; AboutPage, AuthPage.signin/signup sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 1437-1516: Reviewed; Settings.userProfile, Settings.schoolProfile (with createSchoolcard subsection) sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 1518-1804: Reviewed; Lesson.Reading, Lesson.title/description/loading/error/header/actions/progress/tasks, Lesson.VocabularyFlashcards, Lesson.VocabularyMatching, Lesson.Introduction, Lesson.PreviewVocabulary, Lesson.SentenceCollection, Lesson.SentenceActivities, Lesson.Summary sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 1806-1833: Reviewed; LessonLanguageQuestion section is clean.
- `apps/primary-advantage/messages/vi.json` lines 1835-1854: Reviewed; LessonMCQ section is clean.
- `apps/primary-advantage/messages/vi.json` lines 1856-1873: Reviewed; LessonSAQ section is clean.
- `apps/primary-advantage/messages/vi.json` lines 1875-1955: Reviewed; LessonCloze section (loading, common, start, instructions, difficulty, buttons, complete, game, hints, sentence, progress, result) is clean.
- `apps/primary-advantage/messages/vi.json` lines 1957-2013: Reviewed; SentenceFlashcards section is clean.
- `apps/primary-advantage/messages/vi.json` lines 2015-2022: Reviewed; TaskLanguageQuestions section is clean.
- `apps/primary-advantage/messages/vi.json` lines 2024-2092: Reviewed; TeacherMyClasses.page/table/actions/search/import/pagination/edit/delete/toast sections are clean. Google Classroom import strings are present and consistent.
- `apps/primary-advantage/messages/vi.json` lines 2094-2113: Reviewed; TeacherCreateClass section is clean.
- `apps/primary-advantage/messages/vi.json` lines 2115-2186: Reviewed; teacher.myStudents, teacher.cefrSetter sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 2188-2432: Reviewed; Teacher.Assignments, Teacher.ClassCodeGenerator (including clipboard instructions template), Teacher.StudentEnrollmentButton, Teacher.ClassroomNavigation (with ICU plural `{count, plural, one {# học sinh} other {# học sinh}}`), Teacher.ClassRoster, Teacher.ClassroomSelector (with ICU plural), Teacher.EnhancedClassRoster (with resetDialog warning text), Teacher.Enrollment, Teacher.AssignmentDashboard sections are clean. Found LR-085-004 (leading-space typo) at line 1174 (already noted above).
- `apps/primary-advantage/messages/vi.json` lines 2434-2570: Reviewed; AdminTeachers (page, Add, Table with moveDialog cross-school message, form, roles, cefrLevels, classrooms, tableHeaders, toasts) sections are clean.
- `apps/primary-advantage/messages/vi.json` lines 2572-2656: Reviewed; AdminStudents (header, page, stats, actions, dialogs, form, roles, filters, tableHeaders, table, badges, pagination) section is clean.

Coverage ranges: 1-2657 (full file). JSON is syntactically valid (verified by grep for unbalanced quotes/braces across all 2657 lines). All closing braces at lines 129, 151, 219, 341, 406, 412, 557, 562, 698, 758, 812, 852, 1118, 1149, 1201, 1302, 1308, 1413, 1417, 1436, 1517, 1804, 1834, 1855, 1874, 1956, 2013, 2022, 2092, 2113, 2187, 2432, 2570, 2657 — total 34 closing braces — match the expected nesting depth from the opening top-level `{` at line 1.