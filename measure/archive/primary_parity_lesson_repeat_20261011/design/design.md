# Design: teach again and start again

## Rules that all views follow
- Gold button: the one primary action of a view or the one confirm action of a dialog.
- Iron button: the secondary action and the "Cancel" action. Skin buttons are 48 px or more.
- The history and the XP rule show as plain text. The text never blames the student.
- The confirm dialog is a parchment `Panel` with `role="alertdialog"` over a dark overlay.
  "Cancel" is first in the tab order. The overlay does not close the dialog.
- Staff pages keep the shadcn card. Only the new buttons and the dialog use the skin kit.

## Student: lesson summary (task 14)
Component: `components/lesson/task/task-lesson-summary.tsx` (now plain gradient cards).
The phase S2 task wraps the action row only. It does not re-skin the summary cards.
- Action row: "Back to Read Page" (gold, first) and "Start again" (iron, with a restart icon).
  Mobile: full width, stacked. Desktop: side by side, centered.
- "Attempt N": a `Banner` under the title. It shows only when the attempt number is 2 or more.
  Under the XP gem, one line: "Your earlier attempt is saved in your history. Your XP stays."
  The gem shows the XP of the current attempt, with the label "XP in attempt N".
- Confirm dialog. Title: "Start this lesson again?" Text: "Your work on this lesson goes into your
  history." and "You keep your XP. You can earn XP again." Buttons: "Cancel" (iron), "Start again" (gold).
- While the action runs: both buttons are disabled, the label reads "Restarting..." (legacy text).
- Error: a line with `role="alert"`: "We could not start the lesson again. Try again."
- Staff in the student preview mode: the line "Preview: nothing is saved." shows above the card.
  The restart button stays, and the click saves nothing.
- Thai (draft, the owner confirms): "เริ่มเรียนใหม่" (legacy), "กำลังเริ่มใหม่..." (legacy).
  The other new texts have no approved Thai yet: use the English text until the owner gives the Thai.
- Locale keys for S2: `Lesson.Summary.actions.startAgain`, `restarting`, and new `restart.title`,
  `restart.body1`, `restart.body2`, `restart.cancel`, `restart.error`, `attempt`, `attemptXp`,
  `historyNote`, `previewNote`.

## Teacher: lesson plan row
Component: `LessonActions` in `components/teacher/class-book-pacing-controls.tsx` and the row in the
pacing page.
- "Teach again" (iron, restart icon) shows on a lesson that has `taughtAt` or earlier runs or a step done.
- Under the title, the line reads "Taught on 9 Oct" and, when the lesson has 2 or more runs,
  " · Taught 2 times". The singular is "Taught 1 time" (spec check A4).
- A `Run N` chip (amber) shows when the run number is 2 or more. The "Current" chip stays.
- Earlier runs: a `details` element "Earlier runs (N)". Each item: "Run 1 · taught 6 Oct · 13 of 13 steps done".
- Confirm dialog. Title: "Teach lesson N again?" Text: "The class starts lesson N again. The lesson
  becomes the current lesson." / "The work of each student goes into the history. The XP stays." /
  "{count} students have work on this lesson." Buttons: "Cancel" (iron), "Teach again" (gold).
- Locale keys for S3: `teachAgain`, `teachAgainTitle`, `teachAgainBody1`, `teachAgainBody2`,
  `teachAgainStudents`, `taughtTimes`, `runChip`, `earlierRuns`, `earlierRun`.

## Teacher: attempts in the reports
- Grid cell (`.../progress`): the cell keeps the status color and the `done/14` text. A gold dot with
  the attempt count sits on the top right corner when the student has 2 or more attempts. The cell grows
  to 44 px high (was 36 px). The aria label adds "N attempts". The legend gets one sentence.
  The CSV gets the `attempts` column.
- Drill-down (`.../progress/[studentId]`): the lesson card shows a chip "Attempt N (current)". Under the
  step squares, a `details` "Earlier attempts (N)", open by default when N is at least 1. Each item is a
  muted card with: "Attempt 1", "Closed 8 Oct", the reason ("Student started again" or "Teacher taught
  again"), and "14 of 14 steps · 25 min · 120 XP". The newest attempt is first.
- Locale keys for S4: `attemptCurrent`, `earlierAttempts`, `attemptNumber`, `closedOn`,
  `reason.student_restart`, `reason.teacher_teach_again`, `attemptSummary`, `attemptsLabel`.
