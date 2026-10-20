# Design captures (Phase 0)

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/read_along/phase0-design/`
Mock source (scratch, real RPG components, real CSS, demo data): the `read_along-p0` folder in the session scratchpad.
Name pattern: `<state>-<day|night>-<375|1280>.png`. Each state has 4 files.

| State | What it shows |
| --- | --- |
| `idle` | Read-along off. The gold "Listen and read along" button. No player. |
| `ready-top` | The player opens. The hint line shows. The first sentence has the band. |
| `playing` | The band on the sentence, the blue mark on the word, the player. The text scrolled so that the sentence sits in the upper third. |
| `playing-slow` | The same, at 0.75×, early in the text. |
| `paused` | The mark stays on the last word. The play button shows. |
| `tap-hover` | The green hover on a word while another sentence plays. |
| `keyboard-focus` | The outline on one sentence (one tab stop). |
| `no-timings` | A sentence with `words: []`: the band only, no word mark. |

Example: `/home/daniebo/Desktop/primary-parity-progress/captures/read_along/phase0-design/playing-day-375.png`
