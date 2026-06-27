# Line Review Evidence: primary-advantage-072

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-072
Files assigned: 1
Lines assigned: 3712

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/data/audios/articles/temp.mp3` | 1-3712 | reviewed | 2 |

## Findings

### LR-primary-advantage-072-001 — Committed temp.mp3 binary artifact in data/audios/

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/audios/articles/temp.mp3`
- Evidence: The file is a binary MPEG ADTS Layer III v2 audio file (32 kbps, 24 kHz, Mono), 505,440 bytes. The filename `temp.mp3` strongly suggests this is a development/testing artifact that was committed to the repository rather than a production audio asset. The `data/audios/` directory contains three subdirectories (`articles/`, `sentences/`, `words/`), each containing only a single `temp.mp3` file, all dated Oct 6 2025 with identical 3712-inventory-line-count entries. The tail of the file is padded with `0xaa` bytes, consistent with test/placeholder audio data. Binary audio artifacts should be stored in object storage (S3/R2), not committed to the git repository.
- Impact: Bloats the git repository with 505 KB of binary data that cannot be meaningfully reviewed line-by-line. The `temp.mp3` naming indicates these are not curated educational audio assets — they appear to be test fixtures or placeholder audio for TTS/audio feature development. Having identical placeholder files in all three audio directories suggests a test harness pattern rather than real content.
- Recommendation: Remove `data/audios/**/temp.mp3` from the repository. Move real audio assets to S3-compatible storage via the `@reading-advantage/storage` adapter. If these are test fixtures needed for CI, document them as such and use `.gitignore` or a test-data download script.

### LR-primary-advantage-072-002 — Binary file included in line-review inventory with inaccurate line count

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/audios/articles/temp.mp3`
- Evidence: The file-inventory.tsv records `line_count=3712` for this binary MP3 file. `wc -l` on the same file reports 2162 lines (counting `0x0a` bytes in binary data). Neither count has semantic meaning for a binary audio file. The inventory generator counted binary byte-boundary newlines as "lines," which produces an unreliable metric. The batch manifest also carries `line_count: 3712`. This is a data-quality issue in the inventory toolchain, not a code defect.
- Impact: The coverage TSV must record `reviewed_ranges=1-3712` per protocol (matching the inventory source of truth), but these "lines" are meaningless binary data boundaries. No meaningful line-by-line code review is possible for binary files. This pattern likely affects the two sibling `temp.mp3` files in other batches as well.
- Recommendation: The inventory generator should classify binary files (by extension or magic bytes) as non-reviewable and either exclude them from line-count-based batches or flag them with `line_count_type=binary`. For the coverage record, this file is reviewed as binary metadata — no source code exists to review.

## No-Finding Notes

- `apps/primary-advantage/data/audios/articles/temp.mp3`: binary MPEG Layer III audio file reviewed at the metadata/structure level; no source code present. Header bytes (`ff f3 44 c4`) confirm valid MPEG ADTS sync word. File is 505,440 bytes, mono, 32 kbps, 24 kHz. Tail padding with `0xaa` bytes is consistent with test data. No code-level findings possible in binary audio.
