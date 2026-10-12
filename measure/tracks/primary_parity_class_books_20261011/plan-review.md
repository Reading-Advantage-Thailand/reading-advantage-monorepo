# Plan review: class books

## Phase D: Design (RPG skin)

Review of `git diff f3bdc71bb..HEAD`: it holds docs and mock text files only. No app code, no
schema, no server code, no locale file changed. No Critical or High finding.

- Low: the mock source and the two harness scripts are `.txt` files in `design/`. The harness
  uses a `node_modules` symlink in the scratch area, so a rerun needs that symlink.
- Low: the captures use the system font. The real page uses Fredoka and Mitr through next/font.
  The look check judges layout and colour; line breaks in Thai can differ.
- Medium (for S3 and S4): the proposed key `lessonTitle` must not clash with the existing object
  `TeacherUi.classBook.lesson`. Use a new key name. Each new key goes in all five locale files.
- Medium (for S5): the dashboard row for a class with no book links to
  `/teacher/class-roster/<id>#class-book`. The anchor needs `scroll-mt` under the sticky header.
