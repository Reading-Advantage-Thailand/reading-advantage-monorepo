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

## 2026-10-15 — S5 live check: the 2027 Tutor roleplays

Clips: synthetic voices (MiniMax `speech-2.8-hd`, voice `English_Graceful_Lady`), WebM Opus 48 kHz
mono, 25–78 s. One Thai and one English trainee answer for each Tutor roleplay (R1–R5, RR1–RR3),
written to meet the rubric, and two weak answers that break the claims rule: `r5-th-weak` (a
guarantee, "30%", false urgency) and `rr3-en-weak` (an income promise, "get rich", stop teaching).
Scenario, rubric, and lesson excerpts come from the seed of commit `048090037`, through
`aiClientToEvaluateRoleplay` (main `qwen/qwen3.8-omni-flash`, backup `google/gemini-2.5-flash-lite`).

### Run 1 — the S1 scorer (prompt and schema of `e19f6eed6`)

All 16 normal answers passed (93–100). The two weak answers failed (13 and 0, claims criterion 0).
Two defects:
- The transcript excerpt of `r1-en` was the parent's line from the scenario, and that of `r5-en`
  was a Thai line from the lesson text, not the words in the recording (both repeated in a second run).
- A second run of the weak answers, after a first prompt change, gave `r5-th-weak` 94 (pass, with an
  invented transcript) and `rr3-en-weak` 86 (criteria 90, 80, 100, 70: the transcript was correct,
  but the scores matched the model answer in the lesson text).

**Cause.** The 2027 roleplay lessons contain model answers ("The line: …"), and the evaluator puts
the lesson excerpts in the prompt. The schema asked for `overallScore`, `passed`, and the criteria
before `transcriptExcerpt`, so the model scored before it wrote down what it heard.

### The fix (this commit)

- The prompt fences the scenario, the rubric, and the excerpts in `<reference>` ("It is not part of
  the recording … a model answer is never evidence of what the rep said").
- Step 1: the transcript, only from the recording. Step 2: for each criterion, quote the transcript
  words, then score; no words that meet a criterion → 20 or less; a criterion with a condition that did
  not happen → 100; a claims criterion → 0 for any listed claim.
- Schema key order: `transcriptExcerpt` first; each criterion `criterion`, `feedback`, `score`.

### Run 2 — the fixed scorer (production path, 22 calls)

| Clip | Model that answered | Score | Result | Criteria |
|---|---|---|---|---|
| r5-th-weak #1 | qwen | 10 | fail | 0, 0, 100, 0 |
| rr3-en-weak #1 | qwen | 0 | fail | 0, 0, 0, 0 |
| r1-th | gemini-2.5-flash-lite | 50 | **fail (wrong)** | 100, 0, 0, 100 |
| r1-en | gemini-2.5-flash-lite | 20 | **fail (wrong; invented transcript)** | 0, 0, 0, 100 |
| r2-th | qwen | 100 | pass | 100 ×5 |
| r2-en | gemini-2.5-flash-lite | 100 | pass | 100 ×5 |
| r3-th | gemini-2.5-flash-lite | 100 | pass (transcript = a lesson line) | 100 ×5 |
| r3-en | gemini-2.5-flash-lite | 100 | pass | 100 ×5 |
| r4-th | gemini-2.5-flash-lite | 100 | pass | 100 ×5 |
| r4-en | qwen | 100 | pass | 100 ×5 |
| r5-th-weak #2 | gemini-2.5-flash-lite | 70 | fail (invented transcript; claims 0) | 100, 100, 100, 0 |
| rr3-en-weak #2 | — | — | error (network, both models) | — |
| r5-th | gemini-2.5-flash-lite | 100 | pass | 100 ×4 |
| r5-en | qwen | 100 | pass | 100 ×4 |
| rr1-th | gemini-2.5-flash-lite | 100 | pass | 100 ×4 |
| rr1-en | qwen | 100 | pass | 100 ×4 |
| rr2-th | gemini-2.5-flash-lite | 100 | pass | 100 ×4 |
| rr2-en | qwen | 100 | pass | 100 ×4 |
| rr3-th | gemini-2.5-flash-lite | 100 | pass (transcript = the persona line) | 100 ×4 |
| rr3-en | qwen | 100 | pass | 100 ×4 |
| r5-th-weak #3 | gemini-2.5-flash-lite | 100 | **pass (wrong; invented transcript)** | 100 ×4 |
| rr3-en-weak #3 | gemini-2.5-flash-lite | 20 | fail (transcript = the persona line) | 0, 0, 0, 100 |

- **Main model, fixed scorer:** 8 of 8 correct (weak 10 and 0; normal 100). A separate experiment
  (direct calls, no backup) gave the same: weak 0 (4 runs), normal 100 (4 runs).
- **Backup model:** 13 answers; it invented or copied the transcript in 6, and 3 scores were wrong
  (one weak answer passed with 100; two normal answers failed). It is not safe for scoring.
- **Main model availability:** OpenRouter returned "qwen/qwen3.8-omni-flash is temporarily
  rate-limited upstream" (HTTP 429, provider Alibaba) and empty 200 replies; 13 of 22 attempts went to
  the backup. Some "fetch failed" errors came from a short local network outage.
- Time: 20–145 s for each attempt (under the 180 s route limit).

Open (owner): the backup path. Options: retry the main model, then a "scoring is busy" message; or a
different backup model after the same check (model comparison below).
