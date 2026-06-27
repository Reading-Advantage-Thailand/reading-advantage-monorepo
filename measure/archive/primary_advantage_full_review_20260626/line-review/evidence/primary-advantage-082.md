# Line Review Evidence: primary-advantage-082

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-082
Files assigned: 1
Lines assigned: 2657

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/messages/en.json` | 1-2657 | reviewed | 8 |

## Findings

### LR-082-001 — Typo in i18n key name "anwserError"

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:95`
- Evidence: Key `Question.SAQuestion.anwserError` has value "Please enter your answer". The key name misspells "answer" as "anwser". No equivalent `messages/` directory exists in the parent `reading-advantage` app, confirming this is a PA-fork-originated typo. If the consuming code references this misspelled key, correcting the key name requires a coordinated code+translation change.
- Impact: Developer confusion; if key is corrected without updating code references, the error message will silently fall back to the key path string.
- Recommendation: Create a small remediation track to rename the key to `answerError` and update all code references in a single coordinated change.

### LR-082-002 — Typo in i18n key name "feedbackwritting"

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:101`
- Evidence: Key `Question.LAQuestion.feedbackModal.feedbackwritting` has value "Writing Feedback". The key name misspells "writing" as "writting". No parent RA messages directory exists to inherit from.
- Impact: Same as LR-082-001 — silent fallback if key is corrected without code update.
- Recommendation: Rename to `feedbackWriting` with coordinated code change.

### LR-082-003 — Typo in i18n key name "areaforimpovement"

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:108`
- Evidence: Key `Question.LAQuestion.feedbackModal.areaforimpovement` has value "Area for improvement". The key name misspells "improvement" as "impovement".
- Impact: Same as LR-082-001.
- Recommendation: Rename to `areaForImprovement` with coordinated code change.

### LR-082-004 — Hard-coded mock data in production translation string

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:396-397`
- Evidence: `AdminDashboard.alerts.newRegistrations.description` is "5 teachers pending approval". The number "5" is hard-coded in the translation string rather than using an ICU interpolation like `{count} teachers pending approval`. This is a static placeholder that does not reflect actual system state.
- Impact: The admin dashboard will always show "5 teachers pending approval" regardless of the real count, misleading administrators.
- Recommendation: Change to `"{count} teachers pending approval"` and update the component to pass the count parameter.

### LR-082-005 — cn.json and tw.json have 42 keys under wrong namespace

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:1704-1703` (cross-file finding; root cause in cn.json/tw.json)
- Evidence: Cross-referencing all 5 locale files (en, cn, tw, th, vi) with Python key extraction revealed that `cn.json` and `tw.json` each have 42 keys under top-level `Introduction.*` and `VocabularyMatching.*` instead of the correct `Lesson.Introduction.*` and `Lesson.VocabularyMatching.*` namespaces used by en.json, th.json, and vi.json. This means the Lesson Introduction and VocabularyMatching features will show raw key paths instead of translated text for Chinese Simplified and Chinese Traditional users.
- Impact: 42 UI strings broken for cn/tw locales — the Lesson Introduction page and VocabularyMatching game are effectively unusable in these locales.
- Recommendation: Move the 42 misplaced keys in cn.json and tw.json from `Introduction.*` to `Lesson.Introduction.*` and from `VocabularyMatching.*` to `Lesson.VocabularyMatching.*`. This is a data-only fix with no code changes needed.

### LR-082-006 — Stub/placeholder translation values identical to key name

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:141-145`
- Evidence: Five keys under `Student.history` have values that are just the key name itself:
  - `"title": "title"` (line 141)
  - `"score": "score"` (line 142)
  - `"date": "date"` (line 143)
  - `"rated": "rated"` (line 144)
  - `"status": "status"` (line 145)
  These appear to be table column headers that were left as bare words instead of being capitalized or contextualized (e.g., "Title", "Score", "Date", "Rated", "Status").
- Impact: Table headers render as lowercase bare words, inconsistent with the rest of the UI which uses sentence-case or title-case labels.
- Recommendation: Capitalize values to "Title", "Score", "Date", "Rated", "Status" to match UI conventions.

### LR-082-007 — US-centric content in multi-locale primary-student app

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/messages/en.json:669`
- Evidence: `Article.subgenres.us_symbols_landmarks` has value "U.S. Symbols & Landmarks". This subgenre is US-centric and inappropriate for the app's international user base (Thai, Vietnamese, Chinese Simplified, Chinese Traditional locales are all supported). Primary Advantage targets ages 8-12 in multiple countries.
- Impact: Non-US students see a US-specific content category that is not relevant to their educational context. If articles are generated under this subgenre for non-US students, the content will be culturally inappropriate.
- Recommendation: Either rename to a locale-neutral "Symbols & Landmarks" and make the content culturally adaptive, or conditionally hide this subgenre for non-US schools.

### LR-082-008 — Inconsistent i18n key naming convention in feedbackModal

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/en.json:100-118`
- Evidence: The `Question.LAQuestion.feedbackModal` section uses all-lowercase concatenated key names (`feedbackwritting`, `finalfeedback`, `clarityandcoherence`, `complexityandstructure`, `contentanddevelopment`, `areaforimpovement`, `examplerevisions`, `feedbackoverall`, `nextStep`, `reviseResponse`, `getXP`) while the rest of the file consistently uses camelCase. Notably `nextStep`, `reviseResponse`, and `getXP` within the same object DO use camelCase, creating an internal inconsistency.
- Impact: Developer confusion when adding new keys or searching for existing ones. Increases risk of introducing duplicate keys with different casing.
- Recommendation: Normalize all keys in this section to camelCase in a coordinated code+translation change.

## No-Finding Notes

- `apps/primary-advantage/messages/en.json` lines 1-94: Reviewed line-by-line; no findings. LocaleSwitcher, common, NotFound, MainNav, Sidebar, Leaderboard sections are structurally clean with appropriate English values.
- `apps/primary-advantage/messages/en.json` lines 119-140: Reviewed; MCQuestion and Student.history sections (except lines 141-145 stub values) are clean.
- `apps/primary-advantage/messages/en.json` lines 152-341: Reviewed; Admin.Classrooms, Admin.Students.Add, ImportData sections are well-structured with proper interpolation placeholders and complete toast messages.
- `apps/primary-advantage/messages/en.json` lines 342-557: Reviewed; AdminDashboard (except line 396-397 hard-coded count), AdminArticleCreationPage, Components.AdminArticleCreation sections are clean.
- `apps/primary-advantage/messages/en.json` lines 558-698: Reviewed; WordList, Article (genres/subgenres) sections are comprehensive and appropriate for the age group.
- `apps/primary-advantage/messages/en.json` lines 699-812: Reviewed; Reports, Overall sections are clean with complete CEFR level descriptions and time/date formatting.
- `apps/primary-advantage/messages/en.json` lines 813-1303: Reviewed; Assignment, SentencesPage (matchingGame, clozeTestGame, sentencesCard, sentenceOrder, orderWordGame) sections are extensive but clean with consistent structure.
- `apps/primary-advantage/messages/en.json` lines 1304-1417: Reviewed; VocabularyPage, HomePage, AboutPage sections are clean and age-appropriate.
- `apps/primary-advantage/messages/en.json` lines 1418-1517: Reviewed; AuthPage, Settings (userProfile, schoolProfile) sections are clean.
- `apps/primary-advantage/messages/en.json` lines 1518-1805: Reviewed; Lesson (Reading, tasks, VocabularyFlashcards, VocabularyMatching, Introduction, PreviewVocabulary, SentenceCollection, SentenceActivities, Summary) sections are clean.
- `apps/primary-advantage/messages/en.json` lines 1806-2014: Reviewed; LessonLanguageQuestion, LessonMCQ, LessonSAQ, LessonCloze, SentenceFlashcards sections are clean.
- `apps/primary-advantage/messages/en.json` lines 2015-2433: Reviewed; TaskLanguageQuestions, TeacherMyClasses, TeacherCreateClass, teacher (myStudents, cefrSetter), Teacher (Assignments, ClassroomNavigation, ClassCodeGenerator, StudentEnrollmentButton, ClassRoster, ClassroomSelector, EnhancedClassRoster, Enrollment, AssignmentDashboard) sections are clean.
- `apps/primary-advantage/messages/en.json` lines 2434-2657: Reviewed; AdminTeachers, AdminStudents sections are clean with comprehensive form/table/filter/dialog strings.
