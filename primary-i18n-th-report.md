# Primary Advantage: Thai i18n report at 01f2acfe8

## Summary

- Message files: `apps/primary-advantage/messages/{en,th}.json`, loaded by `apps/primary-advantage/i18n/request.ts`. en has 3498 keys; th has 3498 keys.
- No key is missing or empty in th. 96 th values are still English text. Most of them are on the public pages.
- Hard-coded user-visible strings: 232 rows, plus 2 legal pages that are English only (privacy policy, terms).
- teacher: 0 English values in th, 35 hard-coded strings.
- student: 2 English values in th, 44 hard-coded strings.
- admin: 7 English values in th, 132 hard-coded strings.
- shared: 87 English values in th, 23 hard-coded strings.
- Teachers see few gaps. The largest teacher gap is the CEFR level picker: 30 hard-coded labels.
- Admin and system pages have the most hard-coded text (licenses, schools).

## Method

- A script flattened en.json and th.json and compared every key. A value counts as English when it has no Thai letters and has a word of 3 or more Latin letters, after placeholders and tags are removed.
- A TypeScript parser scanned every `.tsx` file in `app/`, `components/`, `contexts/`, and `hooks/` (tests excluded). It flagged JSX text, string attributes (placeholder, title, alt, aria-label, label, and similar), string props in objects (title, label, description, message), toast and alert calls, and strings in JSX expressions.
- The report drops entities, CSS classes, date formats, internal status codes, the brand name, and "XP" (th.json also uses "XP"). It drops two pages that render only in development: `components/shared/change-role.tsx` and `app/[locale]/(student)/student/avatar/poses/page.tsx`.
- The scan does not see English text that comes from the server (API error messages, server action results) or text in `.ts` files. Check these by hand.
- Areas: teacher = `app/[locale]/teacher`, `components/teacher`. student = `app/[locale]/(student)` and student components (articles, flashcards, lesson, practice, reedy, student, avatar, dashboard). admin = `app/[locale]/admin`, `app/[locale]/system`, `components/{admin,system,school}`. shared = the rest (auth, error pages, ui, public site).

## Full table

### A. Message keys: English text in th.json

| Area | Key | English text | Problem |
|---|---|---|---|
| admin | `Admin.SchoolSelect.label` | School | Thai value is the same English text |
| admin | `Admin.SchoolSelect.placeholder` | Select a school | Thai value is the same English text |
| admin | `Admin.SchoolSelect.required` | Please select a school | Thai value is the same English text |
| admin | `ImportData.format.headers.name` | name | Thai value is the same English text (CSV column name; may be on purpose) |
| admin | `ImportData.format.headers.email` | email | Thai value is the same English text (CSV column name; may be on purpose) |
| admin | `ImportData.format.headers.classroomName` | classroom_name | Thai value is the same English text (CSV column name; may be on purpose) |
| admin | `ImportData.format.headers.role` | role | Thai value is the same English text (CSV column name; may be on purpose) |
| student | `Reedy.explainEn` | Reedy is a speaking coach. Talk about your story in English and Thai. Reedy is new, so ... | Thai value is the same English text (key name says English; may be on purpose) |
| student | `Stories.cefr` | CEFR {level} | Thai value is the same English text (level code; may be on purpose) |
| shared | `PublicSite.trialCta` | Contact us for a free trial | Thai value is the same English text |
| shared | `PublicSite.signIn` | Sign in | Thai value is the same English text |
| shared | `PublicHome.meta.title` | Primary Advantage \| English workbooks and a reading app for grades 3–6 | Thai value is the same English text |
| shared | `PublicHome.meta.description` | Primary Advantage pairs printed English workbooks with a reading app for grades 3–6. CE... | Thai value is the same English text |
| shared | `PublicHome.hero.title` | Primary Advantage | Thai value is the same English text (brand name; may be on purpose) |
| shared | `PublicHome.hero.tagline` | Read the book in class. Continue the adventure in the app. | Thai value is the same English text |
| shared | `PublicHome.hero.forSchools` | For schools | Thai value is the same English text |
| shared | `PublicHome.hero.phoneAlt` | The Primary Advantage home page on a phone: the student's hero in the guild hall, with ... | Thai value is the same English text |
| shared | `PublicHome.book.title` | The book and the app | Thai value is the same English text |
| shared | `PublicHome.book.body` | Each Primary Advantage workbook has 14 lessons. The app has the same lessons, with audi... | Thai value is the same English text |
| shared | `PublicHome.book.mockupAlt` | The cover of the Primary Advantage Origins 3.2 workbook | Thai value is the same English text |
| shared | `PublicHome.book.classBookAlt` | The class book on a phone: Primary Advantage Origins 2, with lesson 1 marked "Now in cl... | Thai value is the same English text |
| shared | `PublicHome.book.classBookCaption` | In the app: the class book for Primary Advantage Origins 2 | Thai value is the same English text |
| shared | `PublicHome.inside.title` | Inside the app | Thai value is the same English text |
| shared | `PublicHome.inside.intro` | Every page of the app is a place in Chibi Quest, a picture-book game world. The story p... | Thai value is the same English text |
| shared | `PublicHome.inside.hero.title` | Choose a hero | Thai value is the same English text |
| shared | `PublicHome.inside.hero.body` | Each student chooses a hero, then picks its skin, hair, eye, and clothes colors. | Thai value is the same English text |
| shared | `PublicHome.inside.hero.alt` | The hero shrine: the hero classes stand on stones, each with a name sign | Thai value is English text, and differs from en |
| shared | `PublicHome.inside.shop.title` | Earn GP, choose gear | Thai value is the same English text |
| shared | `PublicHome.inside.shop.body` | Students earn Guild Points (GP) when they read and practice. They spend GP on gear for ... | Thai value is the same English text |
| shared | `PublicHome.inside.shop.alt` | The avatar shop on a phone: gear with GP prices, and the bracers marked "Owned" after t... | Thai value is the same English text |
| shared | `PublicHome.inside.quest.title` | Class Quest: one boss, the whole class | Thai value is the same English text |
| shared | `PublicHome.inside.quest.body` | During the week, students meet reading goals to earn power-ups. Then the whole class fi... | Thai value is the same English text |
| shared | `PublicHome.inside.quest.alt` | Class Quest on a phone: the Goblin King, the class damage meter, and the student's hero... | Thai value is the same English text |
| shared | `PublicHome.inside.reedy.title` | Reedy Preview: speaking practice | Thai value is the same English text |
| shared | `PublicHome.inside.reedy.body` | After a lesson, students talk about the story with Reedy, a speaking coach, in English ... | Thai value is the same English text |
| shared | `PublicHome.inside.reedy.alt` | Reedy Preview on a phone: the student's Wizard hero at the campfire, the minutes meter,... | Thai value is the same English text |
| shared | `PublicHome.inside.wordAdventures.title` | Word adventures | Thai value is the same English text |
| shared | `PublicHome.inside.wordAdventures.body` | Games that use the words and sentences each student saved from their reading. A 2D mode... | Thai value is the same English text |
| shared | `PublicHome.inside.wordAdventures.alt` | Word adventures on desktop: game cards for Rune Match, Labyrinth of the Goblin King, Po... | Thai value is the same English text |
| shared | `PublicHome.teachers.title` | For teachers | Thai value is the same English text |
| shared | `PublicHome.teachers.body` | Designed for Thai teachers. Each lesson has a step-by-step plan in the Teacher manual, ... | Thai value is the same English text |
| shared | `PublicHome.teachers.points.0` | Open each lesson for the class when you teach it from the workbook. | Thai value is the same English text |
| shared | `PublicHome.teachers.points.1` | Show the lesson and the Class Quest battle on the classroom projector. | Thai value is the same English text |
| shared | `PublicHome.teachers.points.2` | See each student's progress, lesson by lesson, and who needs help. | Thai value is the same English text |
| shared | `PublicHome.teachers.alt` | The class progress page on desktop: each student's lessons, with a mark on the students... | Thai value is the same English text |
| shared | `PublicHome.levels.title` | Levels | Thai value is the same English text |
| shared | `PublicHome.levels.body` | Primary Advantage is CEFR-aligned, with 15 levels from Pre-A1 (A0) to B2. Each CEFR ban... | Thai value is the same English text |
| shared | `PublicHome.families.title` | For families | Thai value is the same English text |
| shared | `PublicHome.families.body` | Children can also learn with the same books outside school. In Tutor Advantage, a local... | Thai value is the same English text |
| shared | `PublicHome.families.link` | Find out about Tutor Advantage | Thai value is the same English text |
| shared | `PublicHome.contact.title` | Talk to us | Thai value is the same English text |
| shared | `PublicHome.contact.body` | Schools: ask us for a free trial or a demo. Families: ask us about Tutor Advantage clas... | Thai value is the same English text |
| shared | `PublicHome.contact.line` | LINE Official Account | Thai value is the same English text |
| shared | `PublicHome.contact.lineQrAlt` | QR code for the Reading Advantage LINE Official Account | Thai value is the same English text |
| shared | `PublicHome.contact.facebook` | Facebook | Thai value is the same English text (brand name; may be on purpose) |
| shared | `PublicHome.contact.phone` | Phone | Thai value is the same English text |
| shared | `PublicHome.contact.email` | Email | Thai value is the same English text |
| shared | `PublicAbout.meta.title` | About us \| Primary Advantage | Thai value is the same English text |
| shared | `PublicAbout.meta.description` | Reading Advantage (Thailand) is a curriculum publisher in Khon Kaen. We make Primary Ad... | Thai value is the same English text |
| shared | `PublicAbout.title` | About us | Thai value is the same English text |
| shared | `PublicAbout.who.title` | Who we are | Thai value is the same English text |
| shared | `PublicAbout.who.body` | Reading Advantage (Thailand) is a curriculum publisher in Khon Kaen. Phikul Phookathin ... | Thai value is the same English text |
| shared | `PublicAbout.product.title` | What Primary Advantage is | Thai value is the same English text |
| shared | `PublicAbout.product.body` | Primary Advantage is English reading for grades 3–6 (ages 8–11). Each workbook has 14 l... | Thai value is the same English text |
| shared | `PublicAbout.schools.title` | For schools: Blended Learning | Thai value is the same English text |
| shared | `PublicAbout.schools.body` | Schools use Primary Advantage through Blended Learning: printed workbooks and the app, ... | Thai value is the same English text |
| shared | `PublicAbout.families.title` | For families: Tutor Advantage | Thai value is the same English text |
| shared | `PublicAbout.families.body` | Families can learn with the same books through Tutor Advantage. A local tutor teaches t... | Thai value is the same English text |
| shared | `PublicAbout.families.link` | Find out about Tutor Advantage | Thai value is the same English text |
| shared | `PublicContact.meta.title` | Contact us \| Primary Advantage | Thai value is the same English text |
| shared | `PublicContact.meta.description` | Contact Reading Advantage about Primary Advantage: a free trial or a demo for your scho... | Thai value is the same English text |
| shared | `PublicContact.title` | Contact us | Thai value is the same English text |
| shared | `PublicContact.intro` | Schools can ask for a free trial or a demo. Families can ask about Tutor Advantage clas... | Thai value is the same English text |
| shared | `PublicContact.line` | LINE Official Account | Thai value is the same English text |
| shared | `PublicContact.lineQrAlt` | QR code for the Reading Advantage LINE Official Account | Thai value is the same English text |
| shared | `PublicContact.facebook` | Facebook | Thai value is the same English text (brand name; may be on purpose) |
| shared | `PublicContact.phone` | Phone | Thai value is the same English text |
| shared | `PublicContact.email` | Email | Thai value is the same English text |
| shared | `PublicBooks.meta.title` | Our books \| Primary Advantage | Thai value is the same English text |
| shared | `PublicBooks.meta.description` | The Primary Advantage workbook series: Origins, Quest, and Adventure. Written and edite... | Thai value is the same English text |
| shared | `PublicBooks.title` | Our books | Thai value is the same English text |
| shared | `PublicBooks.intro` | Primary Advantage is a series of printed English workbooks for grades 3–6. Each book ha... | Thai value is the same English text |
| shared | `PublicBooks.series.origins.title` | Primary Advantage Origins | Thai value is the same English text |
| shared | `PublicBooks.series.origins.body` | Pre-A1 (A0). First stories and short informational texts about school, family, friends,... | Thai value is the same English text |
| shared | `PublicBooks.series.quest.title` | Primary Advantage Quest | Thai value is the same English text |
| shared | `PublicBooks.series.quest.body` | A1. Longer stories and texts, with new words in each lesson, for students who can read ... | Thai value is the same English text |
| shared | `PublicBooks.series.adventure.title` | Primary Advantage Adventure | Thai value is the same English text |
| shared | `PublicBooks.series.adventure.body` | A2. Stories and informational texts for students who read with more confidence. The Adv... | Thai value is the same English text |
| shared | `PublicBooks.team.title` | Who makes the books | Thai value is the same English text |
| shared | `PublicBooks.team.body` | The Reading Advantage team in Khon Kaen writes and edits every book. The founders lead ... | Thai value is the same English text |
| shared | `PublicBooks.mockupAlt` | The cover of the Primary Advantage Origins 3.2 workbook | Thai value is the same English text |
| shared | `PublicBooks.covers.origins2` | The cover of the Primary Advantage Origins 2 workbook | Thai value is the same English text |
| shared | `PublicBooks.covers.origins31` | The cover of the Primary Advantage Origins 3.1 workbook | Thai value is the same English text |
| shared | `PublicBooks.covers.origins32` | The cover of the Primary Advantage Origins 3.2 workbook | Thai value is the same English text |
| shared | `PublicBooks.covers.quest4` | The cover of the Primary Advantage Quest 4 workbook | Thai value is the same English text |
| shared | `Storytime.brand` | Storytime Advantage | Thai value is the same English text (brand name; may be on purpose) |

### B. Hard-coded strings in components

Paths are relative to `apps/primary-advantage/`.

| Area | File:line | English text | Problem |
|---|---|---|---|
| teacher | `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/print/page.tsx:93` | Kit | Hard-coded JSX text |
| teacher | `components/teacher/enrollment-management.tsx:400` | Lvl | Hard-coded JSX text |
| teacher | `components/teacher/enrollment-management.tsx:427` | Enroll | Hard-coded JSX text |
| teacher | `components/teacher/enrollment-management.tsx:442` | Close | Hard-coded JSX text |
| teacher | `components/teacher/my-classes.tsx:241` | Unknown | Hard-coded text in a JSX expression |
| teacher | `components/teacher/student-cefr-level-setter.tsx:35` | A0- (Beginner) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:35` | Pre-A0, very basic | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:38` | A0 (Beginner) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:39` | Basic user, elementary | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:43` | A0+ (High Beginner) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:44` | Upper elementary | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:48` | A1- (Pre-Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:49` | Lower intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:53` | A1 (Pre-Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:54` | Pre-intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:58` | A1+ (High Pre-Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:59` | Upper pre-intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:63` | A2- (Low Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:64` | Lower intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:68` | A2 (Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:69` | Independent user, intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:73` | A2+ (High Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:74` | Upper intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:78` | B1- (Low Upper-Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:79` | Lower upper-intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:83` | B1 (Upper-Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:84` | Upper-intermediate | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:88` | B1+ (High Upper-Intermediate) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:89` | Advanced lower | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:91` | B2- (Low Advanced) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:91` | Lower advanced | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:94` | B2 (Advanced) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:95` | Proficient user, advanced | Hard-coded description text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:97` | B2+ (High Advanced) | Hard-coded label text in an object |
| teacher | `components/teacher/student-cefr-level-setter.tsx:97` | Upper advanced | Hard-coded description text in an object |
| student | `app/[locale]/(student)/settings/user-profile/page.tsx:129` | Verified | Hard-coded text in a JSX expression |
| student | `app/[locale]/(student)/settings/user-profile/page.tsx:134` | Not verified | Hard-coded text in a JSX expression |
| student | `components/articles/article-content.tsx:205` | Success | Hard-coded toast or alert text |
| student | `components/articles/article-content.tsx:206` | You have saved sentences to flashcard | Hard-coded description text in an object |
| student | `components/articles/article-content.tsx:210` | Sentence already saved | Hard-coded toast or alert text |
| student | `components/articles/article-content.tsx:216` | Something went wrong. | Hard-coded toast or alert text |
| student | `components/articles/article-content.tsx:217` | Your sentence was not saved. Please try again. | Hard-coded description text in an object |
| student | `components/articles/article-content.tsx:224` | Something went wrong. | Hard-coded toast or alert text |
| student | `components/articles/article-content.tsx:225` | Your sentence was not saved. Please try again. | Hard-coded description text in an object |
| student | `components/articles/article-content.tsx:320` | Article Image | Hard-coded alt attribute |
| student | `components/articles/questions/mc-question-content.tsx:211` | Quiz finished successfully | Hard-coded toast or alert text |
| student | `components/articles/questions/mc-question-content.tsx:218` | Failed to finish quiz | Hard-coded toast or alert text |
| student | `components/articles/questions/mc-question-content.tsx:261` | Feedback: | Hard-coded JSX text |
| student | `components/articles/questions/mc-question-content.tsx:299` | Please select an option to continue | Hard-coded toast or alert text |
| student | `components/articles/questions/mc-question-content.tsx:309` | Please select an option to continue | Hard-coded toast or alert text |
| student | `components/articles/questions/written-question-content.tsx:367` | Type your answer here... | Hard-coded placeholder attribute |
| student | `components/articles/questions/written-question-content.tsx:423` | Feedback and your score | Hard-coded text in a JSX expression |
| student | `components/articles/questions/written-question-content.tsx:424` | Final Feedback and your score | Hard-coded text in a JSX expression |
| student | `components/dashboard/user-reading-chart.tsx:40` | Completed | Hard-coded label text in an object |
| student | `components/flashcards/deck-view.tsx:146` | No cards are due for review right now! ⏰ | Hard-coded toast or alert text |
| student | `components/flashcards/deck-view.tsx:152` | Failed to load cards | Hard-coded toast or alert text |
| student | `components/flashcards/deck-view.tsx:459` | All Caught Up! 🎉 | Hard-coded JSX text |
| student | `components/flashcards/deck-view.tsx:473` | Read Articles to Add Cards | Hard-coded JSX text |
| student | `components/flashcards/flashcard-game.tsx:115` | Failed to save ratings | Hard-coded toast or alert text |
| student | `components/flashcards/flashcard-game.tsx:119` | Failed to save ratings | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-flashcard-game.tsx:384` | Failed to save ratings | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-flashcard-game.tsx:388` | Failed to save ratings | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-cloze-test.tsx:205` | Failed to load sentences | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-cloze-test.tsx:271` | Mode | Hard-coded JSX text |
| student | `components/lesson/games/lesson-sentence-cloze-test.tsx:278` | of | Hard-coded JSX text |
| student | `components/lesson/games/lesson-sentence-cloze-test.tsx:1078` | Failed to play audio | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-order-word.tsx:1157` | Next | Hard-coded JSX text |
| student | `components/lesson/games/lesson-sentence-order.tsx:256` | Failed to load sentences from flashcard deck | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-order.tsx:260` | Failed to load sentences | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-order.tsx:604` | No sentences found for audio playback | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-order.tsx:620` | Audio data not available for playback | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-order.tsx:699` | Failed to play hint audio | Hard-coded toast or alert text |
| student | `components/lesson/games/lesson-sentence-order.tsx:908` | of | Hard-coded JSX text |
| student | `components/lesson/task/task-lesson-summary.tsx:185` | Excellent | Hard-coded label text in an object |
| student | `components/lesson/task/task-lesson-summary.tsx:191` | Good | Hard-coded label text in an object |
| student | `components/lesson/task/task-lesson-summary.tsx:196` | Needs Practice | Hard-coded label text in an object |
| student | `components/lesson/task/task-reading.tsx:160` | Article Image | Hard-coded alt attribute |
| student | `components/practice/matching-game.tsx:525` | Perfect! All pairs matched correctly! 🎉 | Hard-coded toast or alert text |
| student | `components/practice/matching-game.tsx:752` | Select language | Hard-coded placeholder attribute |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:42` | License name must be at least 3 characters. | Hard-coded form error text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:45` | License name must be at most 100 characters. | Hard-coded form error text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:50` | Description must be at most 500 characters. | Hard-coded form error text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:57` | Maximum users must be at least 1. | Hard-coded form error text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:60` | Maximum users cannot exceed 10,000. | Hard-coded form error text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:127` | License created successfully! | Hard-coded toast or alert text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:132` | Failed to create license | Hard-coded toast or alert text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:134` | Please try again or contact support if the problem persists. | Hard-coded description text in an object |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:161` | License Name | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:163` | Enter license name | Hard-coded placeholder attribute |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:167` | A descriptive name for this license | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:180` | School (Optional) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:188` | Select a School | Hard-coded placeholder attribute |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:205` | The school that this license is for (optional) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:215` | Subscription Type | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:222` | Select subscription type | Hard-coded placeholder attribute |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:226` | Basic | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:227` | Premium | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:228` | Enterprise | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:233` | The subscription type for this license | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:246` | Maximum Users | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:257` | Maximum number of users allowed for this license | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:268` | Status | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:275` | Select license status | Hard-coded placeholder attribute |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:279` | Active | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:280` | Inactive | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:281` | Expired | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:285` | Current status of the license | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:319` | Start Date | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:333` | Pick a date | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:353` | When this license becomes active | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:364` | Expiry Duration (Optional) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:373` | Select expiry duration | Hard-coded placeholder attribute |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:377` | No expiry | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:378` | 30 days | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:379` | 90 days | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:380` | 180 days (6 months) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:381` | 365 days (1 year) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:382` | 730 days (2 years) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:383` | 1095 days (3 years) | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:388` | License will expire after this many days from start date | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:400` | Create License | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/create-license-form.tsx:409` | Reset Form | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/create-licenses/page.tsx:15` | Create License | Hard-coded heading attribute |
| admin | `app/[locale]/system/licenses/create-licenses/page.tsx:16` | Create a new license for school | Hard-coded text attribute |
| admin | `app/[locale]/system/licenses/create-licenses/page.tsx:22` | Back to Licenses | Hard-coded JSX text |
| admin | `app/[locale]/system/licenses/page.tsx:9` | Licenses | Hard-coded heading attribute |
| admin | `app/[locale]/system/licenses/page.tsx:9` | Create a new license for school | Hard-coded text attribute |
| admin | `app/[locale]/system/schools/page.tsx:9` | Schools | Hard-coded heading attribute |
| admin | `app/[locale]/system/schools/page.tsx:9` | Manage schools in the system | Hard-coded text attribute |
| admin | `components/admin/teachers-table.tsx:141` | Failed to load teachers data | Hard-coded toast or alert text |
| admin | `components/admin/teachers-table.tsx:289` | Teacher created successfully | Hard-coded toast or alert text |
| admin | `components/admin/teachers-table.tsx:366` | Teacher updated successfully | Hard-coded toast or alert text |
| admin | `components/admin/teachers-table.tsx:391` | Teacher deleted successfully | Hard-coded toast or alert text |
| admin | `components/school/add-admin-dialog.tsx:50` | Please enter a search term | Hard-coded toast or alert text |
| admin | `components/school/add-admin-dialog.tsx:65` | Failed to search users | Hard-coded toast or alert text |
| admin | `components/school/add-admin-dialog.tsx:90` | Admin added successfully! | Hard-coded toast or alert text |
| admin | `components/school/add-admin-dialog.tsx:96` | Failed to add admin | Hard-coded toast or alert text |
| admin | `components/school/add-admin-dialog.tsx:154` | Search Results | Hard-coded JSX text |
| admin | `components/school/add-admin-dialog.tsx:191` | Add Admin | Hard-coded text in a JSX expression |
| admin | `components/school/add-admin-dialog.tsx:202` | No users found matching &quot; | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:117` | School deleted successfully! | Hard-coded toast or alert text |
| admin | `components/school/school-detail.tsx:120` | Failed to delete school | Hard-coded toast or alert text |
| admin | `components/school/school-detail.tsx:147` | Failed to remove admin | Hard-coded toast or alert text |
| admin | `components/school/school-detail.tsx:245` | You | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:284` | users | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:293` | admins | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:319` | License Name | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:327` | Description | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:335` | License Key | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:345` | Max Users | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:348` | users | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:356` | Status | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:384` | Start Date | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:395` | Expiry Date | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:406` | License Duration | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:409` | days | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:417` | Current Usage | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:421` | users | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:454` | No license found | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:495` | Admin | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:497` | Owner | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:517` | Remove Admin | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:519` | Are you sure you want to remove | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:520` | as an admin? They will lose administrative privileges for this school. | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:526` | Cancel | Hard-coded JSX text |
| admin | `components/school/school-detail.tsx:533` | Remove Admin | Hard-coded JSX text |
| admin | `components/school/school-form.tsx:36` | School name must be at least 2 characters. | Hard-coded form error text |
| admin | `components/school/school-form.tsx:39` | School name must be at most 100 characters. | Hard-coded form error text |
| admin | `components/school/school-form.tsx:44` | Contact name must be at most 100 characters. | Hard-coded form error text |
| admin | `components/school/school-form.tsx:50` | Please enter a valid email address. | Hard-coded form error text |
| admin | `components/school/school-form.tsx:136` | School updated successfully! | Hard-coded toast or alert text |
| admin | `components/school/school-form.tsx:146` | School created successfully! | Hard-coded toast or alert text |
| admin | `components/system/create-school-dialog.tsx:39` | Create School | Hard-coded JSX text |
| admin | `components/system/create-school-dialog.tsx:44` | Create New School | Hard-coded JSX text |
| admin | `components/system/create-school-dialog.tsx:46` | Add a new school to the system. Fill in the required information below. | Hard-coded JSX text |
| admin | `components/system/create-school-form.tsx:27` | School name must be at least 2 characters. | Hard-coded form error text |
| admin | `components/system/create-school-form.tsx:30` | School name must be at most 100 characters. | Hard-coded form error text |
| admin | `components/system/create-school-form.tsx:35` | Contact name must be at most 100 characters. | Hard-coded form error text |
| admin | `components/system/create-school-form.tsx:41` | Please enter a valid email address. | Hard-coded form error text |
| admin | `components/system/edit-license-form.tsx:55` | License name must be at least 3 characters. | Hard-coded form error text |
| admin | `components/system/edit-license-form.tsx:58` | License name must be at most 100 characters. | Hard-coded form error text |
| admin | `components/system/edit-license-form.tsx:64` | Maximum users must be at least 1. | Hard-coded form error text |
| admin | `components/system/edit-license-form.tsx:67` | Maximum users cannot exceed 10,000. | Hard-coded form error text |
| admin | `components/system/license-table.tsx:92` | License Name | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:115` | No School (General License) | Hard-coded text in a JSX expression |
| admin | `components/system/license-table.tsx:122` | Max Users | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:130` | Subscription Type | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:152` | Status | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:166` | Expiry Date | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:173` | No Expiry | Hard-coded text in a JSX expression |
| admin | `components/system/license-table.tsx:189` | Open menu | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:194` | Actions | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:199` | Copy License | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:207` | Edit License | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:216` | Delete License | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:232` | Edit License | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:234` | Update the license details and settings | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:277` | Delete License | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:279` | Are you sure you want to delete this license | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:285` | Cancel | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:295` | Deleting... | Hard-coded text in a JSX expression |
| admin | `components/system/license-table.tsx:295` | Delete License | Hard-coded text in a JSX expression |
| admin | `components/system/license-table.tsx:314` | License deleted successfully | Hard-coded toast or alert text |
| admin | `components/system/license-table.tsx:321` | Failed to delete license | Hard-coded toast or alert text |
| admin | `components/system/license-table.tsx:328` | Failed to delete license | Hard-coded toast or alert text |
| admin | `components/system/license-table.tsx:329` | Please try again or contact support. | Hard-coded description text in an object |
| admin | `components/system/license-table.tsx:343` | No results. | Hard-coded emptyText attribute |
| admin | `components/system/license-table.tsx:349` | Filter license names... | Hard-coded placeholder attribute |
| admin | `components/system/license-table.tsx:355` | Create License | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:368` | Previous | Hard-coded JSX text |
| admin | `components/system/license-table.tsx:376` | Next | Hard-coded JSX text |
| shared | `app/[locale]/auth/error/page.tsx:4` | Authentication Error | Hard-coded JSX text |
| shared | `app/[locale]/auth/error/page.tsx:5` | There was an error during the authentication process. | Hard-coded JSX text |
| shared | `app/[locale]/auth/forgot-password/page.tsx:6` | Reset Password | Hard-coded title text in an object |
| shared | `app/[locale]/auth/forgot-password/page.tsx:7` | Reset your Primary Advantage password. | Hard-coded description text in an object |
| shared | `app/[locale]/unauthorized/page.tsx:10` | Unauthorized | Hard-coded JSX text |
| shared | `app/[locale]/unauthorized/page.tsx:12` | Your account does not have access to this page. | Hard-coded JSX text |
| shared | `app/[locale]/unauthorized/page.tsx:15` | Back to home | Hard-coded JSX text |
| shared | `app/global-error.tsx:37` | Something went wrong | Hard-coded JSX text |
| shared | `app/global-error.tsx:38` | Sorry, an unexpected error occurred. Please try again. | Hard-coded JSX text |
| shared | `app/global-error.tsx:48` | Try again | Hard-coded JSX text |
| shared | `app/global-error.tsx:50` | Go home | Hard-coded JSX text |
| shared | `components/auth/email-forgot-password-template.tsx:10` | Welcome, | Hard-coded JSX text |
| shared | `components/icons.tsx:9` | logo | Hard-coded alt attribute |
| shared | `components/ui/copy-button.tsx:53` | Copy | Hard-coded JSX text |
| shared | `components/ui/copy-button.tsx:58` | Copied | Hard-coded text in a JSX expression |
| shared | `components/ui/copy-button.tsx:58` | Copy to Clipboard | Hard-coded text in a JSX expression |
| shared | `components/ui/dialog.tsx:72` | Close | Hard-coded JSX text |
| shared | `components/ui/rating.tsx:99` | Product Rating | Hard-coded aria-label attribute |
| shared | `components/ui/rating.tsx:120` | Star | Hard-coded text in a JSX expression |
| shared | `components/ui/sheet.tsx:77` | Close | Hard-coded JSX text |
| shared | `components/user-avatar.tsx:14` | Picture | Hard-coded alt attribute |
| shared | `app/[locale]/(index)/privacy-policy/page.tsx:8-163` | Whole legal page (63 text blocks), e.g. "Privacy Policy" | Hard-coded page; no message key and no Thai version |
| shared | `app/[locale]/(index)/terms/page.tsx:8-137` | Whole legal page (52 text blocks), e.g. "Terms" | Hard-coded page; no message key and no Thai version |

## Top 10 teacher-facing gaps

1. `components/teacher/student-cefr-level-setter.tsx:35`: The CEFR level picker shows 15 English labels and 15 English descriptions (lines 35-97). Teachers open it from the class roster and My students.
2. `components/teacher/enrollment-management.tsx:427`: The "Enroll" button in the enroll-student dialog is English.
3. `components/teacher/enrollment-management.tsx:442`: The "Close" button in the enroll-student dialog is English.
4. `components/teacher/enrollment-management.tsx:400`: The "Lvl" badge on each student in the enroll dialog is English.
5. `components/teacher/my-classes.tsx:241`: A class with no name shows "Unknown" in the My classes table.
6. `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/print/page.tsx:93`: The printed lesson kit shows "Kit … · Data …" in English at the foot of the page.
7. `app/[locale]/unauthorized/page.tsx:10`: The no-access page ("Unauthorized", "Back to home") is English. A teacher sees it after opening a page the role cannot use.
8. `components/ui/dialog.tsx:72`: Every dialog has a screen-reader "Close" label in English. Teacher dialogs (assign, enroll) use it.
9. `components/ui/sheet.tsx:77`: Every side sheet has a screen-reader "Close" label in English. The app menu (`components/nav/app-nav.tsx`) uses a sheet.
10. `app/global-error.tsx:37`: The crash page ("Something went wrong", "Try again", "Go home") is English for every user, teachers included.

Note: the teacher help and manual pages and the teacher message namespaces have no English values in th.json. The gaps above are all hard-coded text.
