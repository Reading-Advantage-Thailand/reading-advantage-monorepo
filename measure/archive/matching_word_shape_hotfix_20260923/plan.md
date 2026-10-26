# Plan: Matching Word Payload Shape Hotfix

Track ID: `matching_word_shape_hotfix_20260923`

## Tasks

- [x] Task 1: Normalize legacy and canonical word payload shapes in `fetchVocabularyMatchingWords` (`components/matching.tsx`); filter rows with empty text or match.
  - Verified: 3 new unit tests plus 3 pre-existing pass (`__test__/matching-states.test.tsx`, jest 6/6). `tsc --noEmit` clean for the file.
- [x] Task 2: Live-verify the Matching tab as `demo-student-b1` on local dev (port 3000). Cards render real words and Thai translations; clicking a correct pair hides both cards. Owner manual verification S5.3 on 2026-09-23.
