# Line Review Evidence: primary-advantage-074

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-074
Files assigned: 1
Lines assigned: 3712

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/data/audios/words/temp.mp3 | 1-3712 | reviewed | 2 |

## Review method

`temp.mp3` is a binary asset, not a text source file. The inventory `line_count` of 3712
is a byte-stream artifact of the line-counting tool, not human-readable source lines (raw
0x0A byte count is 2162; total size is 505440 bytes). Per the protocol, `file-inventory.tsv`
is the source of truth, so coverage is recorded as `1-3712` to match the assigned line_count.

The file was reviewed in full by:
- Identifying the container/codec: `file(1)` reports `MPEG ADTS, layer III, v2, 32 kbps, 24 kHz, Monaural` — a valid, well-formed MP3 frame stream with no embedded text payload, scripts, or executable content.
- Hashing the byte content (md5 `7b17381d5e3745f0d638a259f82f608a`).
- Cross-referencing the byte-identical duplicates and the code paths that produce/consume audio in this directory.

## Findings

### LR-primary-advantage-074-001 — Scratch binary `temp.mp3` committed to the repository and unreferenced by code

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/audios/words/temp.mp3:1-3712`
- Evidence: A 505,440-byte binary MP3 named `temp.mp3` is committed to source control under `data/audios/words/`. It is a scratch/temporary artifact name. No source file references `temp.mp3` (grep across `apps/primary-advantage` `*.ts`/`*.tsx`/`*.js` returns zero matches). The audio generators (`apps/primary-advantage/server/utils/genaretors/audio-word-generator.ts:133-143`, `audio-flashcard-generator.ts:129-194`) write per-article files named `${articleId}.mp3`, upload them to the bucket, then `fs.unlinkSync` the local copy — they never read or write `temp.mp3`. Reading Advantage carries the same committed scratch artifact at `apps/reading-advantage/data/audios/temp.mp3` and `apps/reading-advantage/data/audios-words/temp.mp3`, so the practice was inherited from the upstream fork rather than introduced as a Primary-specific regression. The path `data/audios/` is not covered by `apps/primary-advantage/.gitignore` (no audio/mp3/data exclusion present).
- Impact: Dead binary weight in the repository (~0.5 MB per copy) that serves no runtime purpose, bloats clones/checkouts, and obscures which audio assets are real. The generic `temp.mp3` name is misleading and the lack of a gitignore rule for generated audio means future generator runs that happen to land in `data/audios/` could be committed accidentally.
- Recommendation: In a separate remediation track (no source edits in this review track), remove the committed `temp.mp3` scratch files from all three directories and add an ignore rule for generated audio output under `data/audios/**` to `apps/primary-advantage/.gitignore`. Coordinate with the same cleanup in Reading Advantage since the root cause is shared.

### LR-primary-advantage-074-002 — Byte-identical duplicate asset across three audio directories

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/audios/words/temp.mp3:1-3712`
- Evidence: The assigned `data/audios/words/temp.mp3` is byte-identical (md5 `7b17381d5e3745f0d638a259f82f608a`) to `apps/primary-advantage/data/audios/sentences/temp.mp3` and `apps/primary-advantage/data/audios/articles/temp.mp3` (all three confirmed via `md5sum`). The three runtime audio kinds (words, sentences, articles) each carry the same placeholder content, indicating the committed file is a single scratch artifact copied across directories rather than representative per-kind audio. Reading Advantage exhibits the same duplication pattern (`data/audios/temp.mp3`, `data/audios-words/temp.mp3`).
- Impact: Redundant binary storage and a misleading impression that each directory holds distinct audio. Confirms the file is non-meaningful placeholder data, reinforcing finding 001.
- Recommendation: Remove all three duplicates together in the remediation track referenced in finding 001; treat as a single repo-hygiene cleanup rather than per-directory fixes.

## No-Finding Notes

- None. The single assigned file produced findings as documented above.
