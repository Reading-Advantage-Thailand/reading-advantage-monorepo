# Roleplay scoring check — sales_training_2027_20261015

## 2026-10-15 — model choice (before the S1 code)

Synthetic voice clips (MiniMax speech, Thai and English, about 30–68 s each): a strong and a
weak tutor-to-parent sales talk in each language. Test rubric: 4 criteria, weight 0.25 each,
passing score 70 each. Calls went through the chat request format with MP3, 1 run for each clip.
Scores use the S1 rule (weighted mean; a pass needs each criterion at its passing score).

| Model | Thai strong | Thai weak | English strong | English weak | Cost for each score | Time |
|---|---|---|---|---|---|---|
| `qwen/qwen3.8-omni-flash` | 88 pass | 5 fail | 90 pass | 6 fail | $0.0015–0.0029 | 39–79 s |
| `google/gemini-2.5-flash-lite` | 90 pass | 63 fail | 92 pass | 63 fail | ≤ $0.0010 | 11–16 s |
| `xiaomi/mimo-v2.6-flash` | 95 pass | 45 fail | 98 pass | 0 fail | $0.0003 | 21–32 s |

Other findings:

- The production path rejected every clip (`'file part media type audio/webm' functionality not supported`).
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` returned 502 capacity errors, and once said "the audio recording was not provided".
- `nvidia/parakeet-tdt-0.6b-v3` works only on `/api/v1/audio/transcriptions`; there it changed Thai into Latin-letter nonsense. English was correct.
- WebM sent directly as `input_audio` (`format: "webm"`): Qwen and Gemini 2.5 Flash Lite transcribed it; MiMo did not hear it.
- MiMo missed the Thai guarantee ("รับประกันค่ะ"); Gemini 2.5 Flash Lite gave 90 for "recommended the right book" when no book was recommended.

**Decision (owner, 2026-10-15):** main `qwen/qwen3.8-omni-flash`, backup `google/gemini-2.5-flash-lite`.

## 2026-10-15 — S1 code path (commit `57c500e`)

The same 4 clips as WebM (`audio/webm`, Opus, 48 kHz mono) through
`OpenRouterProvider` and `aiClientToEvaluateRoleplay` from this branch, with the main and
backup models above.

| Clip | Score | Result | Criteria | Time | Transcript excerpt starts |
|---|---|---|---|---|---|
| Thai strong | 95 | pass | 95, 90, 100, 95 | 51 s | สวัสดีค่ะคุณแม่ ขอบคุณที่ให้น้องมินลองทำแบบทดสอบ… |
| Thai weak | 8 | fail | 0, 10, 0, 20 | 40 s | สวัสดีค่ะ คอร์สของเราดีที่สุดในประเทศไทยเลยค่ะ… |
| English strong | 93 | pass | 95, 90, 100, 85 | 81 s | Hello, Khun Malee. Thank you for letting Min try… |
| English weak | 19 | fail | 0, 0, 0, 75 | 59 s | Hello, our course is the best in Thailand… |

Limit: synthetic voices, 1 run for each clip. The owner's real browser recording on the
candidate (Phase S1 manual verification) is still necessary.
