# Screenshot → lesson list (draft for PR's check)

**Status:** Draft, 2026-10-15 (Claude). PR checks it; S11 uses it after the freeze.
**Screens:** advantage-pr `assets/screenshots/tutor-advantage/dev-2026-10-15/` (`9d3a3df`).
**Lessons:** commit `84b151b7f` (lesson titles as in `apps/sales-advantage/scripts/static-seed.ts`).
**Rules:** spec.md S11, rules 1–9, and the folder README. Each screen below was checked against them.

The list starts from PR's starting list in spec.md S11. Two changes are marked **(moved)**.
A lesson shows a screen as an image with English alt text. The S11 media key is
`training-media/v1/en/screens/<folder>-<file>`.

## Core modules (1–3)

No screens. These lessons teach sales methods, not the product.

## S4 — Product Knowledge 2027

| Lesson | Section | Screen | Alt text | Rule notes |
|---|---|---|---|---|
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/04-dashboard.png` | The LINE student app home screen of a student with a class package | Seed data only |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/18-lesson-lobby.png` | The lesson lobby before a live class | — |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/24-live-p03-read-article.png` | A student reads the lesson article in the app: the digital twin of the printed book | Do not zoom on a level name (rule 4) |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/22-live-p02-flashcards.png` | Flashcards in a live lesson | — |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/17-voice-practice.png` | Reedy voice practice on a completed lesson | Rule 7: the caption says that Read Along with Reedy is not available |

## S5 — Family Sale

| Lesson | Section | Screen | Alt text | Rule notes |
|---|---|---|---|---|
| What the Parent Buys and the Five-Step Family Sale | What the parent buys (Reedy line) | `student-mobile/17-voice-practice.png` | Reedy voice practice on a completed lesson | Rule 7 |
| What the Parent Buys and the Five-Step Family Sale | After the conversation: if the parent says yes, step 1 | `student-mobile/02-login.png` | The parent signs in to the LINE student app | — |
| What the Parent Buys and the Five-Step Family Sale | After the conversation: if the parent says yes, step 1 | `student-mobile/03-consent-gate.png` | The consent screen before the app opens | — |
| What the Parent Buys and the Five-Step Family Sale | After the conversation: if the parent says yes, step 2 | `student-mobile/10-payment-age-check.png` | The age check: a student under 18 needs the guardian's name and relationship | Checked 2026-10-15: no price on this screen (rule 2) |
| What the Parent Buys and the Five-Step Family Sale | After the conversation: if the parent says yes, step 4 | `student-mobile/12-schedule.png` | The class schedule in the student app | — |
| The Parent Conversation, the Close, and Objections | Objections: "Will my child get better test scores?" | `student-mobile/51-progress.png` | The progress screen that the parent can see in the child's app | No outcome claim in the caption |

Not used in S5: the checkout and payment screens (`05`–`09`, `11`) show ฿2,500 (rule 2). Step 3 ("the parent pays in the app") has text only. The placement lesson has no app screen (rule 8); it uses the infographic `placement-to-book-map-{th,en}`.

## S6 — Tutor Recruitment

| Lesson | Section | Screen | Alt text | Rule notes |
|---|---|---|---|---|
| What a Tutor Does, and What Is Ready | What a Tutor Advantage tutor does | `tutor-desktop/02-dashboard.png` | The tutor app dashboard | Seed names only |
| What a Tutor Does, and What Is Ready | What a Tutor Advantage tutor does (Teach) | `tutor-desktop/16-lesson-hub.png` **(moved from S4)** | The lesson hub in the tutor app: prepare, rehearse, and teach each lesson | — |
| What a Tutor Does, and What Is Ready | What a Tutor Advantage tutor does (Teach) | `tutor-desktop/22-live-p01-launch.png` **(moved from S4)** | The tutor starts a live lesson: phase 1 of 18 | — |
| What a Tutor Does, and What Is Ready | A week as a tutor (example) | `tutor-desktop/09-schedule-week.png` | The tutor's week in the tutor app | — |
| The Commission Scale | How the rate works | `tutor-desktop/11-earnings.png` | The earnings screen: the rate, the group volume for the month, and the 3% withholding tax | Rule 6: recruitment lessons only; it shows 42.50% at ฿5,000 GV, the same example as the lesson |
| The Commission Scale | The differential: when you bring in a tutor | `tutor-desktop/12-network.png` | The network screen: the tutors that you brought in | Seed names only |

Not used in S6: the class screens (`03`–`06`) until PR checks them for ฿2,500 (rule 2). The tutor-mobile copies of the same screens can replace the desktop ones if trainees read on phones.

## S7 — School Sale

No Tutor Advantage screens (rule 9). The school lessons can use the Primary Advantage set `assets/screenshots/primary-advantage/rpg-skin-2026-10-06/` only after the Primary cutover, and only for features that are live in production on that day. Claude picks those screens after the cutover, and PR checks them.

## Questions for PR

1. I moved `tutor-desktop/16-lesson-hub` and `22-live-p01-launch` from S4 to S6, because the S4 lesson is about what the family buys, and the S6 lesson is about the tutor's work. Agree?
2. Do trainees read on phones? If yes, I use the tutor-mobile copies in S6.
