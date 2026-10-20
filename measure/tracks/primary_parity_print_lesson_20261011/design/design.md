# Design: Print this lesson

Track: `primary_parity_print_lesson_20261011`. Phase D. Mock source: `mock-source.tsx.txt`.

## Lesson page (teacher)
The page keeps the plain teacher shell (cards, outline buttons). "Print this lesson" is a third outline
button with a printer icon, after "Projector" and "Rehearsal". The three wrap on a phone.
Without print data the button does not show. A muted line says: "The print version of this lesson is not
ready yet." (Thai: "ยังไม่มีฉบับพิมพ์ของบทเรียนนี้")

## Print page
Scene `library`. A `Sign` with the lesson title. One parchment `Panel` (max width 4xl) holds:
the quest-giver NPC with a `Bubble` ("Hold on..." while loading, "Ready!" when ready), the preview
frame, one hint line, then the buttons. Buttons: gold `RpgButton` "Print" (the one primary action;
disabled with the text "Loading the pictures..." until the frame load and the picture decode end),
iron `RpgLink` "Back to the lesson". All 48 px or more. The frame has a dark mat and shows A4 pages.
On a phone the pages scale to the frame width (CSS `zoom` or a transform; no sideways scroll).
Hint: "Choose A4 paper. Turn off "Headers and footers" in the print window."

## Not ready
If the lesson has no print data, the print page shows the bubble "Not yet!", the alert heading "The
print version is not ready", the text "This lesson has no print version yet. Use the projector or the
lesson guide.", and the iron "Back to the lesson" button. No Print button.

## Proposed English and Thai text (keys in S4 under `TeacherUi.classBook.lesson`)
| Key | English | Thai |
| --- | --- | --- |
| `print` | Print this lesson | พิมพ์บทเรียนนี้ |
| `printNow` | Print | พิมพ์ |
| `printLoading` | Loading the pictures... | กำลังโหลดรูปภาพ... |
| `printNotReady` | The print version of this lesson is not ready yet. | ยังไม่มีฉบับพิมพ์ของบทเรียนนี้ |
| (page) back | Back to the lesson | กลับไปที่บทเรียน |

Phase S4 adds the other keys (hint, not-ready heading and body, back, bubbles) in five locales.
The preview frame in the captures is a neutral placeholder; the real frame shows the Workbooks template.
